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
        this.apiUrl = process.env.KRA_ETIMS_URL || 'https://sandbox.kra.go.ke/etims/api'; // Sandbox fallback
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
    async submitInvoice(transaction, products) {
        if (!this.pin || !this.cmcKey) {
            console.warn('[KRA] eTIMS credentials missing. Queueing invoice locally.');
            return this.queueInvoice(transaction, products);
        }

        const payload = this.formatInvoicePayload(transaction, products);
        const headers = this._getHeaders(payload);

        try {
            console.log(`[KRA] Submitting Invoice ${payload.invcNo}...`);
            // Actual fetch to be implemented when URL is provided
            /*
            const response = await fetch(`${this.apiUrl}/trnsSales/saveSales`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            
            if (result.resultCd === '000') { // Success code
                return {
                    success: true,
                    kraInvoiceNo: result.data.rcptNo,
                    qrCode: result.data.intrlData, // QR String
                    signature: result.data.rcptSign
                };
            } else {
                throw new Error(`KRA Error: ${result.resultMsg}`);
            }
            */

            // SIMULATED SUCCESS FOR CORE IMPLEMENTATION
            return {
                success: true,
                kraInvoiceNo: `KRA-${payload.invcNo}`,
                qrCode: `https://itax.kra.go.ke/KRA-Portal/invoice?id=${payload.invcNo}`,
                signature: crypto.randomBytes(16).toString('hex').toUpperCase()
            };

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
