import { Router } from 'express';
import db from '../db.js';
import { randomUUID } from 'crypto';
import { MpesaCallbackUrlService } from '../services/mpesaUrls.js';
import { generateSecurityCredential } from '../utils/crypto.js';

const router = Router();
// // Helper to get OAuth Token
async function getOAuthToken(consumerKey: string, consumerSecret: string, environment: string) {
  const url = environment === 'production' 
    ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
    
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  
  const response = await fetch(url, {
    headers: { 'Authorization': `Basic ${auth}` }
  });
  
  if (!response.ok) throw new Error('Failed to fetch OAuth token');
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

async function triggerTransactionStatus(config: any, receipt: string, businessId: string) {
    if (!config.initiatorName || !config.initiatorPassword) return;
    try {
      const token = await getOAuthToken(config.consumerKey, config.consumerSecret, config.environment);
      const securityCredential = await generateSecurityCredential(config.initiatorPassword);
      
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
        ResultURL: `${baseDomain}/api/mpesa/callback/transaction-status/${businessId}`,
        QueueTimeOutURL: `${baseDomain}/api/mpesa/callback/transaction-status/${businessId}`,
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
      }).catch(err => console.error(`[M-Pesa Webhook] Failed to query transaction status for ${receipt}:`, err));
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
      config = await db.selectFrom('MpesaConfig').selectAll().where('businessId', '=', businessId).where('locationId', '=', locationId).executeTakeFirst();
    }
    if (!config) {
      config = await db.selectFrom('MpesaConfig').selectAll().where('businessId', '=', businessId).executeTakeFirst();
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
    const { businessId } = req.body;
    const config = await db.selectFrom('MpesaConfig').selectAll().where('businessId', '=', businessId).executeTakeFirst();
    if (!config) return res.status(400).json({ error: 'Config not found' });

    const token = await getOAuthToken(config.consumerKey, config.consumerSecret, config.environment);
    
    const url = config.environment === 'production'
      ? 'https://api.safaricom.co.ke/mpesa/c2b/v2/registerurl'
      : 'https://sandbox.safaricom.co.ke/mpesa/c2b/v2/registerurl';

    const payload = {
      ShortCode: config.shortcode,
      ResponseType: "Completed",
      ConfirmationURL: MpesaCallbackUrlService.getC2bConfirmationUrl(businessId),
      ValidationURL: MpesaCallbackUrlService.getC2bValidationUrl(businessId)
    };

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
router.post('/callback/stk/:businessId', async (req: any, res: any) => {
  try {
    const { businessId } = req.params;
    const callbackData = req.body?.Body?.stkCallback;
    
    console.log(`[M-Pesa Webhook] STK Callback received for business ${businessId}:`, JSON.stringify(req.body, null, 2));
    
    if (callbackData && callbackData.ResultCode === 0) {
      const items = callbackData.CallbackMetadata.Item;
      const amount = items.find((i: any) => i.Name === 'Amount')?.Value;
      const receipt = items.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value;
      const phone = items.find((i: any) => i.Name === 'PhoneNumber')?.Value;
      
      // Verify business config exists
      const config = await db.selectFrom('MpesaConfig').selectAll().where('businessId', '=', businessId).executeTakeFirst();
      if (config) {
        const existingTx = await db.selectFrom('MpesaTransaction').selectAll().where('transactionId', '=', receipt || TransID || 'unknown').executeTakeFirst();
        if (!existingTx) {
          await db.insertInto('MpesaTransaction').values({
            id: randomUUID(),
            businessId,
            transactionId: typeof receipt !== 'undefined' ? receipt : (typeof TransID !== 'undefined' ? TransID : 'unknown'),
            amount: parseFloat(typeof amount !== 'undefined' ? amount : (typeof TransAmount !== 'undefined' ? TransAmount : '0')),
            phoneNumber: typeof phone !== 'undefined' ? phone.toString() : (typeof MSISDN !== 'undefined' ? MSISDN.toString() : ''),
            status: 'UNLINKED',
            customerName: typeof customerName !== 'undefined' ? customerName : null
          }).execute();
        }

        // Fetch Customer Name using Transaction Status API
        if (config.initiatorName && config.initiatorPassword) {
          triggerTransactionStatus(config, receipt, businessId);
        }
      }
    }
    // Always return success to Safaricom to acknowledge receipt
    res.json({ "ResultCode": 0, "ResultDesc": "Success" });
  } catch (err) {
    console.error('STK Callback error:', err);
    res.json({ "ResultCode": 1, "ResultDesc": "Error processing callback" });
  }
});

// 4. C2B Validation (Webhook)
router.post('/callback/c2b/validation/:businessId', async (req: any, res: any) => {
  console.log(`[M-Pesa Webhook] C2B Validation received for business ${req.params.businessId}:`, JSON.stringify(req.body, null, 2));
  try {
    const { businessId } = req.params;
    const { BusinessShortCode } = req.body;
    
    const config = await db.selectFrom('MpesaConfig').selectAll().where('businessId', '=', businessId).executeTakeFirst();
    if (!config || config.shortcode !== BusinessShortCode) {
      return res.json({ "ResultCode": 1, "ResultDesc": "Rejected: Invalid ShortCode mapping" });
    }
    
    res.json({ "ResultCode": 0, "ResultDesc": "Accepted" });
  } catch (err) {
    res.json({ "ResultCode": 1, "ResultDesc": "Error" });
  }
});

// 5. C2B Confirmation Webhook
router.post('/callback/c2b/confirmation/:businessId', async (req: any, res: any) => {
  try {
    const { businessId } = req.params;
    const {
      TransID, TransAmount, MSISDN, FirstName, MiddleName, LastName, BusinessShortCode
    } = req.body;
    
    const config = await db.selectFrom('MpesaConfig').selectAll().where('businessId', '=', businessId).executeTakeFirst();
    if (!config || config.shortcode !== BusinessShortCode) {
      // Reject spoofed callbacks
      return res.json({ "ResultCode": 1, "ResultDesc": "Rejected" });
    }

    const customerName = [FirstName, MiddleName, LastName].filter(Boolean).join(' ');
    
    const existingTx = await db.selectFrom('MpesaTransaction').selectAll().where('transactionId', '=', receipt || TransID || 'unknown').executeTakeFirst();
        if (!existingTx) {
          await db.insertInto('MpesaTransaction').values({
            id: randomUUID(),
            businessId,
            transactionId: typeof receipt !== 'undefined' ? receipt : (typeof TransID !== 'undefined' ? TransID : 'unknown'),
            amount: parseFloat(typeof amount !== 'undefined' ? amount : (typeof TransAmount !== 'undefined' ? TransAmount : '0')),
            phoneNumber: typeof phone !== 'undefined' ? phone.toString() : (typeof MSISDN !== 'undefined' ? MSISDN.toString() : ''),
            status: 'UNLINKED',
            customerName: typeof customerName !== 'undefined' ? customerName : null
          }).execute();
        }

    // Trigger Transaction Status Background Job
    if (config.initiatorName && config.initiatorPassword) {
      triggerTransactionStatus(config, TransID, businessId);
    }

    res.json({ "ResultCode": 0, "ResultDesc": "Success" });
  } catch (error) {
    res.json({ "ResultCode": 1, "ResultDesc": "Internal error" });
  }
});

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
          
          // Format phone strictly to 07XX xxx XXX
          let formattedPhone = rawPhone.replace(/^254/, '0');
          if (formattedPhone.includes('*')) {
              formattedPhone = formattedPhone.replace(/\*+/g, ' xxx ');
          } else if (formattedPhone.length === 10) {
              formattedPhone = `${formattedPhone.slice(0,4)} xxx ${formattedPhone.slice(-3)}`;
          }
          formattedPhone = formattedPhone.replace(/\s+/g, ' ').trim(); // ensure single spaces
          
          await db.updateTable('MpesaTransaction').set({ customerName, phoneNumber: formattedPhone, isEnriched: true }).where('transactionId', '=', receiptNumber).where('businessId', '=', businessId).execute();
          
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
      const businessId = req.query.businessId as string;
      const q = req.query.q as string;
      
      if (!businessId) return res.status(400).json({ error: 'Missing businessId' });
      
      let query = db.selectFrom('MpesaTransaction')
        .selectAll()
        .where('businessId', '=', businessId)
        .where('status', '=', 'UNLINKED')
        .where('isEnriched', '=', true)
        .orderBy('timestamp', 'desc')
        .limit(20);
      
      if (q) {
        query = query.where((eb) => eb.or([
          eb('transactionId', 'like', \`%\${q}%\`),
          eb('customerName', 'like', \`%\${q}%\`),
          eb('phoneNumber', 'like', \`%\${q}%\`)
        ]));
      }
      const txns = await query.execute();
      res.json(txns);
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
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
    const { transactionId, businessId } = req.body;
    if (!transactionId || !businessId) return res.status(400).json({ error: 'Missing parameters' });
    
    const result = await db.updateTable('MpesaTransaction').set({ status: 'LINKED' }).where('transactionId', '=', transactionId).where('businessId', '=', businessId).where('status', '=', 'UNLINKED').execute();

    if (result.length === 0 || Number(result[0].numUpdatedRows) === 0) {
      return res.status(409).json({ error: 'Transaction already claimed or not found.' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Consume error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

