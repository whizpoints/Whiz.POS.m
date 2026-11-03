// @ts-nocheck
import { Router } from 'express';
import db from '../db.js';
import { randomUUID } from 'crypto';
import { MpesaCallbackUrlService } from '../services/mpesaUrls.js';
import { generateSecurityCredential } from '../utils/crypto.js';
const router = Router();
// Helper to get OAuth Token
async function getOAuthToken(consumerKey, consumerSecret, environment) {
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
    const data = await response.json();
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
const statusQueryLocks = new Map();
function isStatusCheckLocked(receipt) {
    const now = Date.now();
    const expiresAt = statusQueryLocks.get(receipt);
    if (expiresAt && expiresAt > now)
        return true;
    statusQueryLocks.set(receipt, now + 45000);
    return false;
}
async function triggerTransactionStatus(config, receipt, businessId) {
    if (!config.initiatorName || !config.initiatorPassword)
        return;
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
            .then(async (res) => {
            const text = await res.text();
            console.log(`[M-Pesa Webhook] Transaction status response for ${receipt}:`, res.status, text);
        })
            .catch(err => console.error(`[M-Pesa Webhook] Failed to query transaction status for ${receipt}:`, err));
    }
    catch (err) {
        console.error(`[M-Pesa Webhook] Setup failed for transaction status query ${receipt}:`, err);
    }
}
// 1. STK Push Request
router.post('/stkpush', async (req, res) => {
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
        const data = await response.json();
        console.log(`[Daraja Response] STK Push Response:`, JSON.stringify(data));
        if (data.ResponseCode === "0") {
            res.json({ success: true, message: 'STK push sent', CheckoutRequestID: data.CheckoutRequestID });
        }
        else {
            res.status(400).json({ success: false, message: data.errorMessage || 'STK push failed', details: data });
        }
    }
    catch (err) {
        console.error('STK Push error:', err);
        res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
});
// 2. Register C2B URL
router.post('/c2b/v1/registerurl', async (req, res) => {
    try {
        const { businessId, shortcode: customShortcode } = req.body;
        const config = await db.selectFrom('MpesaConfig').selectAll().where('businessId', '=', businessId).executeTakeFirst();
        if (!config)
            return res.status(400).json({ error: 'Config not found' });
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
        const data = await response.json();
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 3. STK Push Callback (Webhook)
const handleLocalStkCallback = async (req, res) => {
    try {
        const businessId = req.params?.businessId;
        const callbackData = req.body?.Body?.stkCallback;
        console.log(`[Local M-Pesa Webhook] STK Callback received for business ${businessId}:`, JSON.stringify(req.body, null, 2));
        if (callbackData && (callbackData.ResultCode === 0 || callbackData.ResultCode === "0")) {
            const items = callbackData.CallbackMetadata?.Item || [];
            const amount = items.find((i) => i.Name === 'Amount')?.Value;
            const receipt = items.find((i) => i.Name === 'MpesaReceiptNumber')?.Value;
            const phone = items.find((i) => i.Name === 'PhoneNumber')?.Value;
            const cleanReceipt = String(receipt || '').trim();
            const cleanAmount = parseFloat(String(amount || '0'));
            const cleanPhone = String(phone || '').trim();
            // Verify business config exists
            const config = businessId ? await db.selectFrom('MpesaConfig').selectAll().where('businessId', '=', businessId).executeTakeFirst() : null;
            if (cleanReceipt && (config || businessId)) {
                const resolvedBizId = config?.businessId || businessId;
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
                        isEnriched: (config?.initiatorName && config?.initiatorPassword ? 0 : 1),
                        customerName: 'M-Pesa Customer',
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
                        customerName: 'M-Pesa Customer',
                        isEnriched: true,
                        businessId: resolvedBizId
                    };
                    io.to(`business_${resolvedBizId}`).emit('mpesa_payment_received', payload);
                    io.emit('mpesa_payment_received', payload);
                }
                // Fetch Customer Name using Transaction Status API
                if (config?.initiatorName && config?.initiatorPassword) {
                    triggerTransactionStatus(config, cleanReceipt, resolvedBizId);
                }
            }
        }
        // Always return success to Safaricom to acknowledge receipt
        res.json({ "ResultCode": 0, "ResultDesc": "Success" });
    }
    catch (err) {
        console.error('STK Callback error:', err);
        res.json({ "ResultCode": 1, "ResultDesc": "Error processing callback" });
    }
};
router.post('/callback/stk/:businessId', handleLocalStkCallback);
router.post('/callback/stk', handleLocalStkCallback);
// 4. C2B Validation (Webhook)
const handleLocalC2bValidation = async (req, res) => {
    console.log(`[Local M-Pesa Webhook] C2B Validation received for business ${req.params?.businessId || 'auto'}:`, JSON.stringify(req.body, null, 2));
    try {
        const rawBusinessId = req.params?.businessId;
        const { TransID, TransAmount, MSISDN, FirstName, MiddleName, LastName, BusinessShortCode, TransTime } = req.body;
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
        if (rawPhone.startsWith('+'))
            rawPhone = rawPhone.slice(1);
        const customerName = [FirstName, MiddleName, LastName].filter(Boolean).join(' ').trim() || 'M-Pesa Customer';
        let timestamp = new Date().toISOString();
        if (TransTime && String(TransTime).length >= 14) {
            const tt = String(TransTime);
            const yr = parseInt(tt.substring(0, 4), 10);
            const mo = parseInt(tt.substring(4, 6), 10) - 1;
            const dy = parseInt(tt.substring(6, 8), 10);
            const hr = parseInt(tt.substring(8, 10), 10);
            const mn = parseInt(tt.substring(10, 12), 10);
            const sc = parseInt(tt.substring(12, 14), 10);
            const d = new Date(Date.UTC(yr, mo, dy, hr, mn, sc));
            if (!isNaN(d.getTime()))
                timestamp = d.toISOString();
        }
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
    }
    catch (err) {
        console.error('[Local M-Pesa Webhook] C2B Validation error:', err);
        res.json({ "ResultCode": 0, "ResultDesc": "Accepted" });
    }
};
router.post('/callback/c2b/validation/:businessId', handleLocalC2bValidation);
router.post('/callback/c2b/validation', handleLocalC2bValidation);
// 5. C2B Confirmation Webhook
const handleLocalC2bConfirmation = async (req, res) => {
    console.log(`[Local M-Pesa Webhook] C2B Confirmation received for business ${req.params?.businessId || 'auto'}:`, JSON.stringify(req.body, null, 2));
    try {
        const rawBusinessId = req.params?.businessId;
        const { TransID, TransAmount, MSISDN, FirstName, MiddleName, LastName, BusinessShortCode, TransTime } = req.body;
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
        if (rawPhone.startsWith('+'))
            rawPhone = rawPhone.slice(1);
        const customerName = [FirstName, MiddleName, LastName].filter(Boolean).join(' ').trim() || req.body.CustomerName || 'M-Pesa Customer';
        let timestamp = new Date().toISOString();
        if (TransTime && String(TransTime).length >= 14) {
            const tt = String(TransTime);
            const yr = parseInt(tt.substring(0, 4), 10);
            const mo = parseInt(tt.substring(4, 6), 10) - 1;
            const dy = parseInt(tt.substring(6, 8), 10);
            const hr = parseInt(tt.substring(8, 10), 10);
            const mn = parseInt(tt.substring(10, 12), 10);
            const sc = parseInt(tt.substring(12, 14), 10);
            const d = new Date(Date.UTC(yr, mo, dy, hr, mn, sc));
            if (!isNaN(d.getTime()))
                timestamp = d.toISOString();
        }
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
            }
            else {
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
    }
    catch (error) {
        console.error('[Local M-Pesa Webhook] C2B Confirmation error:', error);
        res.json({ "ResultCode": 0, "ResultDesc": "Success" });
    }
};
router.post('/callback/c2b/confirmation/:businessId', handleLocalC2bConfirmation);
router.post('/callback/c2b/confirmation', handleLocalC2bConfirmation);
// 6. Transaction Status Webhook
router.post('/callback/transaction-status/:businessId', async (req, res) => {
    try {
        const { businessId } = req.params;
        const result = req.body?.Result;
        if (result && result.ResultCode === 0 && result.ResultParameters) {
            const params = result.ResultParameters.ResultParameter;
            const receiptNumber = params.find((p) => p.Key === 'ReceiptNo')?.Value;
            const rawPartyName = params.find((p) => p.Key === 'DebitPartyName')?.Value || params.find((p) => p.Key === 'SenderPartyName')?.Value;
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
                await db.updateTable('MpesaTransaction').set({ customerName, phoneNumber: formattedPhone, isEnriched: 1 }).where('transactionId', '=', receiptNumber).where('businessId', '=', businessId).execute();
                try {
                    await db.updateTable('Receipt')
                        .set({ customerPhone: formattedPhone })
                        .where('mpesaCode', '=', receiptNumber)
                        .where('businessId', '=', businessId)
                        .execute();
                }
                catch (e) { }
                console.log(`[Transaction Status] Enriched ${receiptNumber}: Name=${customerName}, Phone=${formattedPhone}`);
            }
        }
        res.json({ "ResultCode": 0, "ResultDesc": "Accepted" });
    }
    catch (error) {
        console.error('Transaction Status Callback Error:', error);
        res.json({ "ResultCode": 1, "ResultDesc": "Error" });
    }
});
// 7. Payment Search / Polling for POS
router.get('/payments/search', async (req, res) => {
    try {
        const rawBiz = req.query.businessId;
        const businessId = Array.isArray(rawBiz) ? String(rawBiz[0]) : (rawBiz ? String(rawBiz) : '');
        const rawQ = req.query.q;
        const q = Array.isArray(rawQ) ? String(rawQ[0]) : (rawQ ? String(rawQ) : '');
        if (!businessId)
            return res.status(400).json({ error: 'Missing businessId' });
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
                        }
                        else if (ctx.customerName && (!existing.customerName || ctx.isEnriched)) {
                            await db.updateTable('MpesaTransaction').set({
                                customerName: ctx.customerName,
                                phoneNumber: ctx.phoneNumber || existing.phoneNumber,
                                isEnriched: (ctx.isEnriched ? 1 : 0)
                            }).where('transactionId', '=', ctx.transactionId).execute();
                        }
                    }
                }
            }
        }
        catch (cloudErr) { }
        const cleanQ = q.trim();
        const digits = cleanQ.replace(/\D/g, '');
        // Resolve all business IDs sharing the same shortcode/till
        const myConfig = await db.selectFrom('MpesaConfig').selectAll().where('businessId', '=', businessId).executeTakeFirst();
        const matchingCodes = [myConfig?.shortcode, myConfig?.tillNumber, myConfig?.paybillNumber].filter(Boolean);
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
        let txns = await query.execute();
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
                txns = claimedResults.map((t) => ({
                    ...t,
                    isAlreadyClaimed: t.status === 'LINKED'
                }));
            }
        }
        res.json(txns);
    }
    catch (err) {
        console.error('M-Pesa payment search error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// 7b. Business M-Pesa Statement (All Money-In / Till Transactions)
router.get('/statement', async (req, res) => {
    try {
        const rawBiz = req.query.businessId;
        const businessId = Array.isArray(rawBiz) ? String(rawBiz[0]) : (rawBiz ? String(rawBiz) : '');
        if (!businessId)
            return res.status(400).json({ error: 'Missing businessId' });
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const statusFilter = (req.query.status || '').toUpperCase();
        const limit = parseInt(req.query.limit) || 1000;
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
        const mpesaCodes = txns.map((t) => t.transactionId).filter(Boolean);
        let receiptMap = new Map();
        if (mpesaCodes.length > 0) {
            try {
                const receipts = await db.selectFrom('Receipt')
                    .select(['mpesaCode', 'receiptNumber'])
                    .where('businessId', '=', businessId)
                    .where('mpesaCode', 'in', mpesaCodes)
                    .execute();
                receipts.forEach((r) => {
                    if (r.mpesaCode)
                        receiptMap.set(r.mpesaCode, r.receiptNumber);
                });
            }
            catch (e) { }
        }
        const enrichedList = txns.map((t) => ({
            ...t,
            posReceiptNumber: receiptMap.get(t.transactionId) || null
        }));
        const totalMoneyIn = enrichedList.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        const claimedCount = enrichedList.filter((t) => t.status === 'LINKED').length;
        const unclaimedCount = enrichedList.filter((t) => t.status === 'UNLINKED').length;
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
    }
    catch (err) {
        console.error('Local M-Pesa Statement Error:', err);
        res.status(500).json({ error: 'Failed to fetch statement' });
    }
});
// 8. Generate Dynamic QR Code
router.post('/qrcode', async (req, res) => {
    try {
        const { businessId, amount, refNo, locationId } = req.body;
        if (!businessId || !amount)
            return res.status(400).json({ error: 'Missing required fields' });
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
    }
    catch (err) {
        console.error('QR Code Generation Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// 9. Consume Payment
router.post('/payments/consume', async (req, res) => {
    try {
        const { transactionId, businessId } = req.body;
        if (!transactionId)
            return res.status(400).json({ error: 'Missing parameters' });
        const cleanTxnId = String(transactionId).trim();
        const existing = await db.selectFrom('MpesaTransaction')
            .selectAll()
            .where('transactionId', '=', cleanTxnId)
            .executeTakeFirst();
        if (!existing) {
            return res.status(404).json({ error: 'Transaction not found.' });
        }
        if (existing.status === 'LINKED') {
            return res.json({ success: true, alreadyConsumed: true, message: 'Transaction already claimed.' });
        }
        await db.updateTable('MpesaTransaction')
            .set({ status: 'LINKED' })
            .where('id', '=', existing.id)
            .execute();
        res.json({ success: true, message: 'Payment claimed successfully.' });
    }
    catch (err) {
        console.error('Consume error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// 10. Upload Safaricom Certificate (per-business)
// Accepts PEM text or raw base64. Stores in MpesaConfig.certificateBase64
router.post('/certificate', async (req, res) => {
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
        }
        else {
            await db.updateTable('MpesaConfig')
                .set({ certificateBase64: cleanCert })
                .where('id', '=', config.id)
                .execute();
        }
        console.log(`[Local M-Pesa] Certificate uploaded for business ${businessId}`);
        res.json({ success: true, message: 'Certificate saved successfully' });
    }
    catch (err) {
        console.error('Certificate upload error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// 11. Get M-Pesa Config (for Settings UI) — excludes sensitive keys
router.get('/config', async (req, res) => {
    try {
        const businessId = req.query.businessId;
        if (!businessId)
            return res.status(400).json({ error: 'Missing businessId' });
        const config = await db.selectFrom('MpesaConfig')
            .selectAll()
            .where('businessId', '=', businessId)
            .executeTakeFirst();
        if (!config)
            return res.status(404).json({ error: 'Config not found' });
        const { certificateBase64, consumerKey, consumerSecret, passkey, initiatorPassword, ...safeConfig } = config;
        res.json({ ...safeConfig, hasCertificate: Boolean(certificateBase64) });
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;
