// @ts-nocheck
import { Router } from 'express';
import db from '../db.js';
import { randomUUID } from 'crypto';
import { MpesaCallbackUrlService } from '../services/mpesaUrls.js';
import { generateSecurityCredential } from '../utils/crypto.js';

const router = Router();
// Helper to get OAuth Token
// In-memory OAuth token cache (valid for 50 mins) to prevent repetitive slow calls to Safaricom
interface TokenCacheItem {
  token: string;
  expiresAt: number;
}
const tokenCache = new Map<string, TokenCacheItem>();

async function getOAuthToken(consumerKey: string, consumerSecret: string, environment: string) {
  const cacheKey = `${environment}_${consumerKey}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  const isProduction = environment?.toLowerCase() === 'production' || environment?.toLowerCase() === 'live';
  const url = isProduction 
    ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
    
  const key = (consumerKey || '').trim();
  const secret = (consumerSecret || '').trim();
  const auth = Buffer.from(`${key}:${secret}`).toString('base64');
  
  const response = await fetch(url, {
    headers: { 'Authorization': `Basic ${auth}` }
  });
  
  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[M-Pesa OAuth] Failed to fetch OAuth token (${response.status} ${response.statusText}):`, errorBody);
    throw new Error(`Failed to fetch OAuth token (${response.status}): ${errorBody}`);
  }
  const data: any = await response.json();
  const expiresInMs = (parseInt(data.expires_in, 10) || 3599) * 1000;
  // Cache for up to 50 minutes (safety margin before 60 min token expiration)
  tokenCache.set(cacheKey, {
    token: data.access_token,
    expiresAt: Date.now() + Math.min(expiresInMs - 60000, 3000000)
  });
  return data.access_token;
}

// In-memory deduplication cache for in-flight STK Pushes (15s TTL)
const stkPushLocks = new Map<string, { timestamp: number; resultPromise: Promise<any> }>();

// In-memory phone-to-customer-name cache for sub-millisecond name resolution
export const phoneToCustomerNameCache = new Map<string, string>();

export function getLogTimestamp(): string {
  const d = new Date();
  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

export function formatMpesaCustomerName(rawName?: string | null): string {
  if (!rawName) return '';
  let cleaned = String(rawName).trim();
  cleaned = cleaned.replace(/^[\d+*\s-]+/, '').trim();
  cleaned = cleaned.replace(/[*#_]/g, ' ').replace(/\s+/g, ' ').trim();

  const lower = cleaned.toLowerCase();
  if (!cleaned || lower === 'mpesa customer' || lower === 'm-pesa customer' || lower === 'customer' || lower === 'unknown') {
    return '';
  }

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';

  const titleWords = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  if (titleWords.length >= 3) {
    return `${titleWords[0]} ${titleWords[titleWords.length - 1]}`;
  }
  return titleWords.join(' ');
}

export async function resolveCustomerNameForPhone(businessId: string, phone: string): Promise<string> {
  if (!phone) return 'M-Pesa Customer';
  const cleanPhone = String(phone).replace(/\D/g, '');
  const phoneSuffix = cleanPhone.slice(-9);
  if (!phoneSuffix) return 'M-Pesa Customer';

  const cached = phoneToCustomerNameCache.get(phoneSuffix);
  if (cached) return cached;

  try {
    const cust = await db.selectFrom('Customer').selectAll().where('businessId', '=', businessId).where('phone', 'like', `%${phoneSuffix}`).executeTakeFirst();
    if (cust?.name) {
      const formatted = formatMpesaCustomerName(cust.name);
      if (formatted) {
        phoneToCustomerNameCache.set(phoneSuffix, formatted);
        return formatted;
      }
    }

    const pastTxn = await db.selectFrom('MpesaTransaction').selectAll().where('businessId', '=', businessId).where('phoneNumber', 'like', `%${phoneSuffix}`).where('customerName', 'not in', ['M-Pesa Customer', 'Customer', 'Unknown', '']).orderBy('timestamp', 'desc').executeTakeFirst();
    if (pastTxn?.customerName) {
      const formatted = formatMpesaCustomerName(pastTxn.customerName);
      if (formatted) {
        phoneToCustomerNameCache.set(phoneSuffix, formatted);
        return formatted;
      }
    }

    const pastReceipt = await db.selectFrom('Receipt').selectAll().where('businessId', '=', businessId).where('customerPhone', 'like', `%${phoneSuffix}`).orderBy('createdAt', 'desc').executeTakeFirst();
    if (pastReceipt && (pastReceipt as any).cashierName) {
      // Checked
    }

    const staff = await db.selectFrom('User').selectAll().where('businessId', '=', businessId).where('email', 'like', `%${phoneSuffix}%`).executeTakeFirst();
    if (staff?.name) {
      const formatted = formatMpesaCustomerName(staff.name);
      if (formatted) {
        phoneToCustomerNameCache.set(phoneSuffix, formatted);
        return formatted;
      }
    }
  } catch (err) {}

  return 'M-Pesa Customer';
}

function getTimestamp() {
  const now = new Date();
  return now.getFullYear().toString() + 
    (now.getMonth() + 1).toString().padStart(2, '0') + 
    now.getDate().toString().padStart(2, '0') + 
    now.getHours().toString().padStart(2, '0') + 
    now.getMinutes().toString().padStart(2, '0') + 
    now.getSeconds().toString().padStart(2, '0');
}

// Safaricom timestamps are strictly Kenya Time (UTC+3, East Africa Time)
export function parseMpesaTimestamp(rawTime: any): Date {
  if (!rawTime) return new Date();
  const tt = String(rawTime).replace(/\D/g, '');
  if (tt.length >= 14) {
    const yr = tt.substring(0, 4);
    const mo = tt.substring(4, 6);
    const dy = tt.substring(6, 8);
    const hr = tt.substring(8, 10);
    const mn = tt.substring(10, 12);
    const sc = tt.substring(12, 14);
    const d = new Date(`${yr}-${mo}-${dy}T${hr}:${mn}:${sc}+03:00`);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

export function isMaskedOrHashedPhone(phone: any): boolean {
  if (!phone) return true;
  const s = String(phone).trim();
  return s.length < 9 || s.length >= 32 || /^[a-f0-9]{32,}$/i.test(s) || s.includes('*');
}

// In-memory deduplication cache with 45s TTL to prevent duplicate status checks
const statusQueryLocks = new Map<string, number>();

function isStatusCheckLocked(receipt: string): boolean {
  const now = Date.now();
  const expiresAt = statusQueryLocks.get(receipt);
  if (expiresAt && expiresAt > now) return true;
  statusQueryLocks.set(receipt, now + 45000);
  return false;
}

async function triggerTransactionStatus(config: any, receipt: string, businessId: string) {
    if (!config.initiatorName || !config.initiatorPassword) return;
    if (!receipt || isStatusCheckLocked(receipt)) {
      console.log(`[Local M-Pesa] Deduplicating transaction status query for ${receipt}`);
      return;
    }
    try {
      const token = await getOAuthToken(config.consumerKey, config.consumerSecret, config.environment);
      const securityCredential = await generateSecurityCredential(config.initiatorPassword, config.certificateBase64);
      
      const tsUrl = config.environment === 'production'
        ? 'https://api.safaricom.co.ke/mpesa/transactionstatus/v1/query'
        : 'https://sandbox.safaricom.co.ke/mpesa/transactionstatus/v1/query';

      const baseDomain = config.environment === 'sandbox' ? (process.env.VITE_API_BASE_URL || 'https://backoffice.whizpoint.app') : (process.env.CLOUD_API_URL || 'https://backoffice.whizpoint.app');
      
      const payload = {
        Initiator: config.initiatorName,
        SecurityCredential: securityCredential,
        CommandID: "TransactionStatusQuery",
        TransactionID: receipt,
        PartyA: config.shortcode,
        IdentifierType: "4",
        ResultURL: `${baseDomain}/api/callbacks/payments/callback/transaction-status/${businessId}`,
        QueueTimeOutURL: `${baseDomain}/api/callbacks/payments/callback/transaction-status/${businessId}`,
        Remarks: "Status Check",
        Occasion: "Status"
      };

      console.log(`[M-Pesa Webhook] Requesting Transaction Status for ${receipt}`);
      
      fetch(tsUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      .then(async res => {
        const text = await res.text();
        console.log(`[M-Pesa Webhook] Transaction status response for ${receipt}:`, res.status, text);
      })
      .catch(err => console.error(`[M-Pesa Webhook] Failed to query transaction status for ${receipt}:`, err));
    } catch (err) {
      console.error(`[M-Pesa Webhook] Setup failed for transaction status query ${receipt}:`, err);
    }
  }

// 1. STK Push Request
router.post('/stkpush', async (req: any, res: any) => {
  const reqStartTime = Date.now();
  const reqTimestamp = getLogTimestamp();
  try {
    const { phone, amount, businessId, locationId } = req.body;
    console.log(`[${reqTimestamp}] [Backend STK Push] 📥 Received request for ${phone}, Amount: ${amount}, Business: ${businessId}, Location: ${locationId || 'default'}`);
    
    if (!phone || !amount || !businessId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Deduplication guard: if an identical STK push was initiated in the last 15 seconds, return the same result
    const lockKey = `${businessId}_${phone}_${Math.round(amount)}`;
    const existingLock = stkPushLocks.get(lockKey);
    if (existingLock && (Date.now() - existingLock.timestamp) < 15000) {
      console.log(`[${getLogTimestamp()}] [Backend STK Push] ⚠️ Deduplicating duplicate STK push for ${phone} (KES ${amount}) - request already in progress.`);
      try {
        const result = await existingLock.resultPromise;
        return res.json(result);
      } catch (err: any) {
        return res.status(400).json({ success: false, message: err.message });
      }
    }

    let config = null;
    if (locationId) {
      config = await db.selectFrom('MpesaConfig').selectAll().where('businessId', '=', businessId).where('locationId', '=', locationId).executeTakeFirst();
    }
    if (!config) {
      config = await db.selectFrom('MpesaConfig').selectAll().where('businessId', '=', businessId).executeTakeFirst();
    }
    if (!config) {
      console.error(`[${getLogTimestamp()}] [Backend STK Push] Error: M-Pesa not configured for business ${businessId}`);
      return res.status(400).json({ error: 'M-Pesa not configured for this business' });
    }
    if (!config.stkEnabled) {
      console.error(`[${getLogTimestamp()}] [Backend STK Push] Error: STK Push is disabled for business ${businessId}`);
      return res.status(400).json({ error: 'STK Push is disabled for this business' });
    }

    const tokenStartTime = Date.now();
    const token = await getOAuthToken(config.consumerKey, config.consumerSecret, config.environment);
    const tokenDuration = Date.now() - tokenStartTime;
    const timestamp = getTimestamp();
    const password = Buffer.from(`${config.shortcode}${config.passkey}${timestamp}`).toString('base64');
    
    const url = config.environment === 'production'
      ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
      : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

    // Dynamic Transaction Type based on merchantType
    const transactionType = config.merchantType === 'BUY_GOODS' ? 'CustomerBuyGoodsOnline' : 'CustomerPayBillOnline';
    const accountRef = config.merchantType === 'PAYBILL' && config.accountReference ? config.accountReference : `INV-${Date.now().toString().slice(-5)}`;

    const payload = {
      BusinessShortCode: config.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: transactionType,
      Amount: Math.round(amount),
      PartyA: phone,
      PartyB: config.merchantType === 'BUY_GOODS' ? (config.tillNumber || config.shortcode) : (config.paybillNumber || config.shortcode),
      PhoneNumber: phone,
      CallBackURL: MpesaCallbackUrlService.getStkCallbackUrl(businessId),
      AccountReference: accountRef,
      TransactionDesc: "Payment"
    };

    const elapsedBeforeSend = Date.now() - reqStartTime;
    console.log(`[${getLogTimestamp()}] [+?${elapsedBeforeSend}ms] [Daraja Request] 📤 Sending STK Push to ${url} (Auth token ready in ${tokenDuration}ms) with payload:`, JSON.stringify({ ...payload, Password: '***' }));

    const pushPromise = (async () => {
      const fetchStartTime = Date.now();
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const darajaLatency = Date.now() - fetchStartTime;
      const totalElapsed = Date.now() - reqStartTime;
      const d: any = await resp.json();
      console.log(`[${getLogTimestamp()}] [+?${totalElapsed}ms] [Daraja Response] 📲 STK Push Response (Daraja round-trip: ${darajaLatency}ms): `, JSON.stringify(d));
      if (d.ResponseCode === "0") {
        return { success: true, message: 'STK push sent', CheckoutRequestID: d.CheckoutRequestID, elapsedMs: totalElapsed, darajaLatencyMs: darajaLatency, receivedAt: reqTimestamp };
      } else {
        throw new Error(d.errorMessage || 'STK push failed');
      }
    })();

    stkPushLocks.set(lockKey, { timestamp: Date.now(), resultPromise: pushPromise });

    try {
      const data = await pushPromise;
      res.json(data);
    } catch (pushErr: any) {
      stkPushLocks.delete(lockKey);
      res.status(400).json({ success: false, message: pushErr.message });
    }
  } catch (err: any) {
    console.error(`[${getLogTimestamp()}] STK Push error:`, err);
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
});

// 2. Register C2B URL
router.post('/c2b/v1/registerurl', async (req: any, res: any) => {
  try {
    const { businessId, shortcode: customShortcode } = req.body;
    const config = await db.selectFrom('MpesaConfig').selectAll().where('businessId', '=', businessId).executeTakeFirst();
    if (!config) return res.status(400).json({ error: 'Config not found' });

    const token = await getOAuthToken(config.consumerKey, config.consumerSecret, config.environment);
    
    const url = config.environment === 'production'
      ? 'https://api.safaricom.co.ke/mpesa/c2b/v2/registerurl'
      : 'https://sandbox.safaricom.co.ke/mpesa/c2b/v2/registerurl';

    const codeToRegister = customShortcode || (config.merchantType === 'BUY_GOODS' ? (config.tillNumber || config.shortcode) : (config.paybillNumber || config.shortcode));

    const payload = {
      ShortCode: String(codeToRegister).trim(),
      ResponseType: "Completed",
      ConfirmationURL: MpesaCallbackUrlService.getC2bConfirmationUrl(businessId),
      ValidationURL: MpesaCallbackUrlService.getC2bValidationUrl(businessId)
    };

    console.log(`[Local Daraja C2B Register] Registering ShortCode ${payload.ShortCode} with Confirmation=${payload.ConfirmationURL}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data: any = await response.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. STK Push Callback (Webhook)
const handleLocalStkCallback = async (req: any, res: any) => {
  try {
    const businessId = req.params?.businessId;
    const callbackData = req.body?.Body?.stkCallback;
    
    console.log(`[${getLogTimestamp()}] [Local M-Pesa Webhook] 🔔 STK Callback received for business ${businessId}:`, JSON.stringify(req.body, null, 2));
    
    if (callbackData && (callbackData.ResultCode === 0 || callbackData.ResultCode === "0")) {
      const items = callbackData.CallbackMetadata?.Item || [];
      const amount = items.find((i: any) => i.Name === 'Amount')?.Value;
      const receipt = items.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value;
      const phone = items.find((i: any) => i.Name === 'PhoneNumber')?.Value;
      
      const cleanReceipt = String(receipt || '').trim();
      const cleanAmount = parseFloat(String(amount || '0'));
      const cleanPhone = String(phone || '').trim();

      // Verify business config exists
      const config = businessId ? await db.selectFrom('MpesaConfig').selectAll().where('businessId', '=', businessId).executeTakeFirst() : null;
      if (cleanReceipt && (config || businessId)) {
        const resolvedBizId = config?.businessId || businessId;

        // Resolve customer name from cache or DB before emitting
        let resolvedName = await resolveCustomerNameForPhone(resolvedBizId, cleanPhone);
        resolvedName = formatMpesaCustomerName(resolvedName) || 'M-Pesa Customer';

        const existingTx = await db.selectFrom('MpesaTransaction').selectAll().where('transactionId', '=', cleanReceipt).executeTakeFirst();
        if (!existingTx) {
          await db.insertInto('MpesaTransaction').values({
            id: randomUUID(),
            businessId: resolvedBizId,
            locationId: config?.locationId || null,
            transactionId: cleanReceipt,
            amount: cleanAmount,
            phoneNumber: cleanPhone,
            status: 'UNLINKED',
            isEnriched: (config?.initiatorName && config?.initiatorPassword ? 0 : 1) as any,
            customerName: resolvedName,
            timestamp: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }).execute();
        }

        // Broadcast real-time payment to local POS terminals
        const io = req.app.get('io');
        if (io) {
          const payload = {
            transactionId: cleanReceipt,
            amount: cleanAmount,
            phoneNumber: cleanPhone,
            customerName: resolvedName,
            isEnriched: true,
            businessId: resolvedBizId
          };
          io.to(`business_${resolvedBizId}`).emit('mpesa_payment_received', payload);
          io.emit('mpesa_payment_received', payload);
          console.log(`[${getLogTimestamp()}] [Local M-Pesa Webhook] ⚡ Socket.IO event emitted for STK Push ${cleanReceipt} (KSh ${cleanAmount}) - Customer: ${resolvedName}`);
        }

        // Fetch Customer Name using Transaction Status API
        if (config?.initiatorName && config?.initiatorPassword) {
          triggerTransactionStatus(config, cleanReceipt, resolvedBizId);
        }
      }
    }
    // Always return success to Safaricom to acknowledge receipt
    res.json({ "ResultCode": 0, "ResultDesc": "Success" });
  } catch (err) {
    console.error('STK Callback error:', err);
    res.json({ "ResultCode": 1, "ResultDesc": "Error processing callback" });
  }
};

router.post('/callback/stk/:businessId', handleLocalStkCallback);
router.post('/callback/stk', handleLocalStkCallback);

// 4. C2B Validation (Webhook)
const handleLocalC2bValidation = async (req: any, res: any) => {
  console.log(`[Local M-Pesa Webhook] C2B Validation received for business ${req.params?.businessId || 'auto'}:`, JSON.stringify(req.body, null, 2));
  try {
    const rawBusinessId = req.params?.businessId;
    const {
      TransID, TransAmount, MSISDN, FirstName, MiddleName, LastName, BusinessShortCode, TransTime
    } = req.body;
    
    let config = null;
    if (BusinessShortCode) {
      const bsc = String(BusinessShortCode).trim();
      config = await db.selectFrom('MpesaConfig')
        .selectAll()
        .where((eb) => eb.or([
          eb('shortcode', '=', bsc),
          eb('tillNumber', '=', bsc),
          eb('paybillNumber', '=', bsc)
        ]))
        .executeTakeFirst();
    }
    if (!config && rawBusinessId) {
      config = await db.selectFrom('MpesaConfig').selectAll().where('businessId', '=', rawBusinessId).executeTakeFirst();
    }

    const resolvedBusinessId = config?.businessId || rawBusinessId;
    const cleanTransId = String(TransID || req.body.transID || '').trim();
    const cleanAmount = parseFloat(TransAmount || req.body.Amount || '0');
    let rawPhone = String(MSISDN || req.body.PhoneNumber || req.body.phone || '').trim();
    if (rawPhone.startsWith('+')) rawPhone = rawPhone.slice(1);

    const customerName = [FirstName, MiddleName, LastName].filter(Boolean).join(' ').trim() || 'M-Pesa Customer';

    const timestamp = parseMpesaTimestamp(TransTime).toISOString();

    if (resolvedBusinessId && cleanTransId && cleanAmount > 0) {
      const existingTx = await db.selectFrom('MpesaTransaction').selectAll().where('transactionId', '=', cleanTransId).executeTakeFirst();
      if (!existingTx) {
        await db.insertInto('MpesaTransaction').values({
          id: randomUUID(),
          businessId: resolvedBusinessId,
          locationId: config?.locationId || null,
          transactionId: cleanTransId,
          amount: cleanAmount,
          phoneNumber: rawPhone,
          status: 'UNLINKED',
          isEnriched: 1,
          customerName,
          timestamp,
          updatedAt: new Date().toISOString()
        }).execute();
      }

      const io = req.app.get('io');
      if (io) {
        const payload = {
          transactionId: cleanTransId,
          amount: cleanAmount,
          phoneNumber: rawPhone,
          customerName,
          isEnriched: true,
          timestamp,
          businessId: resolvedBusinessId
        };
        io.to(`business_${resolvedBusinessId}`).emit('mpesa_payment_received', payload);
        io.emit('mpesa_payment_received', payload);
        console.log(`[Local M-Pesa Webhook] C2B Validation recorded: ${cleanTransId} (${customerName})`);
      }
    }
    
    res.json({ "ResultCode": 0, "ResultDesc": "Accepted" });
  } catch (err) {
    console.error('[Local M-Pesa Webhook] C2B Validation error:', err);
    res.json({ "ResultCode": 0, "ResultDesc": "Accepted" });
  }
};

router.post('/callback/c2b/validation/:businessId', handleLocalC2bValidation);
router.post('/callback/c2b/validation', handleLocalC2bValidation);

// 5. C2B Confirmation Webhook
const handleLocalC2bConfirmation = async (req: any, res: any) => {
  console.log(`[Local M-Pesa Webhook] C2B Confirmation received for business ${req.params?.businessId || 'auto'}:`, JSON.stringify(req.body, null, 2));
  try {
    const rawBusinessId = req.params?.businessId;
    const {
      TransID, TransAmount, MSISDN, FirstName, MiddleName, LastName, BusinessShortCode, TransTime
    } = req.body;
    
    let config = null;
    if (BusinessShortCode) {
      const bsc = String(BusinessShortCode).trim();
      config = await db.selectFrom('MpesaConfig')
        .selectAll()
        .where((eb) => eb.or([
          eb('shortcode', '=', bsc),
          eb('tillNumber', '=', bsc),
          eb('paybillNumber', '=', bsc)
        ]))
        .executeTakeFirst();
    }
    if (!config && rawBusinessId) {
      config = await db.selectFrom('MpesaConfig').selectAll().where('businessId', '=', rawBusinessId).executeTakeFirst();
    }

    const resolvedBusinessId = config?.businessId || rawBusinessId;
    if (!resolvedBusinessId) {
      console.warn(`[Local M-Pesa Webhook] C2B Confirmation could not map business for ShortCode ${BusinessShortCode}`);
      return res.json({ "ResultCode": 0, "ResultDesc": "Success" });
    }

    const cleanTransId = String(TransID || req.body.transID || req.body.ReceiptNo || '').trim();
    const cleanAmount = parseFloat(TransAmount || req.body.Amount || '0');
    let rawPhone = String(MSISDN || req.body.PhoneNumber || req.body.phone || '').trim();
    if (rawPhone.startsWith('+')) rawPhone = rawPhone.slice(1);

    const customerName = [FirstName, MiddleName, LastName].filter(Boolean).join(' ').trim() || req.body.CustomerName || 'M-Pesa Customer';

    const timestamp = parseMpesaTimestamp(TransTime).toISOString();
    
    if (cleanTransId) {
      const existingTx = await db.selectFrom('MpesaTransaction').selectAll().where('transactionId', '=', cleanTransId).executeTakeFirst();
      if (!existingTx) {
        await db.insertInto('MpesaTransaction').values({
          id: randomUUID(),
          businessId: resolvedBusinessId,
          locationId: config?.locationId || null,
          transactionId: cleanTransId,
          amount: cleanAmount,
          phoneNumber: rawPhone,
          status: 'UNLINKED',
          isEnriched: 1,
          customerName,
          timestamp,
          updatedAt: new Date().toISOString()
        }).execute();
      } else {
        await db.updateTable('MpesaTransaction')
          .set({ customerName, phoneNumber: rawPhone || existingTx.phoneNumber, amount: cleanAmount || existingTx.amount, updatedAt: new Date().toISOString() })
          .where('transactionId', '=', cleanTransId)
          .execute();
      }

      const io = req.app.get('io');
      if (io) {
        const payload = {
          transactionId: cleanTransId,
          amount: cleanAmount,
          phoneNumber: rawPhone,
          customerName,
          isEnriched: true,
          timestamp,
          businessId: resolvedBusinessId
        };
        io.to(`business_${resolvedBusinessId}`).emit('mpesa_payment_received', payload);
        io.emit('mpesa_payment_received', payload);
        console.log(`[Local M-Pesa Webhook] C2B Confirmation saved & emitted: ${cleanTransId} for KSh ${cleanAmount} (${customerName})`);
      }

      // Trigger Transaction Status Background Job
      if (config?.initiatorName && config?.initiatorPassword) {
        triggerTransactionStatus(config, cleanTransId, resolvedBusinessId);
      }
    }

    res.json({ "ResultCode": 0, "ResultDesc": "Success" });
  } catch (error) {
    console.error('[Local M-Pesa Webhook] C2B Confirmation error:', error);
    res.json({ "ResultCode": 0, "ResultDesc": "Success" });
  }
};

router.post('/callback/c2b/confirmation/:businessId', handleLocalC2bConfirmation);
router.post('/callback/c2b/confirmation', handleLocalC2bConfirmation);

// 6. Transaction Status Webhook
router.post('/callback/transaction-status/:businessId', async (req: any, res: any) => {
  try {
    const { businessId } = req.params;
    const result = req.body?.Result;
    
    if (result && result.ResultCode === 0 && result.ResultParameters) {
      const params = result.ResultParameters.ResultParameter;
      const receiptNumber = params.find((p: any) => p.Key === 'ReceiptNo')?.Value;
        const rawPartyName = params.find((p: any) => p.Key === 'DebitPartyName')?.Value || params.find((p: any) => p.Key === 'SenderPartyName')?.Value;
        
        if (receiptNumber && rawPartyName) {
          // DebitPartyName usually comes as "254740***168 - JOHN DOE". 
          const nameParts = rawPartyName.split('-');
          const rawPhone = nameParts[0].trim();
          const customerName = nameParts.length > 1 ? nameParts.slice(1).join('-').trim() : rawPartyName;
          
          // Format phone cleanly: preserve real unmasked numbers e.g. 0740841168
          let formattedPhone = rawPhone.replace(/\s+/g, '');
          if (formattedPhone.startsWith('254') && formattedPhone.length === 12) {
              formattedPhone = '0' + formattedPhone.slice(3);
          }
          if (formattedPhone.includes('*')) {
              formattedPhone = formattedPhone.replace(/\*+/g, '***');
          }
          
          await db.updateTable('MpesaTransaction').set({ customerName, phoneNumber: formattedPhone, isEnriched: 1 as any }).where('transactionId', '=', receiptNumber).where('businessId', '=', businessId).execute();

          try {
            await db.updateTable('Receipt')
              .set({ customerPhone: formattedPhone })
              .where('mpesaCode', '=', receiptNumber)
              .where('businessId', '=', businessId)
              .execute();
          } catch (e) {}
          
          console.log(`[Transaction Status] Enriched ${receiptNumber}: Name=${customerName}, Phone=${formattedPhone}`);
        }
    }
    res.json({ "ResultCode": 0, "ResultDesc": "Accepted" });
  } catch (error) {
    console.error('Transaction Status Callback Error:', error);
    res.json({ "ResultCode": 1, "ResultDesc": "Error" });
  }
});

  // 7. Payment Search / Polling for POS
  router.get('/payments/search', async (req: any, res: any) => {
    try {
      const rawBiz = req.query.businessId;
      const businessId = Array.isArray(rawBiz) ? String(rawBiz[0]) : (rawBiz ? String(rawBiz) : '');
      const rawQ = req.query.q;
      const q = Array.isArray(rawQ) ? String(rawQ[0]) : (rawQ ? String(rawQ) : '');
      
      if (!businessId) return res.status(400).json({ error: 'Missing businessId' });

      // Also sync from cloud if reachable
      try {
        const cloudUrl = process.env.CLOUD_API_URL || 'https://backoffice.whizpoint.app';
        const cloudRes = await fetch(`${cloudUrl}/api/mpesa/payments/search?businessId=${businessId}`, {
          signal: AbortSignal.timeout(3000)
        });
        if (cloudRes.ok) {
          const cloudTxns = await cloudRes.json();
          if (Array.isArray(cloudTxns)) {
            for (const ctx of cloudTxns) {
              const existing = await db.selectFrom('MpesaTransaction')
                .selectAll()
                .where('transactionId', '=', ctx.transactionId)
                .executeTakeFirst();
              if (!existing) {
                await db.insertInto('MpesaTransaction').values({
                  id: ctx.id || randomUUID(),
                  businessId,
                  locationId: ctx.locationId || null,
                  transactionId: ctx.transactionId,
                  amount: Number(ctx.amount) || 0,
                  phoneNumber: String(ctx.phoneNumber || ''),
                  customerName: ctx.customerName || null,
                  status: ctx.status || 'UNLINKED',
                  isEnriched: ctx.isEnriched ? 1 : 0,
                  timestamp: ctx.timestamp ? new Date(ctx.timestamp).toISOString() : new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                }).execute();
              } else if (ctx.customerName && (!existing.customerName || ctx.isEnriched)) {
                await db.updateTable('MpesaTransaction').set({
                  customerName: ctx.customerName,
                  phoneNumber: ctx.phoneNumber || existing.phoneNumber,
                  isEnriched: (ctx.isEnriched ? 1 : 0) as any
                }).where('transactionId', '=', ctx.transactionId).execute();
              }
            }
          }
        }
      } catch (cloudErr) {}
      
      const cleanQ = q.trim();
      const digits = cleanQ.replace(/\D/g, '');

      const queryTill = req.query.tillNumber ? String(req.query.tillNumber).trim() : '';
      const queryShortcode = req.query.shortcode ? String(req.query.shortcode).trim() : '';

      // Resolve all business IDs sharing the same shortcode/till
      const myConfig = await db.selectFrom('MpesaConfig').selectAll().where('businessId', '=', businessId).executeTakeFirst();
      const matchingCodes = [myConfig?.shortcode, myConfig?.tillNumber, myConfig?.paybillNumber, queryTill, queryShortcode].filter(Boolean) as string[];
      let businessIds = [businessId];
      if (matchingCodes.length > 0) {
        const sharedConfigs = await db.selectFrom('MpesaConfig')
          .select('businessId')
          .where((eb) => eb.or([
            eb('shortcode', 'in', matchingCodes),
            eb('tillNumber', 'in', matchingCodes),
            eb('paybillNumber', 'in', matchingCodes)
          ]))
          .execute();
        businessIds = Array.from(new Set([businessId, ...sharedConfigs.map(c => c.businessId)]));
      }

      let query = db.selectFrom('MpesaTransaction')
        .selectAll()
        .where('businessId', 'in', businessIds)
        .where('status', '=', 'UNLINKED')
        .orderBy('timestamp', 'desc')
        .limit(50);
      
      if (cleanQ) {
        query = query.where((eb) => {
          const conditions = [
            eb('transactionId', 'like', `%${cleanQ}%`),
            eb('customerName', 'like', `%${cleanQ}%`),
            eb('phoneNumber', 'like', `%${cleanQ}%`)
          ];
          if (digits.length >= 3) {
            conditions.push(eb('phoneNumber', 'like', `%${digits}%`));
          }
          if (digits.length >= 9) {
            conditions.push(eb('phoneNumber', 'like', `%${digits.slice(-9)}%`));
          }
          return eb.or(conditions);
        });
      }
      let txns: any[] = await query.execute();

      // If user searched explicitly and 0 unlinked found, also check claimed transactions
      if (cleanQ && txns.length === 0) {
        let claimedQuery = db.selectFrom('MpesaTransaction')
          .selectAll()
          .where('businessId', 'in', businessIds)
          .orderBy('timestamp', 'desc')
          .limit(10);

        claimedQuery = claimedQuery.where((eb) => {
          const conditions = [
            eb('transactionId', 'like', `%${cleanQ}%`),
            eb('customerName', 'like', `%${cleanQ}%`),
            eb('phoneNumber', 'like', `%${cleanQ}%`)
          ];
          if (digits.length >= 3) {
            conditions.push(eb('phoneNumber', 'like', `%${digits}%`));
          }
          return eb.or(conditions);
        });

        const claimedResults = await claimedQuery.execute();
        if (claimedResults.length > 0) {
          txns = claimedResults.map((t: any) => ({
            ...t,
            isAlreadyClaimed: t.status === 'LINKED'
          }));
        }
      }

      res.json(txns);
    } catch (err) {
      console.error('M-Pesa payment search error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 7b. Business M-Pesa Statement (All Money-In / Till Transactions)
  router.get('/statement', async (req: any, res: any) => {
    try {
      const rawBiz = req.query.businessId;
      const businessId = Array.isArray(rawBiz) ? String(rawBiz[0]) : (rawBiz ? String(rawBiz) : '');
      if (!businessId) return res.status(400).json({ error: 'Missing businessId' });

      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const statusFilter = (req.query.status as string || '').toUpperCase();
      const limit = parseInt(req.query.limit as string) || 1000;

      let query = db.selectFrom('MpesaTransaction')
        .selectAll()
        .where('businessId', '=', businessId)
        .orderBy('timestamp', 'desc')
        .limit(limit);

      if (statusFilter && ['LINKED', 'UNLINKED'].includes(statusFilter)) {
        query = query.where('status', '=', statusFilter);
      }
      if (startDate) {
        query = query.where('timestamp', '>=', new Date(startDate).toISOString());
      }
      if (endDate) {
        query = query.where('timestamp', '<=', new Date(endDate).toISOString());
      }

      const txns = await query.execute();

      // Retrieve linked POS receipts
      const mpesaCodes = txns.map((t: any) => t.transactionId).filter(Boolean);
      let receiptMap = new Map<string, string>();
      if (mpesaCodes.length > 0) {
        try {
          const receipts = await db.selectFrom('Receipt')
            .select(['mpesaCode', 'receiptNumber'])
            .where('businessId', '=', businessId)
            .where('mpesaCode', 'in', mpesaCodes)
            .execute();
          receipts.forEach((r: any) => {
            if (r.mpesaCode) receiptMap.set(r.mpesaCode, r.receiptNumber);
          });
        } catch (e) {}
      }

      const enrichedList = txns.map((t: any) => ({
        ...t,
        posReceiptNumber: receiptMap.get(t.transactionId) || null
      }));

      const totalMoneyIn = enrichedList.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
      const claimedCount = enrichedList.filter((t: any) => t.status === 'LINKED').length;
      const unclaimedCount = enrichedList.filter((t: any) => t.status === 'UNLINKED').length;

      res.json({
        success: true,
        summary: {
          totalTransactions: enrichedList.length,
          totalMoneyIn,
          claimedCount,
          unclaimedCount
        },
        transactions: enrichedList
      });
    } catch (err: any) {
      console.error('Local M-Pesa Statement Error:', err);
      res.status(500).json({ error: 'Failed to fetch statement' });
    }
  });

  // 8. Generate Dynamic QR Code
  router.post('/qrcode', async (req: any, res: any) => {
    try {
      const { businessId, amount, refNo, locationId } = req.body;
      if (!businessId || !amount) return res.status(400).json({ error: 'Missing required fields' });
      
      let config = null;
      if (locationId) {
        config = await db.selectFrom('MpesaConfig').selectAll().where('businessId', '=', businessId).where('locationId', '=', locationId).executeTakeFirst();
      }
      if (!config) {
        config = await db.selectFrom('MpesaConfig').selectAll().where('businessId', '=', businessId).executeTakeFirst();
      }
      if (!config || !config.consumerKey || !config.consumerSecret || !config.shortcode) {
        return res.status(400).json({ error: 'M-Pesa configuration incomplete' });
      }

      const token = await getOAuthToken(config.consumerKey, config.consumerSecret, config.environment);
      const url = config.environment === 'production' 
        ? 'https://api.safaricom.co.ke/mpesa/qrcode/v1/generate' 
        : 'https://sandbox.safaricom.co.ke/mpesa/qrcode/v1/generate';

      const payload = {
        MerchantName: config.merchantType === 'PAYBILL' ? "Paybill Payment" : "Buy Goods Payment",
        RefNo: refNo || "Payment",
        Amount: parseInt(amount),
        TrxCode: config.merchantType === 'PAYBILL' ? 'PB' : 'BG',
        CPI: config.merchantType === 'PAYBILL' ? (config.paybillNumber || config.shortcode) : (config.tillNumber || config.shortcode),
        Size: "300"
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({ error: 'Failed to generate QR Code', details: errText });
      }

      const data = await response.json();
      res.json(data);
    } catch (err) {
      console.error('QR Code Generation Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

// 9. Consume Payment
router.post('/payments/consume', async (req: any, res: any) => {
  try {
    const { transactionId, businessId, receiptNumber, cashier, adminPin } = req.body;
    if (!transactionId) return res.status(400).json({ error: 'Missing parameters' });
    
    const cleanTxnId = String(transactionId).trim();
    const existing = await db.selectFrom('MpesaTransaction')
      .selectAll()
      .where('transactionId', '=', cleanTxnId)
      .executeTakeFirst();

    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    if (existing.status === 'LINKED') {
      if (!adminPin) {
        return res.status(403).json({
          success: false,
          isAlreadyClaimed: true,
          error: 'This payment has already been claimed for another sale. Manager/Admin PIN is required to authorize reuse.'
        });
      }

      const cleanPin = String(adminPin).trim();
      const adminUser = await db.selectFrom('User')
        .selectAll()
        .where('pin', '=', cleanPin)
        .where('role', 'in', ['admin', 'manager', 'ADMIN', 'MANAGER'])
        .executeTakeFirst();

      if (!adminUser) {
        return res.status(401).json({ success: false, error: 'Invalid Manager/Admin PIN. Re-use authorization denied.' });
      }

      console.log(`[Local M-Pesa Audit] Transaction ${cleanTxnId} REUSED by cashier "${cashier || 'Cashier'}", authorized by Admin "${adminUser.name}" at ${new Date().toISOString()}`);

      const io = req.app.get('io');
      if (io) {
        io.emit('mpesa_payment_claimed', {
          transactionId: cleanTxnId,
          reused: true,
          authorizedBy: adminUser.name,
          cashier: cashier || 'Cashier'
        });
      }

      return res.json({
        success: true,
        reused: true,
        authorizedBy: adminUser.name,
        message: 'Payment reuse approved by Admin.'
      });
    }

    await db.updateTable('MpesaTransaction')
      .set({ status: 'LINKED' })
      .where('id', '=', existing.id)
      .execute();

    console.log(`[Local M-Pesa Consume] Payment ${cleanTxnId} permanently LINKED to receipt ${receiptNumber || 'POS'} by ${cashier || 'Cashier'}`);

    const io = req.app.get('io');
    if (io) {
      io.emit('mpesa_payment_claimed', {
        transactionId: cleanTxnId,
        receiptNumber: receiptNumber || 'POS',
        cashier: cashier || 'Cashier'
      });
    }

    res.json({ success: true, message: 'Payment claimed successfully.' });
  } catch (err) {
    console.error('Consume error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 10. Upload Safaricom Certificate (per-business)
// Accepts PEM text or raw base64. Stores in MpesaConfig.certificateBase64
router.post('/certificate', async (req: any, res: any) => {
  try {
    const { businessId, certificatePem } = req.body;
    if (!businessId || !certificatePem) {
      return res.status(400).json({ error: 'Missing businessId or certificatePem' });
    }

    const cleanCert = certificatePem.trim();
    let config = await db.selectFrom('MpesaConfig')
      .selectAll()
      .where('businessId', '=', businessId)
      .executeTakeFirst();

    if (!config) {
      await db.insertInto('MpesaConfig')
        .values({
          id: randomUUID(),
          businessId,
          merchantType: 'PAYBILL',
          environment: 'production',
          certificateBase64: cleanCert
        })
        .execute();
    } else {
      await db.updateTable('MpesaConfig')
        .set({ certificateBase64: cleanCert })
        .where('id', '=', config.id)
        .execute();
    }

    console.log(`[Local M-Pesa] Certificate uploaded for business ${businessId}`);
    res.json({ success: true, message: 'Certificate saved successfully' });
  } catch (err) {
    console.error('Certificate upload error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 11. Get M-Pesa Config (for Settings UI) — excludes sensitive keys
router.get('/config', async (req: any, res: any) => {
  try {
    const businessId = req.query.businessId as string;
    if (!businessId) return res.status(400).json({ error: 'Missing businessId' });

    const config = await db.selectFrom('MpesaConfig')
      .selectAll()
      .where('businessId', '=', businessId)
      .executeTakeFirst();

    if (!config) return res.status(404).json({ error: 'Config not found' });

    const { certificateBase64, consumerKey, consumerSecret, passkey, initiatorPassword, ...safeConfig } = config as any;
    res.json({ ...safeConfig, hasCertificate: Boolean(certificateBase64) });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;



