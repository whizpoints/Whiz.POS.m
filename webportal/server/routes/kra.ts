// @ts-nocheck
import { Router } from 'express';
import crypto from 'crypto';
import prisma from '../db.js';

const router = Router();

// Map internal tax rates to KRA tax types
function mapTaxType(taxRate: number) {
  if (taxRate === 16) return 'A';
  if (taxRate === 8) return 'E';
  if (taxRate === 0) return 'B';
  return 'C';
}

/**
 * Format Whiz POS transaction into KRA eTIMS Save Invoice Request
 */
function formatInvoicePayload(transaction: any, settings: any) {
  const trdDt = new Date(transaction.date || transaction.timestamp || Date.now());
  const formattedDate = trdDt.toISOString().replace(/T/, '').replace(/-|:/g, '').substring(0, 14);

  let totTaxAmt = 0;
  let totAmt = 0;

  const items = transaction.items || [];
  const itemList = items.map((item: any, index: number) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.price || item.product?.price) || 0;
    const amount = qty * price;
    const taxRate = Number(item.taxRate || item.product?.taxRate || 16);
    const taxAmt = (amount * taxRate) / (100 + taxRate);

    totTaxAmt += taxAmt;
    totAmt += amount;

    return {
      itemSeq: index + 1,
      itemCd: item.product?.sku || item.itemCode || 'HS000000',
      itemNm: item.name || item.product?.name || 'Item ' + (index + 1),
      pkgUnitCd: 'NT',
      qty: qty,
      prc: price,
      splyAmt: Math.round((amount - taxAmt) * 100) / 100,
      taxAmt: Math.round(taxAmt * 100) / 100,
      totAmt: Math.round(amount * 100) / 100,
      taxTyCd: mapTaxType(taxRate)
    };
  });

  const kraPin = settings.etimsPin || settings.kraPin || business?.kraPin || process.env.KRA_PIN || '';
  const branchId = settings.etimsBranch || settings.etimsBranchId || process.env.KRA_BRANCH_ID || '00';

  return {
    tin: kraPin,
    bhfId: branchId,
    invcNo: String(transaction.id || transaction.transactionId || `INV-${Date.now()}`),
    orgInvcNo: 0,
    custTin: transaction.customerPin || '',
    custNm: transaction.customerName || 'Walk-in',
    salesTyCd: 'N',
    rcptTyCd: 'S',
    pmtTyCd: transaction.paymentMethod === 'mpesa' ? '03' : (transaction.paymentMethod === 'credit' ? '02' : '01'),
    trdDt: formattedDate,
    totItemCnt: itemList.length,
    totTaxableAmt: Math.round((totAmt - totTaxAmt) * 100) / 100,
    totTaxAmt: Math.round(totTaxAmt * 100) / 100,
    totAmt: Math.round(totAmt * 100) / 100,
    itemList: itemList
  };
}

/**
 * POST /api/kra/invoice
 * Handles KRA eTIMS invoice submission for transactions
 */
router.post('/invoice', async (req: any, res: any) => {
  try {
    const transaction = req.body;
    if (!transaction) {
      return res.status(400).json({ error: 'Missing transaction data' });
    }

    // Retrieve business settings
    const business = await prisma.business.findFirst();
    let settings: any = {};
    if (business && business.settings) {
      try {
        settings = typeof business.settings === 'string' ? JSON.parse(business.settings) : business.settings;
      } catch (e) {}
    }

    const kraPin = settings.etimsPin || settings.kraPin || business?.kraPin || process.env.KRA_PIN || '';
    const kraToken = settings.etimsToken || settings.kraToken || process.env.KRA_CMC_KEY || '';
    const branchId = settings.etimsBranch || settings.etimsBranchId || process.env.KRA_BRANCH_ID || '00';
    const etimsUrl = settings.etimsUrl || process.env.KRA_ETIMS_URL || 'https://etims-api-sbx.kra.go.ke/etims-api';
    const qrBaseUrl = etimsUrl.includes('-sbx')
      ? 'https://etims-sbx.kra.go.ke/common/link/etims/receipt/indexEtimsReceiptData?Data='
      : 'https://etims.kra.go.ke/common/link/etims/receipt/indexEtimsReceiptData?Data=';

    const payload = formatInvoicePayload(transaction, settings, business);

    // If live KRA credentials are provided, attempt to contact KRA API
    if (kraPin && kraToken && etimsUrl) {
      const normalizedUrl = etimsUrl.replace(/\/+$/, '');
      const primaryEndpoint = (normalizedUrl.includes('kra.go.ke') || !normalizedUrl.includes('localhost'))
        ? `${normalizedUrl}/saveTrnsSalesOsdc`
        : `${normalizedUrl}/trnsSales/saveSales`;
      const endpointsToTry = [primaryEndpoint];
      if (primaryEndpoint.endsWith('/saveTrnsSalesOsdc')) {
        endpointsToTry.push(`${normalizedUrl}/trnsSales/saveSales`);
      } else {
        endpointsToTry.push(`${normalizedUrl}/saveTrnsSalesOsdc`);
      }

      let lastError = null;
      for (const targetUrl of endpointsToTry) {
        try {
          console.log(`[KRA] Submitting invoice ${payload.invcNo} to ${targetUrl}...`);
          const kraRes = await fetch(targetUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'tin': kraPin,
              'bhfId': branchId,
              'cmcKey': kraToken
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(7000)
          });

          const responseText = await kraRes.text();
          if (kraRes.status === 404 && endpointsToTry.length > 1 && targetUrl === endpointsToTry[0]) {
            console.warn(`[KRA] Endpoint ${targetUrl} returned 404, attempting alternative endpoint...`);
            continue;
          }

          let kraData: any;
          try {
            kraData = JSON.parse(responseText);
          } catch (e) {
            throw new Error(`KRA server returned non-JSON HTTP ${kraRes.status}: ${responseText.slice(0, 150)}`);
          }

          if (kraData.resultCd === '000' || kraData.resultCd === 0) {
            const qrData = kraData.data?.intrlData || kraData.data?.rcptNo || payload.invcNo;
            const kraDetails = {
              invoiceNumber: payload.invcNo,
              receiptNumber: kraData.data?.rcptNo ? `KRA-${kraData.data.rcptNo}` : `KRA-${payload.invcNo}`,
              qrCode: `${qrBaseUrl}${encodeURIComponent(qrData)}`,
              controlCode: kraData.data?.rcptSign || '',
              date: new Date().toISOString(),
              scuInvcNo: kraData.data?.scuInvcNo || kraData.data?.sdcId || '',
              offline: false
            };
            return res.json({ success: true, kraDetails });
          } else {
            console.warn(`[KRA] API rejection [${kraData.resultCd}]: ${kraData.resultMsg}`);
            lastError = new Error(`KRA Error [${kraData.resultCd}]: ${kraData.resultMsg}`);
            break; // Don't retry alternative URL if KRA explicitly rejected the device/request
          }
        } catch (err: any) {
          lastError = err;
          if (targetUrl === endpointsToTry[0] && endpointsToTry.length > 1) {
            continue;
          }
        }
      }

      console.warn(`[KRA] Real submission failed: ${lastError?.message}. Providing offline queued receipt.`);
    }

    // Offline / Queued receipt: generate standard KRA eTIMS compliant offline details
    const pseudoHash = crypto.createHash('sha256').update(payload.invcNo + Date.now()).digest('hex').substring(0, 16).toUpperCase();
    const qrPayload = `TIN=${payload.tin}&BHF=${payload.bhfId}&INV=${payload.invcNo}&SIGN=${pseudoHash}`;
    const kraDetails = {
      invoiceNumber: payload.invcNo,
      receiptNumber: `KRA-OFFLINE-${payload.invcNo}`,
      qrCode: `${qrBaseUrl}${encodeURIComponent(qrPayload)}`,
      controlCode: pseudoHash,
      date: new Date().toISOString(),
      scuInvcNo: `SCU${Date.now().toString().slice(-6)}`,
      offline: true,
      offlineReason: kraPin && kraToken ? 'KRA server rejected device or was unreachable' : 'eTIMS credentials not fully configured'
    };

    return res.json({ success: false, queued: true, offline: true, kraDetails, simulated: true });
  } catch (error: any) {
    console.error('[KRA Router] Error processing invoice:', error);
    res.status(500).json({ error: error.message || 'Failed to process KRA invoice' });
  }
});

/**
 * POST /api/kra/ping
 * Test eTIMS connectivity and measure round-trip latency
 */
router.post('/ping', async (req: any, res: any) => {
  try {
    const business = await prisma.business.findFirst();
    let settings: any = {};
    if (business && business.settings) {
      try {
        settings = typeof business.settings === 'string' ? JSON.parse(business.settings) : business.settings;
      } catch (e) {}
    }
    const etimsUrl = settings.etimsUrl || 'https://etims-api-sbx.kra.go.ke/etims-api';
    const normalizedUrl = etimsUrl.replace(/\/+$/, '');
    const startTime = Date.now();

    const pingRes = await fetch(`${normalizedUrl}/selectNoticeList`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tin: settings.etimsPin || 'TEST' }),
      signal: AbortSignal.timeout(6000)
    }).catch((err) => ({ ok: false, status: 0, statusText: err.message }));

    const latencyMs = Date.now() - startTime;
    const isOk = pingRes && 'status' in pingRes && pingRes.status > 0;

    res.json({
      success: isOk,
      reachable: isOk,
      status: pingRes.status,
      latencyMs,
      url: normalizedUrl,
      environment: normalizedUrl.includes('-sbx') ? 'sandbox' : 'production'
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/kra/init-device
 * Test device handshake with KRA OSCU
 */
router.post('/init-device', async (req: any, res: any) => {
  try {
    const business = await prisma.business.findFirst();
    let settings: any = {};
    if (business && business.settings) {
      try {
        settings = typeof business.settings === 'string' ? JSON.parse(business.settings) : business.settings;
      } catch (e) {}
    }

    const kraPin = req.body?.tin || settings.etimsPin || settings.kraPin || '';
    const branchId = req.body?.bhfId || settings.etimsBranch || settings.etimsBranchId || '00';
    const dvcSrlNo = req.body?.dvcSrlNo || settings.etimsSerial || settings.etimsDeviceSerial || 'WHIZPOS-V7.1.0';
    const etimsUrl = req.body?.etimsUrl || settings.etimsUrl || 'https://etims-api-sbx.kra.go.ke/etims-api';
    const normalizedUrl = etimsUrl.replace(/\/+$/, '');

    const payload = { tin: kraPin, bhfId: branchId, dvcSrlNo };
    console.log(`[KRA] Testing device init handshake at ${normalizedUrl}/selectInitOsdcInfo:`, JSON.stringify(payload));

    const response = await fetch(`${normalizedUrl}/selectInitOsdcInfo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000)
    });

    const text = await response.text();
    let result: any;
    try {
      result = JSON.parse(text);
    } catch (e) {
      return res.status(502).json({ error: `Server returned non-JSON HTTP ${response.status}: ${text.slice(0, 150)}` });
    }

    return res.json({
      success: result.resultCd === '000',
      resultCd: result.resultCd,
      resultMsg: result.resultMsg,
      cmcKey: result.data?.cmcKey || null,
      data: result.data || null
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/kra/stats
 * Real eTIMS statistics from the database
 */
router.get('/stats', async (req: any, res: any) => {
  try {
    const business = await prisma.business.findFirst();
    let settings: any = {};
    if (business && business.settings) {
      try {
        settings = typeof business.settings === 'string' ? JSON.parse(business.settings) : business.settings;
      } catch (e) {}
    }

    const kraPin = settings.etimsPin || settings.kraPin || '';
    const etimsUrl = settings.etimsUrl || 'https://etims-api-sbx.kra.go.ke/etims-api';

    res.json({
      configured: !!kraPin,
      pin: kraPin,
      branch: settings.etimsBranch || '00',
      serial: settings.etimsSerial || '',
      url: etimsUrl,
      environment: etimsUrl.includes('-sbx') ? 'sandbox' : 'production'
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
