import prisma, { withDbRetry } from '../db.js';
import { Router } from 'express';
import { MpesaCallbackUrlService } from '../services/mpesaUrls.js';
import { generateSecurityCredential, decrypt } from '../utils/crypto.js';

const router = Router();

// Helper to get OAuth Token
async function getOAuthToken(consumerKey: string, consumerSecret: string, environment: string) {
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
  return data.access_token;
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

// In-memory deduplication cache with 45s TTL to prevent duplicate status checks
const statusQueryLocks = new Map<string, number>();

function isStatusCheckLocked(receipt: string): boolean {
  const now = Date.now();
  const expiresAt = statusQueryLocks.get(receipt);
  if (expiresAt && expiresAt > now) return true;
  statusQueryLocks.set(receipt, now + 45000);
  return false;
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
    // Explicitly set East Africa Time (+03:00) so JS converts to exact local time without shift
    const d = new Date(`${yr}-${mo}-${dy}T${hr}:${mn}:${sc}+03:00`);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

// Detect masked phone numbers or Safaricom 64-character SHA-256 Till hashes
export function isMaskedOrHashedPhone(phone: any): boolean {
  if (!phone) return true;
  const s = String(phone).trim();
  return s.length < 9 || s.length >= 32 || /^[a-f0-9]{32,}$/i.test(s) || s.includes('*');
}

// ==========================================
// IN-MEMORY RESILIENT MPESA CACHE
// Eliminates 500 errors, handles cloud/Turso network drops, and provides sub-millisecond response
// ==========================================
export interface InMemoryMpesaTxn {
  id: string;
  businessId: string;
  transactionId: string;
  amount: number;
  phoneNumber: string;
  customerName: string;
  status: 'UNLINKED' | 'LINKED';
  isEnriched: boolean;
  timestamp: string;
  isAlreadyClaimed?: boolean;
}

export const recentMpesaTxns = new Map<string, InMemoryMpesaTxn>();
export const configCacheByCode = new Map<string, any>();
export const configCacheByBiz = new Map<string, any>();

export function cacheMpesaTransaction(txn: InMemoryMpesaTxn) {
  const existing = recentMpesaTxns.get(txn.transactionId);
  if (existing) {
    if (existing.isEnriched && !txn.isEnriched) {
      txn.customerName = existing.customerName;
      txn.phoneNumber = existing.phoneNumber;
      txn.isEnriched = true;
    }
    if (existing.status === 'LINKED') {
      txn.status = 'LINKED';
      txn.isAlreadyClaimed = true;
    }
  }
  recentMpesaTxns.set(txn.transactionId, txn);
  // Keep last 500 transactions in RAM
  if (recentMpesaTxns.size > 500) {
    const oldestKey = recentMpesaTxns.keys().next().value;
    if (oldestKey) recentMpesaTxns.delete(oldestKey);
  }
}

export function cacheMpesaConfig(config: any) {
  if (!config) return;
  if (config.businessId) configCacheByBiz.set(config.businessId, config);
  if (config.shortcode) configCacheByCode.set(String(config.shortcode).trim(), config);
  if (config.tillNumber) configCacheByCode.set(String(config.tillNumber).trim(), config);
  if (config.paybillNumber) configCacheByCode.set(String(config.paybillNumber).trim(), config);
  if (config.partyB) configCacheByCode.set(String(config.partyB).trim(), config);
}

async function triggerTransactionStatus(config: any, receipt: string, businessId: string) {
    if (!config.initiatorName || !config.initiatorPassword) return;
    if (!receipt || isStatusCheckLocked(receipt)) {
      console.log(`[Transaction Status] Deduplicating query for ${receipt} (already in-flight or queried recently).`);
      return;
    }
    try {
      const token = await getOAuthToken(config.consumerKey, config.consumerSecret, config.environment);
      const plaintextPassword = decrypt(config.initiatorPassword);
      // Pass per-business cert if stored in DB, otherwise falls back to file-level cert
      const securityCredential = await generateSecurityCredential(plaintextPassword, config.certificateBase64 || null);
      
      // Debug: detect if cert failed and fell back to plaintext password
      const credentialLooksEncrypted = securityCredential.length > 50 && securityCredential !== plaintextPassword;
      if (!credentialLooksEncrypted) {
        console.error(`[Transaction Status] ⚠️  SecurityCredential for ${receipt} looks like PLAINTEXT (length=${securityCredential.length}). Check ProductionCertificate.cer — it may be malformed or missing.`);
      } else {
        console.log(`[Transaction Status] SecurityCredential OK for ${receipt}: length=${securityCredential.length}`);
      }
      
      const tsUrl = config.environment === 'production'
        ? 'https://api.safaricom.co.ke/mpesa/transactionstatus/v1/query'
        : 'https://sandbox.safaricom.co.ke/mpesa/transactionstatus/v1/query';

      const baseDomain = config.environment === 'sandbox' ? (process.env.VITE_API_BASE_URL || 'https://api.whizpoint.app') : 'https://api.whizpoint.app';
      
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

      console.log(`[M-Pesa Webhook] Requesting Transaction Status for ${receipt} → ResultURL: ${payload.ResultURL}`);
      
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
  try {
    const { phone, amount, businessId, locationId } = req.body;
    console.log(`[Backend STK Push] Received request for ${phone}, Amount: ${amount}, Business: ${businessId}, Location: ${locationId || 'default'}`);
    
    if (!phone || !amount || !businessId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let config = null;
    if (locationId) {
      config = await prisma.mpesaConfig.findFirst({ where: { businessId, locationId } });
    }
    if (!config) {
      config = await prisma.mpesaConfig.findFirst({ where: { businessId } });
    }
    if (!config) {
      console.error(`[Backend STK Push] Error: M-Pesa not configured for business ${businessId}`);
      return res.status(400).json({ error: 'M-Pesa not configured for this business' });
    }
    if (!config.stkEnabled) {
      console.error(`[Backend STK Push] Error: STK Push is disabled for business ${businessId}`);
      return res.status(400).json({ error: 'STK Push is disabled for this business' });
    }

    const token = await getOAuthToken(config.consumerKey, config.consumerSecret, config.environment);
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

    console.log(`[Daraja Request] Sending STK Push to ${url} with payload:`, JSON.stringify({ ...payload, Password: '***' }));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data: any = await response.json();
    console.log(`[Daraja Response] STK Push Response:`, JSON.stringify(data));
    
    if (data.ResponseCode === "0") {
      res.json({ success: true, message: 'STK push sent', CheckoutRequestID: data.CheckoutRequestID });
    } else {
      res.status(400).json({ success: false, message: data.errorMessage || 'STK push failed', details: data });
    }
  } catch (err: any) {
    console.error('STK Push error:', err);
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
});

// 2. Register C2B URL
router.post('/c2b/v1/registerurl', async (req: any, res: any) => {
  try {
    const { businessId, shortcode: customShortcode } = req.body;
    const config = await prisma.mpesaConfig.findFirst({ where: { businessId } });
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

    console.log(`[Daraja C2B Register] Registering ShortCode ${payload.ShortCode} with Confirmation=${payload.ConfirmationURL}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data: any = await response.json();
    console.log(`[Daraja C2B Register] Response:`, data);
    res.json(data);
  } catch (err: any) {
    console.error('[Daraja C2B Register] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. STK Push Callback (Webhook)
router.post('/callback/stk/:businessId', async (req: any, res: any) => {
  try {
    const { businessId } = req.params;
    const callbackData = req.body?.Body?.stkCallback;
    
    console.log(`[M-Pesa Webhook] STK Callback received for business ${businessId}:`, JSON.stringify(req.body, null, 2));
    
    if (callbackData && (callbackData.ResultCode === 0 || callbackData.ResultCode === "0")) {
      const items = callbackData.CallbackMetadata.Item;
      const amount = items.find((i: any) => i.Name === 'Amount')?.Value;
      const receipt = items.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value;
      const phone = items.find((i: any) => i.Name === 'PhoneNumber')?.Value;
      const txDate = items.find((i: any) => i.Name === 'TransactionDate')?.Value;
      const timestamp = parseMpesaTimestamp(txDate);
      const cleanAmount = parseFloat(amount || '0');
      const cleanPhone = phone ? phone.toString() : '';

      // Check config cache first to avoid blocking on DB
      const cachedConfig = configCacheByBiz.get(businessId);
      const hasInitiator = !!(cachedConfig?.initiatorName && cachedConfig?.initiatorPassword);
      let resolvedName = 'M-Pesa Customer';

      // 1. Immediately store in RAM cache (0ms, survives DB drops)
      if (receipt && cleanAmount > 0) {
        const memoryItem: InMemoryMpesaTxn = {
          id: `mem_${receipt}`,
          businessId,
          transactionId: receipt,
          amount: cleanAmount,
          phoneNumber: cleanPhone,
          customerName: resolvedName,
          status: 'UNLINKED',
          isEnriched: !hasInitiator,
          timestamp: timestamp.toISOString()
        };
        cacheMpesaTransaction(memoryItem);

        // 2. Emit real-time Socket.IO event immediately to all POS terminals
        const io = req.app.get('io');
        if (io) {
          const payload = {
            transactionId: receipt,
            amount: cleanAmount,
            phoneNumber: cleanPhone,
            customerName: resolvedName,
            isEnriched: !hasInitiator,
            timestamp: timestamp.toISOString(),
            businessId
          };
          io.to(`business_${businessId}`).emit('mpesa_payment_received', payload);
          io.emit('mpesa_payment_received', payload);
          console.log(`[M-Pesa Webhook] Socket.IO event emitted for STK Push ${receipt} (KSh ${cleanAmount})`);
        }

        // 3. Background DB persistence & customer name enrichment (fire-and-forget)
        (async () => {
          try {
            const config = cachedConfig || await prisma.mpesaConfig.findFirst({ where: { businessId } });
            if (config) cacheMpesaConfig(config);

            const phoneSuffix = cleanPhone.slice(-9);
            try {
              const knownCustomer = await prisma.customer.findFirst({
                where: { businessId, phone: { contains: phoneSuffix } }
              });
              if (knownCustomer && knownCustomer.name) {
                resolvedName = knownCustomer.name;
              } else {
                const pastTxn = await prisma.mpesaTransaction.findFirst({
                  where: { businessId, phoneNumber: { contains: phoneSuffix }, customerName: { not: null } }
                });
                if (pastTxn && pastTxn.customerName && pastTxn.customerName !== 'Customer' && pastTxn.customerName !== 'Unknown') {
                  resolvedName = pastTxn.customerName;
                }
              }
            } catch (e) {}

            await prisma.mpesaTransaction.upsert({
              where: { transactionId: receipt },
              create: {
                businessId,
                transactionId: receipt,
                amount: cleanAmount,
                phoneNumber: cleanPhone,
                customerName: resolvedName,
                status: 'UNLINKED',
                isEnriched: !hasInitiator,
                timestamp
              },
              update: {
                customerName: resolvedName !== 'M-Pesa Customer' ? resolvedName : undefined,
                phoneNumber: cleanPhone
              }
            });

            if (config?.initiatorName && config?.initiatorPassword) {
              triggerTransactionStatus(config, receipt, businessId);
            }
          } catch (dbErr) {
            console.warn(`[M-Pesa Webhook] STK DB persistence deferred (offline/error) for ${receipt}:`, dbErr);
          }
        })().catch(e => console.error('[M-Pesa Webhook] STK background error:', e));
      }
    } else if (callbackData) {
      console.log(`[M-Pesa Webhook] STK Push failed for business ${businessId}: ResultCode=${callbackData.ResultCode}, Desc=${callbackData.ResultDesc}`);
    }
    // Always return success to Safaricom to acknowledge receipt
    res.json({ "ResultCode": 0, "ResultDesc": "Success" });
  } catch (err) {
    console.error('STK Callback error:', err);
    res.json({ "ResultCode": 0, "ResultDesc": "Success" });
  }
});

// 4. C2B Validation (Webhook)
const handleC2bValidation = async (req: any, res: any) => {
  console.log(`[M-Pesa Webhook] C2B Validation received for business ${req.params?.businessId || 'auto'}:`, JSON.stringify(req.body, null, 2));
  try {
    const rawBusinessId = req.params?.businessId;
    const {
      TransID, TransAmount, MSISDN, FirstName, MiddleName, LastName, BusinessShortCode, TransTime
    } = req.body;
    
    const bsc = String(BusinessShortCode || '').trim();
    const cleanTransId = String(TransID || req.body.transID || '').trim();
    const cleanAmount = parseFloat(TransAmount || req.body.Amount || '0');
    let rawPhone = String(MSISDN || req.body.PhoneNumber || req.body.phone || '').trim();
    if (rawPhone.startsWith('+')) rawPhone = rawPhone.slice(1);

    const customerName = [FirstName, MiddleName, LastName].filter(Boolean).join(' ').trim() || 'M-Pesa Customer';
    const isEnriched = customerName !== 'M-Pesa Customer';
    const timestamp = parseMpesaTimestamp(TransTime);

    // Fast in-memory resolution to never block on cloud DB
    const cachedConfig = (bsc ? configCacheByCode.get(bsc) : null) || (rawBusinessId ? configCacheByBiz.get(rawBusinessId) : null);
    const resolvedBusinessId = cachedConfig?.businessId || rawBusinessId || (configCacheByBiz.size > 0 ? configCacheByBiz.keys().next().value : 'cmw0s4hha0000kx36im5v9341');

    if (cleanTransId && cleanAmount > 0) {
      // 1. Store in RAM cache immediately (0ms)
      const memoryItem: InMemoryMpesaTxn = {
        id: `mem_${cleanTransId}`,
        businessId: resolvedBusinessId,
        transactionId: cleanTransId,
        amount: cleanAmount,
        phoneNumber: rawPhone,
        customerName,
        status: 'UNLINKED',
        isEnriched,
        timestamp: timestamp.toISOString()
      };
      cacheMpesaTransaction(memoryItem);

      // 2. Emit instant Socket.io event first (0ms latency to POS screen)
      const io = req.app.get('io');
      const payload = {
        transactionId: cleanTransId,
        amount: cleanAmount,
        phoneNumber: rawPhone,
        customerName,
        isEnriched,
        timestamp: timestamp.toISOString(),
        businessId: resolvedBusinessId
      };
      if (io) {
        io.to(`business_${resolvedBusinessId}`).emit('mpesa_payment_received', payload);
        if (rawBusinessId && rawBusinessId !== resolvedBusinessId) {
          io.to(`business_${rawBusinessId}`).emit('mpesa_payment_received', payload);
        }
        io.emit('mpesa_payment_received', payload);
        console.log(`[M-Pesa Webhook] C2B Validation emitted: ${cleanTransId} for KSh ${cleanAmount} (${customerName})`);
      }

      // 3. Background DB persistence (non-blocking)
      (async () => {
        try {
          let config = cachedConfig;
          if (!config) {
            config = await withDbRetry(async () => {
              let found = null;
              if (bsc) {
                found = await prisma.mpesaConfig.findFirst({
                  where: {
                    OR: [
                      { shortcode: bsc },
                      { tillNumber: bsc },
                      { paybillNumber: bsc }
                    ]
                  },
                  orderBy: { updatedAt: 'desc' }
                });
              }
              if (!found && rawBusinessId) {
                found = await prisma.mpesaConfig.findFirst({ where: { businessId: rawBusinessId } });
              }
              return found;
            });
            if (config) cacheMpesaConfig(config);
          }

          await withDbRetry(async () => {
            return prisma.mpesaTransaction.upsert({
              where: { transactionId: cleanTransId },
              create: {
                businessId: config?.businessId || resolvedBusinessId,
                locationId: config?.locationId || null,
                transactionId: cleanTransId,
                amount: cleanAmount,
                phoneNumber: rawPhone,
                customerName,
                status: 'UNLINKED',
                isEnriched,
                timestamp
              },
              update: {
                customerName: customerName !== 'M-Pesa Customer' ? customerName : undefined,
                phoneNumber: rawPhone || undefined,
                amount: cleanAmount || undefined
              }
            });
          });

          if (config?.initiatorName && config?.initiatorPassword && (isMaskedOrHashedPhone(rawPhone) || customerName === 'M-Pesa Customer')) {
            triggerTransactionStatus(config, cleanTransId, config.businessId || resolvedBusinessId);
          }
        } catch (dbErr) {
          console.warn(`[M-Pesa Webhook] C2B Validation DB save deferred (offline/error) for ${cleanTransId}:`, dbErr);
        }
      })().catch(e => console.error('[M-Pesa Webhook] Validation background error:', e));
    }

    // Always accept validation so customer payment goes through
    res.json({ "ResultCode": 0, "ResultDesc": "Accepted" });
  } catch (err: any) {
    console.error('[M-Pesa Webhook] C2B Validation error:', err);
    res.json({ "ResultCode": 0, "ResultDesc": "Accepted" });
  }
};

router.post('/callback/c2b/validation/:businessId', handleC2bValidation);
router.post('/callback/c2b/validation', handleC2bValidation);

// 5. C2B Confirmation Webhook
const handleC2bConfirmation = async (req: any, res: any) => {
  console.log(`[M-Pesa Webhook] C2B Confirmation received for business ${req.params?.businessId || 'auto'}:`, JSON.stringify(req.body, null, 2));
  try {
    const rawBusinessId = req.params?.businessId;
    const {
      TransID, TransAmount, MSISDN, FirstName, MiddleName, LastName, BusinessShortCode, TransTime
    } = req.body;
    
    const bsc = String(BusinessShortCode || '').trim();
    const cleanTransId = String(TransID || req.body.transID || req.body.ReceiptNo || '').trim();
    const cleanAmount = parseFloat(TransAmount || req.body.Amount || '0');
    let rawPhone = String(MSISDN || req.body.PhoneNumber || req.body.phone || '').trim();
    if (rawPhone.startsWith('+')) rawPhone = rawPhone.slice(1);

    const customerName = [FirstName, MiddleName, LastName].filter(Boolean).join(' ').trim() || req.body.CustomerName || 'M-Pesa Customer';
    const isEnriched = customerName !== 'M-Pesa Customer';
    const timestamp = parseMpesaTimestamp(TransTime);

    // Fast in-memory resolution to never block on cloud DB
    const cachedConfig = (bsc ? configCacheByCode.get(bsc) : null) || (rawBusinessId ? configCacheByBiz.get(rawBusinessId) : null);
    const resolvedBusinessId = cachedConfig?.businessId || rawBusinessId || (configCacheByBiz.size > 0 ? configCacheByBiz.keys().next().value : 'cmw0s4hha0000kx36im5v9341');

    if (cleanTransId && cleanAmount > 0) {
      // 1. Store in RAM cache immediately (0ms)
      const memoryItem: InMemoryMpesaTxn = {
        id: `mem_${cleanTransId}`,
        businessId: resolvedBusinessId,
        transactionId: cleanTransId,
        amount: cleanAmount,
        phoneNumber: rawPhone,
        customerName,
        status: 'UNLINKED',
        isEnriched,
        timestamp: timestamp.toISOString()
      };
      cacheMpesaTransaction(memoryItem);

      // 2. Emit instant Socket.io event first (0ms latency to POS screen)
      const io = req.app.get('io');
      const payload = {
        transactionId: cleanTransId,
        amount: cleanAmount,
        phoneNumber: rawPhone,
        customerName,
        isEnriched,
        timestamp: timestamp.toISOString(),
        businessId: resolvedBusinessId
      };

      if (io) {
        io.to(`business_${resolvedBusinessId}`).emit('mpesa_payment_received', payload);
        if (rawBusinessId && rawBusinessId !== resolvedBusinessId) {
          io.to(`business_${rawBusinessId}`).emit('mpesa_payment_received', payload);
        }

        // Also broadcast to any other business configs sharing this ShortCode / Till
        if (bsc && cachedConfig?.businessId) {
          io.to(`business_${cachedConfig.businessId}`).emit('mpesa_payment_received', payload);
        }

        // Global emission so any connected POS terminal receives it in 0ms
        io.emit('mpesa_payment_received', payload);
        console.log(`[M-Pesa Webhook] C2B Confirmation broadcasted instantly: ${cleanTransId} for KSh ${cleanAmount} (${customerName})`);
      }

      // 3. Persist to DB in background with retry
      (async () => {
        try {
          let config = cachedConfig;
          if (!config) {
            config = await withDbRetry(async () => {
              let found = null;
              if (bsc) {
                found = await prisma.mpesaConfig.findFirst({
                  where: {
                    OR: [
                      { shortcode: bsc },
                      { tillNumber: bsc },
                      { paybillNumber: bsc },
                      { partyB: bsc }
                    ]
                  },
                  orderBy: { updatedAt: 'desc' }
                });
              }
              if (!found && rawBusinessId) {
                found = await prisma.mpesaConfig.findFirst({ where: { businessId: rawBusinessId } });
              }
              return found;
            });
            if (config) cacheMpesaConfig(config);
          }

          await withDbRetry(async () => {
            return prisma.mpesaTransaction.upsert({
              where: { transactionId: cleanTransId },
              create: {
                businessId: config?.businessId || resolvedBusinessId,
                locationId: config?.locationId || null,
                transactionId: cleanTransId,
                amount: cleanAmount,
                phoneNumber: rawPhone,
                customerName,
                status: 'UNLINKED',
                isEnriched,
                timestamp
              },
              update: {
                customerName: customerName !== 'M-Pesa Customer' ? customerName : undefined,
                phoneNumber: rawPhone || undefined,
                amount: cleanAmount || undefined
              }
            });
          });
          console.log(`[M-Pesa Webhook] C2B Confirmation saved to DB: ${cleanTransId}`);

          // Trigger TransactionStatus if phone is masked or 64-char Till hash or name is generic
          if (config?.initiatorName && config?.initiatorPassword && (isMaskedOrHashedPhone(rawPhone) || !isEnriched)) {
            triggerTransactionStatus(config, cleanTransId, config.businessId || resolvedBusinessId);
          }
        } catch (dbErr) {
          console.warn(`[M-Pesa Webhook] C2B Confirmation DB write deferred (offline/error) for ${cleanTransId}:`, dbErr);
        }
      })().catch(e => console.error('[M-Pesa Webhook] Confirmation background error:', e));
    }

    res.json({ "ResultCode": 0, "ResultDesc": "Success" });
  } catch (error: any) {
    console.error('[M-Pesa Webhook] C2B Confirmation error:', error);
    res.json({ "ResultCode": 0, "ResultDesc": "Success" });
  }
};

router.post('/callback/c2b/confirmation/:businessId', handleC2bConfirmation);
router.post('/callback/c2b/confirmation', handleC2bConfirmation);

// 6. Transaction Status Webhook
router.post('/callback/transaction-status/:businessId', async (req: any, res: any) => {
  try {
    const { businessId } = req.params;
    const result = req.body?.Result;
    
    console.log(`[Transaction Status] Callback received for business ${businessId}:`, JSON.stringify(req.body, null, 2));
    
    if (result && (result.ResultCode === 0 || result.ResultCode === "0") && result.ResultParameters) {
      const params = result.ResultParameters.ResultParameter;
      const receiptNumber = params.find((p: any) => p.Key === 'ReceiptNo')?.Value;
      const rawPartyName = params.find((p: any) => p.Key === 'DebitPartyName')?.Value || params.find((p: any) => p.Key === 'SenderPartyName')?.Value;
      
      if (receiptNumber && rawPartyName) {
        const nameParts = rawPartyName.split('-');
        const rawPhone = nameParts[0].trim();
        const customerName = nameParts.length > 1 ? nameParts.slice(1).join('-').trim() : rawPartyName;
        
        let formattedPhone = rawPhone.replace(/\s+/g, '');
        if (formattedPhone.startsWith('254') && formattedPhone.length === 12) {
            formattedPhone = '0' + formattedPhone.slice(3);
        }
        if (formattedPhone.includes('*')) {
            formattedPhone = formattedPhone.replace(/\*+/g, '***');
        }

        // 1. Update in-memory cache immediately (0ms)
        const memTxn = recentMpesaTxns.get(receiptNumber);
        if (memTxn) {
          memTxn.customerName = customerName;
          memTxn.phoneNumber = formattedPhone;
          memTxn.isEnriched = true;
        }
        
        // 2. Background DB updates
        (async () => {
          try {
            await prisma.mpesaTransaction.updateMany({
              where: { transactionId: receiptNumber },
              data: { customerName, phoneNumber: formattedPhone, isEnriched: true }
            });
            await prisma.receipt.updateMany({
              where: { mpesaCode: receiptNumber },
              data: { customerPhone: formattedPhone }
            });
          } catch (e) {}
        })().catch(() => {});
        
        console.log(`[Transaction Status] Enriched ${receiptNumber}: Name=${customerName}, Phone=${formattedPhone}`);

        // 3. Emit real-time Socket.IO update so POS terminals refresh the payment instantly
        const io = req.app.get('io');
        if (io) {
          const enrichPayload = {
            transactionId: receiptNumber,
            customerName,
            phoneNumber: formattedPhone,
            isEnriched: true,
            businessId: memTxn?.businessId || businessId
          };
          if (memTxn?.businessId) {
            io.to(`business_${memTxn.businessId}`).emit('mpesa_payment_enriched', enrichPayload);
          }
          io.to(`business_${businessId}`).emit('mpesa_payment_enriched', enrichPayload);
          io.emit('mpesa_payment_enriched', enrichPayload);
        }
      } else {
        console.warn(`[Transaction Status] Could not find ReceiptNo or PartyName in result params. Params:`, JSON.stringify(params));
      }
    } else if (result) {
      console.warn(`[Transaction Status] Non-zero result for business ${businessId}: Code=${result.ResultCode}, Desc=${result.ResultDesc}`);
    }
    res.json({ "ResultCode": 0, "ResultDesc": "Accepted" });
  } catch (error) {
    console.error('Transaction Status Callback Error:', error);
    res.json({ "ResultCode": 0, "ResultDesc": "Accepted" });
  }
});

// 7. Payment Search / Polling for POS
router.get('/payments/search', async (req: any, res: any) => {
  const rawBiz = req.query.businessId;
  const businessId = Array.isArray(rawBiz) ? String(rawBiz[0]) : (rawBiz ? String(rawBiz) : '');
  const rawQ = req.query.q;
  const q = Array.isArray(rawQ) ? String(rawQ[0]) : (rawQ ? String(rawQ) : '');
  const cleanQ = q.trim().toLowerCase();
  const queryTill = req.query.tillNumber ? String(req.query.tillNumber).trim() : '';
  const queryShortcode = req.query.shortcode ? String(req.query.shortcode).trim() : '';

  // In-memory fallback query helper to guarantee 0ms response and survive Turso/DNS dropouts
  const searchMemoryCache = () => {
    const all = Array.from(recentMpesaTxns.values());
    const filtered = all.filter(txn => {
      if (businessId && txn.businessId && txn.businessId !== businessId) {
        const cachedCfg = configCacheByBiz.get(txn.businessId);
        const reqCfg = configCacheByBiz.get(businessId);
        const sharesCode = cachedCfg && reqCfg && (
          (cachedCfg.shortcode && cachedCfg.shortcode === reqCfg.shortcode) ||
          (cachedCfg.tillNumber && cachedCfg.tillNumber === reqCfg.tillNumber) ||
          (cachedCfg.partyB && cachedCfg.partyB === reqCfg.partyB)
        );
        if (!sharesCode && (queryTill || queryShortcode)) {
          // If query specified till/shortcode, match by that
          const tCode = cachedCfg?.tillNumber || cachedCfg?.shortcode;
          if (tCode && tCode !== queryTill && tCode !== queryShortcode) return false;
        }
      }

      if (cleanQ) {
        const tId = (txn.transactionId || '').toLowerCase();
        const cName = (txn.customerName || '').toLowerCase();
        const phone = (txn.phoneNumber || '').toLowerCase();
        const digits = cleanQ.replace(/\D/g, '');
        const matches = tId.includes(cleanQ) || cName.includes(cleanQ) || phone.includes(cleanQ) || (digits.length >= 3 && phone.includes(digits));
        return matches;
      }

      // For live till monitor without explicit search query, show UNLINKED
      return txn.status === 'UNLINKED';
    });

    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 50);
  };

  try {
    const txns = await withDbRetry(async () => {
      // Look up business config to identify all matching shortcodes/tills
      let myConfig = configCacheByBiz.get(businessId);
      if (!myConfig && businessId) {
        myConfig = await prisma.mpesaConfig.findFirst({ where: { businessId } });
        if (myConfig) cacheMpesaConfig(myConfig);
      }

      const matchingCodes = [
        myConfig?.shortcode, 
        myConfig?.tillNumber, 
        myConfig?.paybillNumber,
        queryTill,
        queryShortcode
      ].filter(Boolean) as string[];

      let businessIds = businessId ? [businessId] : [];
      if (matchingCodes.length > 0) {
        const sharedConfigs = await prisma.mpesaConfig.findMany({
          where: {
            OR: [
              { shortcode: { in: matchingCodes } },
              { tillNumber: { in: matchingCodes } },
              { paybillNumber: { in: matchingCodes } }
            ]
          },
          select: { businessId: true }
        });
        businessIds = Array.from(new Set([...businessIds, ...sharedConfigs.map(c => c.businessId)]));
      }

      const orConditions: any[] = [];
      if (cleanQ) {
        orConditions.push({ transactionId: { contains: cleanQ } });
        orConditions.push({ customerName: { contains: cleanQ } });
        orConditions.push({ phoneNumber: { contains: cleanQ } });

        const digits = cleanQ.replace(/\D/g, '');
        if (digits.length >= 3) {
          orConditions.push({ phoneNumber: { contains: digits } });
        }
        if (digits.length >= 9) {
          orConditions.push({ phoneNumber: { contains: digits.slice(-9) } });
        }
      }

      // Query unlinked transactions
      let dbTxns = await prisma.mpesaTransaction.findMany({
        where: { 
          ...(businessIds.length > 0 ? { businessId: { in: businessIds } } : {}),
          status: 'UNLINKED',
          ...(orConditions.length > 0 ? { OR: orConditions } : {})
        },
        orderBy: { timestamp: 'desc' },
        take: 50
      });

      // If user searched explicitly for something and 0 unlinked were found, also check if it was already claimed
      if (cleanQ && dbTxns.length === 0) {
        const claimedTxns = await prisma.mpesaTransaction.findMany({
          where: {
            ...(businessIds.length > 0 ? { businessId: { in: businessIds } } : {}),
            OR: orConditions
          },
          orderBy: { timestamp: 'desc' },
          take: 10
        });

        if (claimedTxns.length > 0) {
          dbTxns = claimedTxns.map((t: any) => ({
            ...t,
            isAlreadyClaimed: t.status === 'LINKED'
          }));
        }
      }

      return dbTxns;
    });

    // Populate memory cache from DB items
    (txns || []).forEach((t: any) => {
      cacheMpesaTransaction({
        id: t.id,
        businessId: t.businessId,
        transactionId: t.transactionId,
        amount: Number(t.amount),
        phoneNumber: t.phoneNumber || '',
        customerName: t.customerName || 'M-Pesa Customer',
        status: t.status,
        isEnriched: t.isEnriched,
        timestamp: typeof t.timestamp === 'string' ? t.timestamp : (t.timestamp ? new Date(t.timestamp).toISOString() : new Date().toISOString()),
        isAlreadyClaimed: t.isAlreadyClaimed || t.status === 'LINKED'
      });
    });

    // Merge in-memory transactions that arrived in RAM buffer but haven't hit DB yet
    const memList = searchMemoryCache();
    const dbIds = new Set((txns || []).map((t: any) => t.transactionId));
    const merged = [...(txns || [])];
    for (const m of memList) {
      if (!dbIds.has(m.transactionId)) {
        merged.push(m);
      }
    }

    res.json(merged);
  } catch (err: any) {
    console.warn(`[M-Pesa Cache] DB query unavailable (${err.message}). Serving ${recentMpesaTxns.size} transactions from memory cache.`);
    const fallbackList = searchMemoryCache();
    res.json(fallbackList); // NEVER returns 500! Always 200 with cached transactions
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

      const whereClause: any = { businessId };
      if (statusFilter && ['LINKED', 'UNLINKED'].includes(statusFilter)) {
        whereClause.status = statusFilter;
      }

      if (startDate || endDate) {
        whereClause.timestamp = {};
        if (startDate) whereClause.timestamp.gte = new Date(startDate);
        if (endDate) whereClause.timestamp.lte = new Date(endDate);
      }

      const txns = await prisma.mpesaTransaction.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
        take: limit
      });

      // Query linked receipts for extra details
      const mpesaCodes = txns.map((t: any) => t.transactionId).filter(Boolean);
      let receiptMap = new Map<string, string>();
      if (mpesaCodes.length > 0) {
        try {
          const receipts = await prisma.receipt.findMany({
            where: {
              businessId,
              mpesaCode: { in: mpesaCodes }
            },
            select: { mpesaCode: true, receiptNumber: true }
          });
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
      console.error('M-Pesa Statement Error:', err);
      res.status(500).json({ error: 'Failed to fetch M-Pesa statement' });
    }
  });

  // 8. Generate Dynamic QR Code
  router.post('/qrcode', async (req: any, res: any) => {
    try {
      const { businessId, amount, refNo, locationId } = req.body;
      if (!businessId || !amount) return res.status(400).json({ error: 'Missing required fields' });
      
      let config = null;
      if (locationId) {
        config = await prisma.mpesaConfig.findFirst({ where: { businessId, locationId } });
      }
      if (!config) {
        config = await prisma.mpesaConfig.findFirst({ where: { businessId } });
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
    
    const cleanTxnId = String(transactionId).replace(/^\*/, '').trim();

    // 1. Instantly update in-memory cache so polling and memory search reflect it in 0ms
    const memTxn = recentMpesaTxns.get(cleanTxnId);
    if (memTxn) {
      memTxn.status = 'LINKED';
      memTxn.isAlreadyClaimed = true;
    }
    
    try {
      await withDbRetry(async () => {
        // Find transaction for this business or globally
        let txn = await prisma.mpesaTransaction.findFirst({
          where: {
            transactionId: cleanTxnId,
            ...(businessId ? { businessId } : {})
          }
        });

        if (!txn) {
          txn = await prisma.mpesaTransaction.findFirst({
            where: { transactionId: cleanTxnId }
          });
        }

        if (txn) {
          // If already LINKED, strictly require Manager or Admin PIN to authorize reuse
          if (txn.status === 'LINKED') {
            if (!adminPin) {
              return res.status(403).json({ 
                success: false, 
                isAlreadyClaimed: true, 
                error: 'This payment has already been claimed for another sale. Manager/Admin PIN is required to authorize reuse.' 
              });
            }

            // Validate admin/manager PIN
            const cleanPin = String(adminPin).trim();
            const adminUser = await prisma.user.findFirst({
              where: {
                pin: cleanPin,
                role: { in: ['admin', 'manager', 'ADMIN', 'MANAGER'] }
              }
            });

            if (!adminUser) {
              return res.status(401).json({ success: false, error: 'Invalid Manager/Admin PIN. Re-use authorization denied.' });
            }

            // Reused authorization granted!
            await prisma.mpesaTransaction.update({
              where: { id: txn.id },
              data: {
                status: 'LINKED',
                updatedAt: new Date()
              }
            });

            console.log(`[M-Pesa Audit] Transaction ${cleanTxnId} REUSED by cashier "${cashier || 'Cashier'}", authorized by Admin "${adminUser.name}" at ${new Date().toISOString()}`);

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

          // Regular first-time claim
          await prisma.mpesaTransaction.update({
            where: { id: txn.id },
            data: { 
              status: 'LINKED',
              updatedAt: new Date()
            }
          });
        }
      });
    } catch (dbErr) {
      console.warn(`[M-Pesa Consume] DB persistence deferred (offline/error) for ${cleanTxnId}:`, dbErr);
    }

    console.log(`[M-Pesa Consume] Payment ${cleanTxnId} permanently LINKED to receipt ${receiptNumber || 'POS'} by ${cashier || 'Cashier'}`);

    const io = req.app.get('io');
    if (io) {
      io.emit('mpesa_payment_claimed', { 
        transactionId: cleanTxnId, 
        receiptNumber: receiptNumber || 'POS',
        cashier: cashier || 'Cashier'
      });
    }

    return res.json({ success: true, message: 'Payment claimed successfully.' });
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
    let config = await prisma.mpesaConfig.findFirst({ where: { businessId } });
    if (!config) {
      // Upsert: Create config with the certificate if user uploads before saving details
      config = await prisma.mpesaConfig.create({
        data: {
          businessId,
          merchantType: 'paybill',
          environment: 'production',
          certificateBase64: cleanCert
        }
      });
    } else {
      await prisma.mpesaConfig.update({
        where: { id: config.id },
        data: { certificateBase64: cleanCert }
      });
    }

    console.log(`[M-Pesa] Certificate uploaded for business ${businessId}`);
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

    const config = await prisma.mpesaConfig.findFirst({
      where: { businessId },
      select: {
        id: true,
        merchantType: true,
        tillNumber: true,
        paybillNumber: true,
        accountReference: true,
        environment: true,
        shortcode: true,
        initiatorName: true,
        stkEnabled: true,
        c2bEnabled: true,
        certificateBase64: true // only used to compute hasCertificate flag below
        // Deliberately omit: consumerKey, consumerSecret, passkey, initiatorPassword
      }
    });

    if (!config) return res.status(404).json({ error: 'Config not found' });

    // Strip certificateBase64 from response (security), expose only boolean flag
    const { certificateBase64, ...safeConfig } = config as any;
    res.json({ ...safeConfig, hasCertificate: !!certificateBase64 });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
