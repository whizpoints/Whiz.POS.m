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
        let settings = {};
        if (businessSetup?.settings) {
            settings = typeof businessSetup.settings === 'string' ? JSON.parse(businessSetup.settings) : businessSetup.settings;
        } else if (businessSetup) {
            settings = businessSetup;
        }

        // Support both local-server naming (kraPin/kraToken) and webportal naming (etimsPin/etimsToken)
        let kraPin = settings.etimsPin || settings.kraPin || businessSetup?.kraPin || businessSetup?.etimsPin || this.pin || '';
        let kraToken = settings.etimsToken || settings.kraToken || businessSetup?.kraToken || businessSetup?.etimsToken || this.cmcKey || '';
        let branchId = settings.etimsBranch || settings.etimsBranchId || businessSetup?.etimsBranch || businessSetup?.branchId || this.branchId || '00';
        let etimsUrl = settings.etimsUrl || businessSetup?.etimsUrl || this.apiUrl; // e.g. https://etims-api-sbx.kra.go.ke/etims-api

        if (!kraPin || kraPin === 'P051000000X') {
            try {
                const fsSync = require('fs');
                const { DatabaseSync } = require('node:sqlite');
                const candidateDbPaths = [
                    path.join(app.getPath('userData'), 'whizpos.db'),
                    path.join(app.getPath('userData'), 'data', 'whizpos.db')
                ];
                for (const dbPath of candidateDbPaths) {
                    if (fsSync.existsSync(dbPath)) {
                        const localDb = new DatabaseSync(dbPath);
                        const row = localDb.prepare("SELECT data FROM businessSetup WHERE id = 'SINGLETON'").get();
                        if (row && row.data) {
                            const parsed = JSON.parse(row.data);
                            kraPin = parsed.kraPin || parsed.etimsPin || kraPin;
                            kraToken = kraToken || parsed.etimsToken || parsed.kraToken;
                            branchId = branchId !== '00' ? branchId : (parsed.etimsBranch || parsed.etimsBranchId || branchId);
                            etimsUrl = etimsUrl !== this.apiUrl ? etimsUrl : (parsed.etimsUrl || etimsUrl);
                            break;
                        }
                    }
                }
                // Also check business-setup.json fallback
                const jsonPath = path.join(app.getPath('userData'), 'business-setup.json');
                if ((!kraPin || kraPin === 'P051000000X') && fsSync.existsSync(jsonPath)) {
                    const rawJson = fsSync.readFileSync(jsonPath, 'utf8');
                    const parsed = JSON.parse(rawJson);
                    kraPin = parsed.kraPin || parsed.etimsPin || kraPin;
                    kraToken = kraToken || parsed.etimsToken || parsed.kraToken;
                    branchId = branchId !== '00' ? branchId : (parsed.etimsBranch || parsed.etimsBranchId || branchId);
                    etimsUrl = etimsUrl !== this.apiUrl ? etimsUrl : (parsed.etimsUrl || etimsUrl);
                }
            } catch (e) {
                console.warn('[KRA] Could not resolve KRA pin from local storage fallback:', e.message);
            }
        }
        kraPin = kraPin || 'P051000000X';
        const deviceSerial = settings.etimsSerial || settings.etimsDeviceSerial || 'WHIZPOS-V7.1.0';
        const qrBase = etimsUrl.includes('-sbx') ? this.qrBaseUrl : this.productionQrBaseUrl;

        const payload = this.formatInvoicePayload(transaction, products);
        payload.tin = kraPin;
        payload.bhfId = branchId;

        if (!kraToken) {
            console.warn('[KRA] eTIMS credentials missing token. Generating sandbox invoice and queuing.');
            await this.queueInvoice(transaction, products);
            const pseudoHash = crypto.createHash('sha256').update(String(payload.invcNo) + Date.now()).digest('hex').substring(0, 16).toUpperCase();
            const qrPayload = `TIN=${kraPin}&BHF=${branchId}&INV=${payload.invcNo}&SIGN=${pseudoHash}`;
            return {
                success: true,
                queued: true,
                kraInvoiceNo: `KRA-SBX-${payload.invcNo}`,
                qrCode: `${qrBase}${encodeURIComponent(qrPayload)}`,
                signature: pseudoHash,
                scuInvcNo: `SCU${Date.now().toString().slice(-6)}`,
                scuReceipt: { rcptNo: `KRA-SBX-${payload.invcNo}` }
            };
        }

        // Determine whether this is an OSCU endpoint or a custom VSCU endpoint
        const normalizedUrl = etimsUrl.replace(/\/+$/, '');
        let primaryEndpoint;
        if (normalizedUrl.endsWith('/saveTrnsSalesOsdc') || normalizedUrl.endsWith('/trnsSales/saveSales')) {
            primaryEndpoint = normalizedUrl;
        } else if (normalizedUrl.includes('kra.go.ke') || !normalizedUrl.includes('localhost')) {
            // Official KRA OSCU endpoint
            primaryEndpoint = `${normalizedUrl}/saveTrnsSalesOsdc`;
        } else {
            // Local VSCU middleware default
            primaryEndpoint = `${normalizedUrl}/trnsSales/saveSales`;
        }

        const endpointsToTry = [primaryEndpoint];
        if (primaryEndpoint.endsWith('/saveTrnsSalesOsdc')) {
            endpointsToTry.push(`${normalizedUrl}/trnsSales/saveSales`);
        } else if (primaryEndpoint.endsWith('/trnsSales/saveSales')) {
            endpointsToTry.push(`${normalizedUrl}/saveTrnsSalesOsdc`);
        }

        let result = null;
        let lastError = null;

        try {
            for (const targetUrl of endpointsToTry) {
                try {
                    console.log(`[KRA] Submitting Invoice ${payload.invcNo} to ${targetUrl}...`);
                    const response = await fetch(targetUrl, {
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

                    const responseText = await response.text();
                    if (response.status === 404 && endpointsToTry.length > 1 && targetUrl === endpointsToTry[0]) {
                        console.warn(`[KRA] Endpoint ${targetUrl} returned 404, trying fallback endpoint...`);
                        continue;
                    }

                    try {
                        result = JSON.parse(responseText);
                    } catch (parseErr) {
                        throw new Error(`KRA server (${targetUrl}) returned HTTP ${response.status} non-JSON: ${responseText.slice(0, 150)}`);
                    }

                    if (result && (result.resultCd === '000' || result.resultCd === 0)) {
                        break;
                    } else if (result && result.resultCd) {
                        // KRA returned specific error code
                        throw new Error(`KRA Error ${result.resultCd}: ${result.resultMsg || 'Rejected by eTIMS'}`);
                    }
                } catch (netErr) {
                    lastError = netErr;
                    if (targetUrl === endpointsToTry[0] && endpointsToTry.length > 1) {
                        continue;
                    }
                    throw netErr;
                }
            }

            if (result && (result.resultCd === '000' || result.resultCd === 0)) {
                console.log(`[KRA] Invoice ${payload.invcNo} confirmed by KRA:`, JSON.stringify(result));
                const qrData = result.data?.intrlData || result.data?.rcptNo || payload.invcNo;
                return {
                    success: true,
                    offline: false,
                    kraInvoiceNo: result.data?.rcptNo ? `KRA-${result.data.rcptNo}` : `KRA-${payload.invcNo}`,
                    qrCode: `${qrBase}${encodeURIComponent(qrData)}`,
                    signature: result.data?.rcptSign || '',
                    scuInvcNo: result.data?.scuInvcNo || result.data?.sdcId || `SCU${Date.now().toString().slice(-6)}`,
                    scuReceipt: result.data || {}
                };
            } else {
                throw lastError || new Error('KRA submission returned invalid response');
            }

        } catch (error) {
            console.error(`[KRA] Failed to submit invoice ${payload.invcNo}:`, error.message);
            await this.queueInvoice(transaction, products);
            const pseudoHash = crypto.createHash('sha256').update(String(payload.invcNo) + Date.now()).digest('hex').substring(0, 16).toUpperCase();
            const qrPayload = `TIN=${kraPin}&BHF=${branchId}&INV=${payload.invcNo}&SIGN=${pseudoHash}`;
            return {
                success: false,
                queued: true,
                offline: true,
                offlineReason: error.message,
                kraInvoiceNo: `KRA-OFFLINE-${payload.invcNo}`,
                qrCode: `${qrBase}${encodeURIComponent(qrPayload)}`,
                signature: pseudoHash,
                scuInvcNo: `SCU${Date.now().toString().slice(-6)}`,
                scuReceipt: { rcptNo: `KRA-OFFLINE-${payload.invcNo}`, offlineReason: error.message }
            };
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
     * Helper to resolve current businessSetup
     */
    _resolveSettings(businessSetup) {
        let settings = {};
        if (businessSetup?.settings) {
            settings = typeof businessSetup.settings === 'string' ? JSON.parse(businessSetup.settings) : businessSetup.settings;
        } else if (businessSetup) {
            settings = businessSetup;
        }

        let kraPin = settings.etimsPin || settings.kraPin || businessSetup?.kraPin || businessSetup?.etimsPin || this.pin || '';
        let kraToken = settings.etimsToken || settings.kraToken || businessSetup?.kraToken || businessSetup?.etimsToken || this.cmcKey || '';
        let branchId = settings.etimsBranch || settings.etimsBranchId || businessSetup?.etimsBranch || businessSetup?.branchId || this.branchId || '00';
        let etimsUrl = settings.etimsUrl || businessSetup?.etimsUrl || this.apiUrl;
        let etimsSerial = settings.etimsSerial || settings.etimsDeviceSerial || businessSetup?.etimsSerial || 'WHIZPOS-V7.1.0';

        if (!kraPin || !kraToken) {
            try {
                const fsSync = require('fs');
                const { DatabaseSync } = require('node:sqlite');
                const candidateDbPaths = [
                    path.join(app.getPath('userData'), 'whizpos.db'),
                    path.join(app.getPath('userData'), 'data', 'whizpos.db')
                ];
                for (const dbPath of candidateDbPaths) {
                    if (fsSync.existsSync(dbPath)) {
                        const localDb = new DatabaseSync(dbPath);
                        const row = localDb.prepare("SELECT data FROM businessSetup WHERE id = 'SINGLETON'").get();
                        if (row && row.data) {
                            const parsed = JSON.parse(row.data);
                            kraPin = parsed.kraPin || parsed.etimsPin || kraPin;
                            kraToken = parsed.etimsToken || parsed.kraToken || kraToken;
                            branchId = parsed.etimsBranch || parsed.etimsBranchId || branchId;
                            etimsUrl = parsed.etimsUrl || etimsUrl;
                            etimsSerial = parsed.etimsSerial || parsed.etimsDeviceSerial || etimsSerial;
                            break;
                        }
                    }
                }
            } catch (e) {}
        }

        return { kraPin, kraToken, branchId, etimsUrl, etimsSerial };
    }

    /**
     * Process the offline queue
     */
    async syncQueue(businessSetup) {
        const resolved = this._resolveSettings(businessSetup);
        if (!resolved.kraPin || !resolved.kraToken) {
            console.log('[KRA Queue] Cannot sync queue: PIN or Token not configured');
            return { success: false, error: 'Credentials not configured', synced: 0, pending: 0 };
        }

        try {
            await fs.mkdir(this.queueDir, { recursive: true });
            const files = await fs.readdir(this.queueDir);
            const jsonFiles = files.filter(f => f.startsWith('queue_') && f.endsWith('.json'));
            let syncedCount = 0;
            let failedCount = 0;

            for (const file of jsonFiles) {
                const filePath = path.join(this.queueDir, file);
                try {
                    const content = await fs.readFile(filePath, 'utf-8');
                    const { transaction, products } = JSON.parse(content);

                    const result = await this.submitInvoice(transaction, products, businessSetup);
                    if (result && result.success && !result.offline) {
                        await fs.unlink(filePath);
                        syncedCount++;
                        console.log(`[KRA Queue] Successfully transmitted and cleared queued invoice: ${file}`);
                    } else {
                        failedCount++;
                    }
                } catch (fileErr) {
                    console.error(`[KRA Queue] Error processing ${file}:`, fileErr.message);
                    failedCount++;
                }
            }
            return { success: true, synced: syncedCount, pending: failedCount, total: jsonFiles.length };
        } catch (error) {
            console.error('[KRA] Queue sync error:', error.message);
            return { success: false, error: error.message, synced: 0 };
        }
    }

    /**
     * Ping KRA eTIMS Endpoint
     */
    async ping(businessSetup) {
        const resolved = this._resolveSettings(businessSetup);
        const url = resolved.etimsUrl.replace(/\/+$/, '');
        const startTime = Date.now();

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);

            // selectNoticeList is the standard lightweight ping on KRA OSCU
            const response = await fetch(`${url}/selectNoticeList`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tin: resolved.kraPin || 'PING_TEST' }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const latencyMs = Date.now() - startTime;
            const text = await response.text();
            let parsed = null;
            try { parsed = JSON.parse(text); } catch (e) {}

            return {
                success: true,
                reachable: true,
                status: response.status,
                latencyMs,
                url,
                environment: url.includes('-sbx') ? 'sandbox' : 'production',
                message: parsed?.resultMsg || (response.ok ? 'KRA eTIMS server reachable' : `HTTP ${response.status}`)
            };
        } catch (err) {
            return {
                success: false,
                reachable: false,
                latencyMs: Date.now() - startTime,
                url,
                environment: url.includes('-sbx') ? 'sandbox' : 'production',
                error: err.message || 'Connection timed out'
            };
        }
    }

    /**
     * Initialize / Handshake Device with KRA OSCU
     */
    async initDevice(businessSetup) {
        const resolved = this._resolveSettings(businessSetup);
        const url = resolved.etimsUrl.replace(/\/+$/, '');
        const payload = {
            tin: resolved.kraPin,
            bhfId: resolved.branchId || '00',
            dvcSrlNo: resolved.etimsSerial
        };

        try {
            console.log(`[KRA] Performing device handshake to ${url}/selectInitOsdcInfo with payload:`, JSON.stringify(payload));
            const response = await fetch(`${url}/selectInitOsdcInfo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(8000)
            });

            const text = await response.text();
            let result;
            try {
                result = JSON.parse(text);
            } catch (e) {
                return {
                    success: false,
                    error: `Server returned non-JSON HTTP ${response.status}: ${text.slice(0, 150)}`
                };
            }

            return {
                success: result.resultCd === '000',
                resultCd: result.resultCd,
                resultMsg: result.resultMsg,
                cmcKey: result.data?.cmcKey || null,
                data: result.data || null
            };
        } catch (err) {
            return {
                success: false,
                error: err.message
            };
        }
    }

    /**
     * Get offline queue statistics
     */
    async getStats() {
        try {
            await fs.mkdir(this.queueDir, { recursive: true });
            const files = await fs.readdir(this.queueDir);
            const queued = files.filter(f => f.startsWith('queue_') && f.endsWith('.json'));
            return {
                queuedCount: queued.length,
                queueDir: this.queueDir
            };
        } catch (e) {
            return { queuedCount: 0, queueDir: this.queueDir, error: e.message };
        }
    }
}

module.exports = new KRAETimsService();
