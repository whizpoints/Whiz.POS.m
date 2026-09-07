const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { app } = require('electron');

/**
 * KRA eTIMS Integration Service (Core Features)
 * TIS Name: Whiz POS
 * TIS Version: 7.1.0
 * 
 * Note: Actual endpoints, PINs, and VSDC headers will be populated by the user later via env/config.
 */

class KRAETimsService {
    constructor() {
        this.tisName = 'Whiz POS';
        this.tisVersion = '7.1.0';
        
        // Defaults to be overridden by config
        this.apiUrl = process.env.KRA_ETIMS_URL || 'https://etims-api-sbx.kra.go.ke/etims-api'; // Sandbox fallback
        this.productionUrl = 'https://etims-api.kra.go.ke/etims-api';
        this.qrBaseUrl = process.env.KRA_QR_BASE_URL || 'https://etims-sbx.kra.go.ke/common/link/etims/receipt/indexEtimsReceiptData?Data=';
        this.productionQrBaseUrl = 'https://etims.kra.go.ke/common/link/etims/receipt/indexEtimsReceiptData?Data=';
        this.pin = process.env.KRA_PIN || '';
        this.branchId = process.env.KRA_BRANCH_ID || '00';
        this.cmcKey = process.env.KRA_CMC_KEY || ''; // Communication key
        
        // Ensure queue directory exists
        this.queueDir = path.join(app.getPath('userData'), 'etims_queue');
    }

    async init() {
        try {
            await fs.mkdir(this.queueDir, { recursive: true });
        } catch (e) {
            console.error('[KRA] Failed to create queue directory:', e);
        }
    }

    /**
     * Helper to generate KRA required headers (Encryption/Signatures)
     */
    _getHeaders(payload) {
        // Core structure for KRA headers. Actual encryption logic depends on the specific VSDC/OSCU API docs.
        return {
            'Content-Type': 'application/json',
            'tin': this.pin,
            'bhfId': this.branchId,
            'tisName': this.tisName,
            'tisVersion': this.tisVersion,
            // 'cmcKey': this.cmcKey, // Often used for signing the payload
        };
    }

    /**
     * Map internal tax classes to KRA Tax Types
     * A: 16% (VAT)
     * B: 0% (Zero Rated)
     * C: Exempt
     * E: 8% (Other)
     */
    mapTaxType(taxRate) {
        if (taxRate === 16) return 'A';
        if (taxRate === 8) return 'E';
        if (taxRate === 0) return 'B'; // Or C depending on exemption status, default to Zero for now
        return 'C'; // Exempt
    }

    /**
     * Formats a Whiz POS transaction into a KRA eTIMS Save Invoice Request
     */
    formatInvoicePayload(transaction, products) {
        const trdDt = new Date(transaction.date || Date.now());
        const formattedDate = trdDt.toISOString().replace(/T/, '').replace(/-|:/g, '').substring(0, 14); // YYYYMMDDHHMMSS format typical for KRA

        let totTaxAmt = 0;
        let totAmt = 0;

        const itemList = transaction.items.map((item, index) => {
            // Find full product details to get tax classification if needed
            const product = products.find(p => p.id === item.productId) || {};
            
            const taxClass = this.mapTaxType(product.taxRate || 16);
            const qty = item.quantity;
            const price = item.price;
            const amount = qty * price;
            
            // Assuming inclusive tax for simplicity in core feature
            const taxRate = product.taxRate || 16;
            const taxAmt = (amount * taxRate) / (100 + taxRate);

            totTaxAmt += taxAmt;
            totAmt += amount;

            return {
                itemSeq: index + 1,
                itemCd: product.itemCode || 'HS000000', // HS Code required by KRA
                itemNm: item.name,
                pkgUnitCd: 'NT', // Net weight/Count
                qty: qty,
                prc: price,
                splyAmt: amount - taxAmt,
                taxAmt: taxAmt,
                totAmt: amount,
                taxTyCd: taxClass
            };
        });

        return {
            invcNo: transaction.id || transaction.transactionId,
            orgInvcNo: 0,
            custTin: transaction.customerPin || '', // B2B requirement
            custNm: transaction.customerName || 'Walk-in',
            salesTyCd: 'N', // N=Normal, C=Copy, R=Return
            rcptTyCd: 'S',  // S=Sale, R=Refund
            pmtTyCd: '01',  // 01=Cash, 02=Credit, 03=Mobile (M-Pesa)
            trdDt: formattedDate,
            totItemCnt: transaction.items.length,
            totTaxableAmt: totAmt - totTaxAmt,
            totTaxAmt: totTaxAmt,
            totAmt: totAmt,
            itemList: itemList
        };
    }

    /**
     * Submit Invoice to KRA eTIMS API
     */
    async submitInvoice(transaction, products, businessSetup) {
        // Extract settings from businessSetup if provided, fallback to class defaults
        const settings = businessSetup?.settings || {};
        // Support both local-server naming (kraPin/kraToken) and webportal naming (etimsPin/etimsToken)
        const kraPin = settings.etimsPin || settings.kraPin || this.pin;
        const kraToken = settings.etimsToken || settings.kraToken || this.cmcKey;
        const branchId = settings.etimsBranch || settings.etimsBranchId || this.branchId || '00';
        const deviceSerial = settings.etimsSerial || settings.etimsDeviceSerial || 'WHIZPOS-V7.1.0';
        const etimsUrl = settings.etimsUrl || this.apiUrl; // e.g. https://etims-api-sbx.kra.go.ke/etims-api
        const qrBase = etimsUrl.includes('-sbx') ? this.qrBaseUrl : this.productionQrBaseUrl;

        if (!kraPin || !kraToken) {
            console.warn('[KRA] eTIMS credentials missing. Queueing invoice locally.');
            return this.queueInvoice(transaction, products);
        }

        const payload = this.formatInvoicePayload(transaction, products);
        payload.tin = kraPin;
        payload.bhfId = branchId;

        try {
            console.log(`[KRA] Submitting Invoice ${payload.invcNo} to ${etimsUrl}...`);
            
            const response = await fetch(`${etimsUrl}/trnsSales/saveSales`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'tin': kraPin,
                    'bhfId': branchId,
                    'cmcKey': kraToken
                },
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            console.log(`[KRA] Response for ${payload.invcNo}:`, JSON.stringify(result));
            
            if (result.resultCd === '000') {
                // Build the QR code URL using the KRA QR base + internal receipt data
                const qrData = result.data?.intrlData || result.data?.rcptNo || payload.invcNo;
                return {
                    success: true,
                    kraInvoiceNo: result.data?.rcptNo || `KRA-${payload.invcNo}`,
                    qrCode: `${qrBase}${encodeURIComponent(qrData)}`,
                    signature: result.data?.rcptSign || '',
                    scuInvcNo: result.data?.scuInvcNo || '',
                    scuReceipt: result.data || {}
                };
            } else {
                throw new Error(`KRA Error ${result.resultCd}: ${result.resultMsg}`);
            }

        } catch (error) {
            console.error(`[KRA] Failed to submit invoice ${payload.invcNo}:`, error.message);
            await this.queueInvoice(transaction, products);
            return { success: false, queued: true, error: error.message };
        }
    }

    /**
     * Save to local file queue for background syncing
     */
    async queueInvoice(transaction, products) {
        try {
            await fs.access(this.queueDir);
        } catch {
            await fs.mkdir(this.queueDir, { recursive: true });
        }
        
        const fileName = `queue_${transaction.id || transaction.transactionId}.json`;
        const filePath = path.join(this.queueDir, fileName);
        const payload = {
            transaction,
            products,
            queuedAt: new Date().toISOString()
        };
        await fs.writeFile(filePath, JSON.stringify(payload, null, 2));
        console.log(`[KRA] Invoice queued at ${filePath}`);
    }

    /**
     * Process the offline queue
     */
    async syncQueue() {
        if (!this.pin || !this.cmcKey) return; // Cannot sync without credentials

        try {
            const files = await fs.readdir(this.queueDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(this.queueDir, file);
                    const content = await fs.readFile(filePath, 'utf-8');
                    const { transaction, products } = JSON.parse(content);

                    const result = await this.submitInvoice(transaction, products);
                    if (result.success) {
                        await fs.unlink(filePath);
                        console.log(`[KRA] Successfully synced queued invoice: ${file}`);
                    }
                }
            }
        } catch (error) {
            console.error('[KRA] Queue sync error:', error);
        }
    }
}

module.exports = new KRAETimsService();
