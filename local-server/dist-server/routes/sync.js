// @ts-nocheck
import { Router } from 'express';
import db from '../db.js';
import { randomUUID } from 'crypto';
import * as jwt from 'jsonwebtoken';
import { sendReceiptEmail } from '../services/emailService.js';
import fs from 'fs';
import { getServerConfigPath } from '../paths.js';
const router = Router();
// const prisma = new PrismaClient();
// Middleware to authenticate sync requests
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] || req.headers['X-API-KEY'] || req.headers['x-api-key'.toLowerCase()];
    let businessId = null;
    let outletId = req.headers['x-outlet-id'] || req.query.outletId || null;
    let terminalId = null;
    // 1. Check explicit API Key header
    if (apiKey) {
        const business = await db.selectFrom('Business').selectAll().where('apiKey', '=', apiKey).executeTakeFirst();
        if (business) {
            businessId = business.id;
        }
        else {
            const terminal = await db.selectFrom('Terminal').selectAll().where('apiKey', '=', apiKey).executeTakeFirst();
            if (terminal) {
                terminalId = terminal.id;
                outletId = outletId || terminal.outletId;
                const outlet = terminal.outletId ? await db.selectFrom('Outlet').selectAll().where('id', '=', terminal.outletId).executeTakeFirst() : null;
                if (outlet)
                    businessId = outlet.businessId;
            }
        }
    }
    // 2. Check Bearer token (could be JWT or API Key)
    if (!businessId && authHeader) {
        const token = authHeader.includes(' ') ? authHeader.split(' ')[1] : authHeader;
        const businessByToken = await db.selectFrom('Business').selectAll().where('apiKey', '=', token).executeTakeFirst();
        if (businessByToken) {
            businessId = businessByToken.id;
        }
        else {
            const terminalByToken = await db.selectFrom('Terminal').selectAll().where('apiKey', '=', token).executeTakeFirst();
            if (terminalByToken) {
                terminalId = terminalByToken.id;
                outletId = outletId || terminalByToken.outletId;
                const outlet = terminalByToken.outletId ? await db.selectFrom('Outlet').selectAll().where('id', '=', terminalByToken.outletId).executeTakeFirst() : null;
                if (outlet)
                    businessId = outlet.businessId;
            }
            else {
                try {
                    const payload = jwt.verify(token, (process.env.JWT_SECRET || 'fallback_secret'));
                    businessId = payload.businessId;
                    outletId = outletId || payload.outletId;
                }
                catch (err) { }
            }
        }
    }
    // 3. Guarantee for single-tenant local server appliance: always align to local database
    const defaultBiz = await db.selectFrom('Business').selectAll().executeTakeFirst();
    if (defaultBiz) {
        businessId = defaultBiz.id;
    }
    if (!businessId) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid API Key / Token' });
    }
    req.user = { businessId, outletId, terminalId };
    return next();
};
router.use(authenticate);
// GET /api/sync - Return catalog, inventory, users, and setup for POS client
router.get('/', async (req, res) => {
    try {
        const { businessId } = req.user;
        let targetOutletId = req.query.outletId || req.headers['x-outlet-id'] || req.headers['X-Outlet-Id'] || req.user.outletId;
        if (!targetOutletId && req.user.terminalId) {
            const terminal = await db.selectFrom('Terminal').selectAll().where('id', '=', req.user.terminalId).executeTakeFirst();
            if (terminal?.outletId) {
                targetOutletId = terminal.outletId;
            }
        }
        const [allProducts, allUsers, categories, customers, suppliers, business, locations, mpesaConfig, savedDocuments, clients] = await Promise.all([
            db.selectFrom('Product').selectAll().where('businessId', '=', businessId).execute(),
            db.selectFrom('User').selectAll().where('businessId', '=', businessId).execute(),
            db.selectFrom('Category').selectAll().where('businessId', '=', businessId).execute(),
            db.selectFrom('Customer').selectAll().where('businessId', '=', businessId).execute(),
            db.selectFrom('Supplier').selectAll().where('businessId', '=', businessId).execute(),
            db.selectFrom('Business').selectAll().where('id', '=', businessId).executeTakeFirst(),
            db.selectFrom('StoreLocation').selectAll().where('businessId', '=', businessId).execute(),
            db.selectFrom('MpesaConfig').selectAll().where('businessId', '=', businessId).executeTakeFirst(),
            db.selectFrom('SavedDocument').selectAll().where('businessId', '=', businessId).execute().catch(() => []),
            db.selectFrom('Client').selectAll().where('businessId', '=', businessId).execute().catch(() => [])
        ]);
        let targetOutlet = null;
        if (targetOutletId) {
            targetOutlet = await db.selectFrom('Outlet').selectAll().where('id', '=', targetOutletId).executeTakeFirst();
        }
        let finalProducts = [];
        let finalUsers = [];
        if (targetOutletId) {
            // 1. Scoped to a specific Outlet: ONLY return products explicitly assigned to this outlet
            const outletInventories = await db.selectFrom('ProductInventory')
                .selectAll()
                .where('outletId', '=', targetOutletId)
                .execute();
            const stockMap = new Map();
            for (const inv of outletInventories) {
                stockMap.set(inv.productId, Number(inv.stock) || 0);
            }
            const assignedProductIds = new Set(outletInventories.map(inv => inv.productId));
            finalProducts = allProducts
                .filter(p => assignedProductIds.has(p.id))
                .map(p => ({
                ...p,
                stock: stockMap.get(p.id) ?? 0
            }));
            // Return cashiers assigned to this outlet + Admins/Managers + unassigned cashiers if none assigned yet
            const outletCashiers = allUsers.filter(u => u.outletId === targetOutletId);
            finalUsers = allUsers.filter(u => u.outletId === targetOutletId ||
                u.role?.toUpperCase() === 'ADMIN' ||
                u.role?.toUpperCase() === 'MANAGER' ||
                (outletCashiers.length === 0 && !u.outletId));
        }
        else {
            // 2. Central Store / Unscoped: ONLY return Central Store inventory (outletId is null)
            // STRICT BOUNDARY: Never merge or sum all outlet stocks together!
            let centralInventories = [];
            try {
                centralInventories = await db.selectFrom('ProductInventory')
                    .selectAll()
                    .where('outletId', 'is', null)
                    .execute();
            }
            catch (e) { }
            const stockMap = new Map();
            for (const inv of centralInventories) {
                stockMap.set(inv.productId, Number(inv.stock) || 0);
            }
            finalProducts = allProducts.map((p) => ({
                ...p,
                stock: stockMap.has(p.id) ? stockMap.get(p.id) : 0
            }));
            finalUsers = allUsers;
        }
        res.json({
            success: true,
            outletId: targetOutletId || null,
            outletName: targetOutlet?.name || null,
            products: finalProducts,
            users: finalUsers.map((u) => ({
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                pin: u.pin || '1234',
                locationId: u.locationId,
                outletId: u.outletId
            })),
            categories: categories.map((c) => c.name),
            creditCustomers: customers,
            loyaltyCustomers: [],
            suppliers,
            expenses: [],
            salaries: [],
            clients: clients || [],
            savedDocuments: savedDocuments || [],
            documents: (savedDocuments || []).map((d) => {
                let meta = {};
                try {
                    meta = typeof d.metadata === 'string' ? JSON.parse(d.metadata) : (d.metadata || {});
                }
                catch (e) { }
                let items = [];
                try {
                    items = typeof d.items === 'string' ? JSON.parse(d.items) : (d.items || []);
                }
                catch (e) { }
                return {
                    id: d.id,
                    type: d.type,
                    title: meta.docNumber || d.customerName || `${d.type} - ${d.id}`,
                    data: {
                        docNumber: meta.docNumber || d.id,
                        date: d.date ? d.date.split('T')[0] : '',
                        dueDate: d.dueDate ? d.dueDate.split('T')[0] : '',
                        clientName: d.customerName,
                        clientEmail: d.customerEmail,
                        clientPhone: d.customerPhone,
                        clientAddress: d.customerAddress,
                        items,
                        subtotal: d.subtotal,
                        taxAmount: d.tax,
                        total: d.total,
                        notes: d.notes,
                        status: d.status,
                        ...meta
                    },
                    createdAt: d.createdAt
                };
            }),
            businessSetup: business ? (() => {
                let bSettings = {};
                try {
                    bSettings = typeof business.settings === 'string' ? JSON.parse(business.settings) : (business.settings || {});
                }
                catch (e) { }
                let serverConfig = {};
                try {
                    const cfgPath = getServerConfigPath();
                    if (fs.existsSync(cfgPath)) {
                        serverConfig = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
                    }
                }
                catch (e) { }
                const cloudBaseUrl = (bSettings.backOfficeUrl || serverConfig.backOfficeUrl || process.env.CLOUD_API_URL || 'https://backoffice.whizpoint.app').replace(/\/+$/, '');
                const cloudBusinessId = bSettings.cloudBusinessId || serverConfig.cloudBusinessId || business.id;
                const cloudApiKey = bSettings.backOfficeApiKey || serverConfig.apiKey || serverConfig.cloudToken || business.apiKey;
                const cloudLocationId = targetOutlet?.locationId || bSettings.cloudLocationId || serverConfig.outletId || locations[0]?.id || null;
                const cloudOutletId = targetOutletId || bSettings.outletId || serverConfig.outletId || null;
                // Unique Web Portal URLs for direct offline-first M-Pesa & iTax communication
                const webportalUrl = cloudBaseUrl;
                const mpesaPushUrl = `${cloudBaseUrl}/api/mpesa/stkpush`;
                const mpesaStatusUrl = `${cloudBaseUrl}/api/mpesa/status`;
                const mpesaSearchUrl = `${cloudBaseUrl}/api/mpesa/payments/search?businessId=${cloudBusinessId}`;
                const mpesaConsumeUrl = `${cloudBaseUrl}/api/mpesa/payments/consume`;
                const mpesaQrUrl = `${cloudBaseUrl}/api/mpesa/qrcode`;
                const itaxInvoiceUrl = `${cloudBaseUrl}/api/kra/invoice`;
                const itaxPingUrl = `${cloudBaseUrl}/api/kra/ping`;
                const itaxInitUrl = `${cloudBaseUrl}/api/kra/init-device`;
                const itaxSyncUrl = `${cloudBaseUrl}/api/kra/sync-queue`;
                const kraInvoiceUrl = `${cloudBaseUrl}/api/kra/invoice`;
                const effectivePin = business.kraPin || bSettings.kraPin || bSettings.etimsPin || '';
                const till = mpesaConfig?.tillNumber || bSettings.mpesaTill || bSettings.tillNumber || '';
                const paybill = mpesaConfig?.paybillNumber || bSettings.mpesaPaybill || bSettings.paybillNumber || '';
                const accNum = mpesaConfig?.accountReference || bSettings.mpesaAccountNumber || bSettings.accountNumber || '';
                return {
                    ...bSettings,
                    id: business.id,
                    businessId: business.id,
                    cloudBusinessId,
                    cloudLocationId,
                    cloudOutletId,
                    cloudApiKey,
                    backOfficeUrl: cloudBaseUrl,
                    cloudUrl: cloudBaseUrl,
                    webportalUrl,
                    // M-Pesa Web Portal URLs
                    mpesaPushUrl,
                    mpesaStatusUrl,
                    mpesaSearchUrl,
                    mpesaConsumeUrl,
                    mpesaQrUrl,
                    // iTax / KRA Web Portal URLs
                    itaxInvoiceUrl,
                    itaxPingUrl,
                    itaxInitUrl,
                    itaxSyncUrl,
                    kraInvoiceUrl,
                    kraPingUrl: itaxPingUrl,
                    businessName: business.name || bSettings.businessName,
                    phone: bSettings.phone || business.phone || '',
                    email: bSettings.email || business.email || '',
                    address: bSettings.address || business.address || '',
                    receiptFooter: bSettings.receiptFooter || 'Thank you for your business!',
                    receiptFooterNote: bSettings.receiptFooterNote || '',
                    servedByLabel: bSettings.servedByLabel || bSettings.servedBy || 'Served by',
                    servedBy: bSettings.servedBy || 'Cashier',
                    mpesaTill: till,
                    tillNumber: till,
                    mpesaPaybill: paybill,
                    paybillNumber: paybill,
                    mpesaAccountNumber: accNum,
                    accountNumber: accNum,
                    kraPin: effectivePin,
                    kraEnabled: bSettings.kraEnabled !== undefined ? Boolean(bSettings.kraEnabled) : (bSettings.etimsEnabled !== undefined ? Boolean(bSettings.etimsEnabled) : false),
                    etimsPin: effectivePin,
                    etimsToken: bSettings.etimsToken || bSettings.kraToken || '',
                    etimsBranch: bSettings.etimsBranch || bSettings.etimsBranchId || '00',
                    etimsSerial: bSettings.etimsSerial || bSettings.etimsDeviceSerial || '',
                    etimsUrl: bSettings.etimsUrl || 'https://etims-api-sbx.kra.go.ke/etims-api',
                    etimsEnv: bSettings.etimsEnv || (bSettings.etimsUrl?.includes('-sbx') ? 'sandbox' : 'production'),
                    currency: bSettings.currency || 'KES',
                    onScreenKeyboard: bSettings.onScreenKeyboard ?? false,
                    autoLogoffEnabled: bSettings.autoLogoffEnabled ?? false,
                    autoLogoffMinutes: Number(bSettings.autoLogoffMinutes) || 5,
                    printerPaperWidth: Number(bSettings.printerPaperWidth) || 80,
                    disableReceiptPrinting: bSettings.disableReceiptPrinting ?? false,
                    apiKey: business.apiKey,
                    locationId: targetOutlet?.locationId || locations[0]?.id || bSettings.locationId || null,
                    outletId: targetOutletId || bSettings.outletId || null,
                    outletName: targetOutlet?.name || bSettings.outletName || null,
                    locations,
                    mpesaConfig: mpesaConfig ? {
                        enabled: !!(mpesaConfig.stkEnabled || mpesaConfig.c2bEnabled),
                        backendUrl: cloudBaseUrl,
                        apiKey: cloudApiKey,
                        type: mpesaConfig.merchantType === 'PAYBILL' ? 'Paybill' : 'Till',
                        partyB: mpesaConfig.merchantType === 'PAYBILL' ? mpesaConfig.paybillNumber : mpesaConfig.tillNumber,
                        shortcode: mpesaConfig.shortcode,
                        consumerKey: mpesaConfig.consumerKey,
                        consumerSecret: mpesaConfig.consumerSecret,
                        passkey: mpesaConfig.passkey,
                        environment: mpesaConfig.environment || 'sandbox'
                    } : {
                        enabled: true,
                        backendUrl: cloudBaseUrl,
                        apiKey: cloudApiKey,
                        environment: 'sandbox'
                    },
                    updatedAt: new Date().toISOString(),
                    createdAt: business.createdAt || new Date().toISOString()
                };
            })() : {}
        });
    }
    catch (error) {
        console.error('Fetch sync data error:', error);
        res.status(500).json({ error: 'Failed to fetch sync data: ' + (error.message || error) });
    }
});
// POST /api/sync - Ingest operations from POS queue or transactions payload
router.post('/', async (req, res) => {
    try {
        const { businessId } = req.user;
        const body = req.body;
        let targetLocation = await db.selectFrom('StoreLocation').selectAll().where('businessId', '=', businessId).executeTakeFirst();
        let targetLocationId = targetLocation?.id || null;
        let targetOutletId = req.headers['x-outlet-id'] || req.query.outletId || req.user.outletId || null;
        if (targetOutletId === 'undefined' || targetOutletId === 'null')
            targetOutletId = null;
        if (targetOutletId) {
            const validOutlet = await db.selectFrom('Outlet').select('id').where('id', '=', targetOutletId).executeTakeFirst();
            if (!validOutlet)
                targetOutletId = null;
        }
        const io = req.app.get('io');
        let processedCount = 0;
        // Helper to record a single transaction into DB
        const recordTransaction = async (txn) => {
            if (!txn || !txn.id)
                return null;
            const receiptNumber = String(txn.id || txn.receiptNumber);
            const existing = await db.selectFrom('Receipt').selectAll().where('businessId', '=', businessId).where('receiptNumber', '=', receiptNumber).executeTakeFirst();
            const rawStatus = (txn.status || 'COMPLETED').toUpperCase();
            if (existing) {
                if (rawStatus === 'REFUNDED' || rawStatus === 'CANCELLED') {
                    await db.updateTable('Receipt').set({ status: rawStatus, updatedAt: new Date().toISOString() }).where('id', '=', existing.id).execute();
                }
                return existing;
            }
            if (rawStatus === 'CANCELLED')
                return null;
            const receiptId = String(txn.id) || randomUUID();
            let locId = txn.locationId || targetLocationId;
            let outId = txn.outletId || targetOutletId || null;
            if (outId === 'undefined' || outId === 'null')
                outId = null;
            if (locId === 'undefined' || locId === 'null')
                locId = null;
            if (outId) {
                const outletExists = await db.selectFrom('Outlet').select('id').where('id', '=', outId).executeTakeFirst();
                if (!outletExists)
                    outId = null;
            }
            if (locId) {
                const locExists = await db.selectFrom('StoreLocation').select('id').where('id', '=', locId).executeTakeFirst();
                if (!locExists)
                    locId = targetLocationId;
            }
            const dbReceipt = await db.insertInto('Receipt').values({
                id: receiptId,
                businessId,
                locationId: locId,
                outletId: outId,
                receiptNumber,
                totalAmount: Number(txn.totalAmount || txn.total || 0),
                paymentMethod: String(txn.paymentMethod || 'cash').toLowerCase(),
                customerPhone: txn.customerPhone ? String(txn.customerPhone) : null,
                mpesaCode: txn.mpesaCode ? String(txn.mpesaCode) : null,
                status: (rawStatus === 'PENDING' || rawStatus === 'REFUNDED') ? rawStatus : 'COMPLETED',
                createdAt: txn.timestamp ? new Date(txn.timestamp).toISOString() : new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                cashierName: txn.cashier || txn.cashierName || null
            }).returningAll().executeTakeFirstOrThrow();
            // Insert Items
            const items = txn.items || [];
            const receiptItemsToInsert = items.map((item) => ({
                id: randomUUID(),
                receiptId,
                productName: item.product?.name || item.productName || item.name || 'Unknown',
                quantity: Number(item.quantity) || 1,
                unitPrice: Number(item.product?.price || item.unitPrice || item.price || 0),
                totalPrice: Number(item.totalPrice || item.total || (Number(item.product?.price || item.unitPrice || item.price || 0) * (Number(item.quantity) || 1)))
            }));
            if (receiptItemsToInsert.length > 0) {
                await db.insertInto('ReceiptItem').values(receiptItemsToInsert).execute();
            }
            // Deduct stock & create StockMovement
            for (const item of items) {
                const prodId = item.product?.id || item.productId;
                const qty = Number(item.quantity) || 1;
                if (prodId) {
                    // Record StockMovement
                    try {
                        await db.insertInto('StockMovement').values({
                            id: randomUUID(),
                            businessId,
                            productId: String(prodId),
                            locationId: locId,
                            outletId: outId || null,
                            type: 'SALE',
                            quantity: qty,
                            reference: receiptNumber,
                            timestamp: new Date().toISOString()
                        }).execute();
                    }
                    catch (e) { }
                    // Deduct from ProductInventory
                    let inv = null;
                    if (outId) {
                        inv = await db.selectFrom('ProductInventory')
                            .selectAll()
                            .where('productId', '=', String(prodId))
                            .where('outletId', '=', outId)
                            .executeTakeFirst();
                    }
                    if (!inv && locId) {
                        inv = await db.selectFrom('ProductInventory')
                            .selectAll()
                            .where('productId', '=', String(prodId))
                            .where('locationId', '=', locId)
                            .executeTakeFirst();
                    }
                    if (inv) {
                        const newStock = Math.max(0, (Number(inv.stock) || 0) - qty);
                        await db.updateTable('ProductInventory').set({ stock: newStock }).where('id', '=', inv.id).execute();
                        if (io)
                            io.emit('stock_updated', { productId: prodId, stock: newStock, outletId: outId });
                    }
                }
            }
            return dbReceipt;
        };
        if (Array.isArray(body)) {
            // 1. Array of SyncQueue operations from posStore
            for (const op of body) {
                if (!op || !op.type)
                    continue;
                if (op.type === 'new-transaction' || op.type === 'transaction') {
                    await recordTransaction(op.data);
                    processedCount++;
                }
                else if (op.type === 'update-transaction') {
                    if (op.data?.id && op.data?.updates?.status) {
                        await db.updateTable('Receipt')
                            .set({ status: op.data.updates.status.toUpperCase(), updatedAt: new Date().toISOString() })
                            .where('receiptNumber', '=', String(op.data.id))
                            .execute();
                        processedCount++;
                    }
                }
                else if (op.type === 'delete-transaction') {
                    if (op.data?.id) {
                        await db.deleteFrom('Receipt')
                            .where('id', '=', String(op.data.id))
                            .execute();
                        processedCount++;
                    }
                }
                else if (op.type === 'add-product' || op.type === 'product') {
                    const p = op.data;
                    if (p && p.name) {
                        const sku = String(p.sku || p.barcode || p.id);
                        const prodId = String(p.id || p.productId || randomUUID());
                        const existingProd = await db.selectFrom('Product').selectAll()
                            .where('businessId', '=', businessId)
                            .where(eb => eb.or([eb('id', '=', prodId), eb('sku', '=', sku)]))
                            .executeTakeFirst();
                        if (existingProd) {
                            await db.updateTable('Product').set({
                                name: String(p.name),
                                category: p.category ? String(p.category) : null,
                                price: Number(p.price) || 0,
                                costPrice: Number(p.costPrice) || 0,
                                barcode: p.barcode ? String(p.barcode) : null,
                                updatedAt: new Date().toISOString()
                            }).where('id', '=', existingProd.id).execute();
                        }
                        else {
                            await db.insertInto('Product').values({
                                id: prodId,
                                businessId,
                                sku: String(sku),
                                barcode: p.barcode ? String(p.barcode) : null,
                                name: String(p.name),
                                category: p.category ? String(p.category) : null,
                                price: Number(p.price) || 0,
                                costPrice: Number(p.costPrice) || 0,
                                reorderLevel: Number(p.minStockLevel || 5),
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            }).execute();
                        }
                        const finalProdId = existingProd?.id || prodId;
                        let inv = null;
                        if (targetOutletId) {
                            inv = await db.selectFrom('ProductInventory').selectAll()
                                .where('productId', '=', finalProdId)
                                .where('outletId', '=', targetOutletId)
                                .executeTakeFirst();
                        }
                        if (!inv && targetLocationId) {
                            inv = await db.selectFrom('ProductInventory').selectAll()
                                .where('productId', '=', finalProdId)
                                .where('locationId', '=', targetLocationId)
                                .executeTakeFirst();
                        }
                        const stockVal = Number(p.stock) || 0;
                        if (inv) {
                            if (p.stock !== undefined) {
                                await db.updateTable('ProductInventory').set({
                                    stock: stockVal,
                                    updatedAt: new Date().toISOString()
                                }).where('id', '=', inv.id).execute();
                            }
                        }
                        else {
                            await db.insertInto('ProductInventory').values({
                                id: randomUUID(),
                                productId: finalProdId,
                                locationId: targetLocationId,
                                outletId: targetOutletId || null,
                                stock: stockVal,
                                reorderLevel: Number(p.minStockLevel || 5),
                                updatedAt: new Date().toISOString()
                            }).execute();
                            if (stockVal > 0) {
                                await db.insertInto('StockMovement').values({
                                    id: randomUUID(),
                                    businessId,
                                    productId: finalProdId,
                                    locationId: targetLocationId,
                                    outletId: targetOutletId || null,
                                    type: 'INITIAL',
                                    quantity: stockVal,
                                    reference: 'Initial Stock from POS',
                                    timestamp: new Date().toISOString(),
                                    updatedAt: new Date().toISOString()
                                }).execute().catch(() => { });
                            }
                        }
                        processedCount++;
                    }
                }
                else if (op.type === 'update-product') {
                    const { id, updates } = op.data || {};
                    if (id && updates) {
                        const prod = await db.selectFrom('Product').selectAll()
                            .where('businessId', '=', businessId)
                            .where(eb => eb.or([eb('id', '=', String(id)), eb('sku', '=', String(id))]))
                            .executeTakeFirst();
                        if (prod) {
                            const pUpdates = { updatedAt: new Date().toISOString() };
                            if (updates.name !== undefined)
                                pUpdates.name = String(updates.name);
                            if (updates.price !== undefined)
                                pUpdates.price = Number(updates.price);
                            if (updates.costPrice !== undefined)
                                pUpdates.costPrice = Number(updates.costPrice);
                            if (updates.category !== undefined)
                                pUpdates.category = String(updates.category);
                            if (updates.barcode !== undefined)
                                pUpdates.barcode = String(updates.barcode);
                            await db.updateTable('Product').set(pUpdates).where('id', '=', prod.id).execute();
                            if (updates.stock !== undefined) {
                                let inv = null;
                                if (targetOutletId) {
                                    inv = await db.selectFrom('ProductInventory').selectAll()
                                        .where('productId', '=', prod.id)
                                        .where('outletId', '=', targetOutletId)
                                        .executeTakeFirst();
                                }
                                if (!inv && targetLocationId) {
                                    inv = await db.selectFrom('ProductInventory').selectAll()
                                        .where('productId', '=', prod.id)
                                        .where('locationId', '=', targetLocationId)
                                        .executeTakeFirst();
                                }
                                const newStock = Number(updates.stock) || 0;
                                if (inv) {
                                    const currentStock = Number(inv.stock) || 0;
                                    const diff = newStock - currentStock;
                                    await db.updateTable('ProductInventory').set({
                                        stock: newStock,
                                        updatedAt: new Date().toISOString()
                                    }).where('id', '=', inv.id).execute();
                                    if (diff !== 0) {
                                        await db.insertInto('StockMovement').values({
                                            id: randomUUID(),
                                            businessId,
                                            productId: prod.id,
                                            locationId: targetLocationId,
                                            outletId: targetOutletId || null,
                                            type: diff > 0 ? 'ADJUSTMENT_UP' : 'ADJUSTMENT_DOWN',
                                            quantity: Math.abs(diff),
                                            reference: 'POS Stock Update',
                                            timestamp: new Date().toISOString(),
                                            updatedAt: new Date().toISOString()
                                        }).execute().catch(() => { });
                                    }
                                    if (io)
                                        io.emit('stock_updated', { productId: prod.id, stock: newStock, outletId: targetOutletId });
                                }
                            }
                            processedCount++;
                        }
                    }
                }
                else if (op.type === 'delete-product') {
                    if (op.data?.id) {
                        await db.deleteFrom('Product')
                            .where('businessId', '=', businessId)
                            .where('id', '=', String(op.data.id))
                            .execute();
                        processedCount++;
                    }
                }
                else if (op.type === 'add-inventory-log') {
                    const log = op.data;
                    if (log && log.productId) {
                        try {
                            const movementType = String(log.type || log.reason || 'ADJUSTMENT').toUpperCase();
                            let qty = Number(log.variance !== undefined ? log.variance : log.quantity) || 0;
                            let isDeduction = ['SALE', 'TRANSFER_OUT', 'ADJUSTMENT_DOWN', 'SUBTRACT', 'OUT'].includes(movementType) || qty < 0;
                            let absQty = Math.abs(qty);
                            await db.insertInto('StockMovement').values({
                                id: log.id || randomUUID(),
                                businessId,
                                productId: String(log.productId),
                                locationId: targetLocationId,
                                outletId: targetOutletId || null,
                                type: movementType,
                                quantity: absQty,
                                reference: String(log.reference || log.id || 'SYNC'),
                                timestamp: new Date(log.timestamp || Date.now()).toISOString(),
                                updatedAt: new Date().toISOString()
                            }).execute();
                            // Atomically update ProductInventory
                            const delta = isDeduction ? -absQty : absQty;
                            let inv = null;
                            if (targetOutletId) {
                                inv = await db.selectFrom('ProductInventory')
                                    .selectAll()
                                    .where('productId', '=', String(log.productId))
                                    .where('outletId', '=', targetOutletId)
                                    .executeTakeFirst();
                            }
                            if (!inv && targetLocationId) {
                                inv = await db.selectFrom('ProductInventory')
                                    .selectAll()
                                    .where('productId', '=', String(log.productId))
                                    .where('locationId', '=', targetLocationId)
                                    .executeTakeFirst();
                            }
                            if (inv) {
                                const newStock = Math.max(0, (Number(inv.stock) || 0) + delta);
                                await db.updateTable('ProductInventory').set({
                                    stock: newStock,
                                    updatedAt: new Date().toISOString()
                                }).where('id', '=', inv.id).execute();
                                if (io)
                                    io.emit('stock_updated', { productId: log.productId, stock: newStock, outletId: targetOutletId });
                            }
                            processedCount++;
                        }
                        catch (e) { }
                    }
                }
                else if (op.type === 'add-credit-customer' || op.type === 'update-credit-customer' || op.type === 'customer' || op.type === 'add-loyalty-customer' || op.type === 'update-loyalty-customer') {
                    const cust = op.data;
                    if (cust && cust.name) {
                        const existingCust = await db.selectFrom('Customer').selectAll().where('businessId', '=', businessId).where('name', '=', String(cust.name)).executeTakeFirst();
                        if (existingCust) {
                            await db.updateTable('Customer').set({
                                phone: cust.phone || null,
                                email: cust.email || null,
                                updatedAt: new Date().toISOString()
                            }).where('id', '=', existingCust.id).execute();
                        }
                        else {
                            await db.insertInto('Customer').values({
                                id: randomUUID(),
                                businessId,
                                name: String(cust.name),
                                phone: cust.phone || null,
                                email: cust.email || null,
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            }).execute();
                        }
                        processedCount++;
                    }
                }
                else if (op.type === 'delete-credit-customer') {
                    if (op.data?.id) {
                        await db.deleteFrom('Customer').where('businessId', '=', businessId).where('id', '=', String(op.data.id)).execute();
                        processedCount++;
                    }
                }
                else if (op.type === 'add-supplier' || op.type === 'supplier' || op.type === 'update-supplier') {
                    const supp = op.data;
                    if (supp && supp.name) {
                        const existingSupp = await db.selectFrom('Supplier').selectAll().where('businessId', '=', businessId).where('name', '=', String(supp.name)).executeTakeFirst();
                        if (existingSupp) {
                            await db.updateTable('Supplier').set({
                                contact: supp.contact || supp.phone || null,
                                email: supp.email || null,
                                updatedAt: new Date().toISOString()
                            }).where('id', '=', existingSupp.id).execute();
                        }
                        else {
                            await db.insertInto('Supplier').values({
                                id: randomUUID(),
                                businessId,
                                name: String(supp.name),
                                contact: supp.contact || supp.phone || null,
                                email: supp.email || null,
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            }).execute();
                        }
                        processedCount++;
                    }
                }
                else if (op.type === 'delete-supplier') {
                    if (op.data?.id) {
                        await db.deleteFrom('Supplier').where('businessId', '=', businessId).where('id', '=', String(op.data.id)).execute();
                        processedCount++;
                    }
                }
                else if (op.type === 'update-business-setup') {
                    if (op.data) {
                        await db.updateTable('Business').set({ settings: JSON.stringify(op.data), updatedAt: new Date().toISOString() }).where('id', '=', businessId).execute();
                        processedCount++;
                    }
                }
                else if (op.type === 'save-document' || op.type === 'add-document' || op.type === 'document') {
                    const doc = op.data;
                    if (doc && (doc.id || doc.docNumber)) {
                        const docId = String(doc.id || randomUUID());
                        const d = doc.data || doc;
                        const itemsStr = typeof d.items === 'string' ? d.items : JSON.stringify(d.items || []);
                        const metadataStr = typeof d.metadata === 'string' ? d.metadata : JSON.stringify({
                            docNumber: d.docNumber || doc.title,
                            subject: d.subject,
                            bodyText: d.bodyText,
                            partialAmount: d.partialAmount,
                            settlementDate: d.settlementDate,
                            daysNotice: d.daysNotice,
                            paymentMode: d.paymentMode
                        });
                        const existing = await db.selectFrom('SavedDocument').selectAll().where('businessId', '=', businessId).where('id', '=', docId).executeTakeFirst();
                        if (existing) {
                            await db.updateTable('SavedDocument').set({
                                type: doc.type || d.type || 'INVOICE',
                                date: (d.date ? new Date(d.date) : new Date()).toISOString(),
                                dueDate: d.dueDate ? new Date(d.dueDate).toISOString() : null,
                                customerName: String(d.clientCompany || d.clientName || d.customerName || 'Walk-in'),
                                customerEmail: d.clientEmail || d.customerEmail || null,
                                customerPhone: d.clientPhone || d.customerPhone || null,
                                customerAddress: d.clientAddress || d.customerAddress || null,
                                items: itemsStr,
                                subtotal: Number(d.subtotal) || 0,
                                tax: Number(d.taxAmount || d.tax) || 0,
                                total: Number(d.total) || 0,
                                notes: d.notes || null,
                                status: d.status || 'SAVED',
                                metadata: metadataStr,
                                updatedAt: new Date().toISOString()
                            }).where('id', '=', existing.id).execute();
                        }
                        else {
                            await db.insertInto('SavedDocument').values({
                                id: docId,
                                businessId,
                                type: doc.type || d.type || 'INVOICE',
                                date: (d.date ? new Date(d.date) : new Date()).toISOString(),
                                dueDate: d.dueDate ? new Date(d.dueDate).toISOString() : null,
                                customerName: String(d.clientCompany || d.clientName || d.customerName || 'Walk-in'),
                                customerEmail: d.clientEmail || d.customerEmail || null,
                                customerPhone: d.clientPhone || d.customerPhone || null,
                                customerAddress: d.clientAddress || d.customerAddress || null,
                                items: itemsStr,
                                subtotal: Number(d.subtotal) || 0,
                                tax: Number(d.taxAmount || d.tax) || 0,
                                total: Number(d.total) || 0,
                                notes: d.notes || null,
                                status: d.status || 'SAVED',
                                metadata: metadataStr,
                                createdAt: (doc.createdAt ? new Date(doc.createdAt) : new Date()).toISOString(),
                                updatedAt: new Date().toISOString()
                            }).execute();
                        }
                        processedCount++;
                    }
                }
                else if (op.type === 'delete-document') {
                    if (op.data?.id) {
                        await db.deleteFrom('SavedDocument').where('businessId', '=', businessId).where('id', '=', String(op.data.id)).execute();
                        processedCount++;
                    }
                }
            }
        }
        else if (body && (body.transactions || body.receipts)) {
            // 2. Object containing transactions / receipts list
            const txns = body.transactions || body.receipts || [];
            for (const t of txns) {
                await recordTransaction(t);
                processedCount++;
            }
        }
        if (io) {
            io.emit('dashboard_update', { timestamp: new Date().toISOString() });
        }
        return res.json({ success: true, processedCount });
    }
    catch (err) {
        console.error('POS Sync POST handler error:', err);
        return res.status(500).json({ error: 'Sync processing failed: ' + (err.message || err) });
    }
});
// Push local sales to cloud
router.post('/sales', async (req, res) => {
    try {
        const { businessId } = req.user;
        const { receipts } = req.body;
        const createdReceipts = [];
        for (const receipt of receipts) {
            // Create receipt in DB
            const receiptId = randomUUID();
            const dbReceipt = await db.insertInto('Receipt').values({
                id: receiptId,
                businessId,
                receiptNumber: receipt.receiptNumber,
                totalAmount: receipt.totalAmount,
                paymentMethod: receipt.paymentMethod,
                customerPhone: receipt.customerPhone,
                status: receipt.status || 'COMPLETED',
                cashierName: receipt.cashier || null
            }).returningAll().executeTakeFirstOrThrow();
            const receiptItemsToInsert = (receipt.items || []).map((item) => ({
                id: randomUUID(),
                receiptId,
                productName: item.product?.name || item.productName || 'Unknown',
                quantity: Number(item.quantity) || 1,
                unitPrice: Number(item.product?.price || item.unitPrice || 0),
                totalPrice: Number(item.product?.price || item.unitPrice || 0) * (Number(item.quantity) || 1),
            }));
            if (receiptItemsToInsert.length > 0) {
                await db.insertInto('ReceiptItem').values(receiptItemsToInsert).execute();
            }
            createdReceipts.push(dbReceipt);
            // If email provided (or phone logic later), trigger digital receipt
            if (receipt.customerEmail) {
                const business = await db.selectFrom('Business').selectAll().where('id', '=', businessId).executeTakeFirst();
                const receiptUrl = `${process.env.S3_PUBLIC_URL}/receipts/${dbReceipt.id}.pdf`;
                await sendReceiptEmail(receipt.customerEmail, receipt.customerName || 'Customer', receipt.receiptNumber, receipt.totalAmount, receiptUrl, business?.email || process.env.BREVO_RECEIPTS_FROM_EMAIL);
            }
        }
        res.json({ success: true, syncedCount: createdReceipts.length });
    }
    catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({ error: 'Internal server error during sync' });
    }
});
// Push full POS data to cloud
router.post('/full', (req, res) => {
    const { businessId } = req.user;
    const { users, products, transactions, businessSetup, customers, suppliers, inventoryLogs } = req.body;
    // IMMEDIATELY RETURN to prevent ngrok/Cloudflare 524 timeouts for massive data syncs
    res.status(202).json({ success: true, message: "Sync accepted and processing in background" });
    // Process data in background
    (async () => {
        try {
            let syncedUsers = 0;
            let syncedProducts = 0;
            let syncedSales = 0;
            let syncedCustomers = 0;
            let syncedSuppliers = 0;
            let syncedMovements = 0;
            let defaultLocation = await db.selectFrom('StoreLocation').selectAll().where('businessId', '=', businessId).executeTakeFirst();
            if (!defaultLocation) {
                defaultLocation = await db.insertInto('StoreLocation').values({ id: randomUUID(), businessId, name: 'Main Branch' }).returningAll().executeTakeFirstOrThrow();
            }
            let targetLocationId = defaultLocation.id;
            if (businessSetup?.locationId) {
                const loc = await db.selectFrom('StoreLocation').selectAll().where('id', '=', businessSetup.locationId).where('businessId', '=', businessId).executeTakeFirst();
                if (loc)
                    targetLocationId = loc.id;
            }
            let targetOutletId = null;
            if (businessSetup?.outletId) {
                const out = await db.selectFrom('Outlet').selectAll().where('id', '=', businessSetup.outletId).where('locationId', '=', targetLocationId).executeTakeFirst();
                if (out)
                    targetOutletId = out.id;
            }
            // Sync users (upsert by email)
            if (users && Array.isArray(users)) {
                for (const u of users) {
                    if (!u.name)
                        continue;
                    const fallbackEmail = u.email || `${u.name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${u.id}@pos.local`;
                    // Robust role normalization (handles 'ADMIN', 'admin', 'SYSTEM_ADMIN', etc.)
                    const rawUpper = String(u.role || '').trim().toUpperCase();
                    let role = 'CASHIER';
                    if (['ADMIN', 'SYSTEM_ADMIN', 'ADMINISTRATOR', 'OWNER'].includes(rawUpper)) {
                        role = 'ADMIN';
                    }
                    else if (['MANAGER', 'STORE_MANAGER'].includes(rawUpper)) {
                        role = 'MANAGER';
                    }
                    else if (['SUPER_ADMIN', 'SUPERADMIN'].includes(rawUpper)) {
                        role = 'SUPER_ADMIN';
                    }
                    const existingUser = await db.selectFrom('User').selectAll().where('email', '=', fallbackEmail).executeTakeFirst();
                    if (existingUser) {
                        // Never downgrade an existing Admin/Manager to Cashier on automatic terminal sync
                        const existingRoleUpper = String(existingUser.role || '').trim().toUpperCase();
                        if (role === 'CASHIER' && ['ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(existingRoleUpper)) {
                            role = existingRoleUpper;
                        }
                        await db.updateTable('User').set({
                            name: u.name,
                            role: role,
                            locationId: targetLocationId,
                            updatedAt: new Date().toISOString()
                        }).where('email', '=', fallbackEmail).execute();
                    }
                    else {
                        await db.insertInto('User').values({ id: randomUUID(),
                            businessId,
                            locationId: targetLocationId,
                            email: fallbackEmail,
                            password: u.pin || 'pos1234',
                            name: u.name,
                            role: role,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString() }).execute();
                    }
                    syncedUsers++;
                }
            }
            // Sync products (upsert by sku+businessId)
            if (products && Array.isArray(products)) {
                for (const p of products) {
                    if (!p.name)
                        continue;
                    const sku = String(p.sku || p.barcode || p.id);
                    const existing = await db.selectFrom('Product').selectAll().where('businessId', '=', businessId).where('sku', '=', sku).executeTakeFirst();
                    if (existing) {
                        await db.updateTable('Product').set({
                            name: String(p.name),
                            category: p.category ? String(p.category) : null,
                            price: Number(p.price) || 0,
                            costPrice: Number(p.costPrice) || 0,
                            barcode: p.barcode ? String(p.barcode) : null
                        }).where('id', '=', existing.id).execute();
                    }
                    else {
                        await db.insertInto('Product').values({ id: randomUUID(),
                            businessId,
                            sku: String(sku),
                            barcode: p.barcode ? String(p.barcode) : null,
                            name: String(p.name),
                            category: p.category ? String(p.category) : null,
                            price: Number(p.price) || 0,
                            costPrice: Number(p.costPrice) || 0
                        }).returningAll().executeTakeFirstOrThrow();
                    }
                    // Find newly inserted or updated product ID
                    const finalProduct = await db.selectFrom('Product').selectAll().where('businessId', '=', businessId).where('sku', '=', sku).executeTakeFirst();
                    if (finalProduct) {
                        const existingInventory = await db.selectFrom('ProductInventory').selectAll().where('productId', '=', finalProduct.id).where('locationId', '=', targetLocationId).where('outletId', targetOutletId ? '=' : 'is', targetOutletId ? targetOutletId : null).executeTakeFirst();
                        if (existingInventory) {
                            await db.updateTable('ProductInventory').set({ stock: Number(p.stock) || 0 }).where('id', '=', existingInventory.id).execute();
                        }
                        else {
                            await db.insertInto('ProductInventory').values({ id: randomUUID(),
                                productId: finalProduct.id,
                                locationId: targetLocationId,
                                outletId: targetOutletId || null,
                                stock: Number(p.stock) || 0
                            }).returningAll().executeTakeFirstOrThrow();
                        }
                    }
                    syncedProducts++;
                }
            }
            // Sync sales (transactions)
            if (transactions && Array.isArray(transactions)) {
                for (const t of transactions) {
                    // Check if receipt exists
                    const existing = await db.selectFrom('Receipt').selectAll().where('businessId', '=', businessId).where('receiptNumber', '=', String(t.id)).executeTakeFirst();
                    const rawStatus = (t.status || '').toUpperCase();
                    if (!existing && rawStatus !== 'CANCELLED') {
                        require('fs').appendFileSync('sync-debug.log', JSON.stringify(t) + '\n');
                        let safeStatus = 'COMPLETED';
                        if (rawStatus === 'PENDING' || rawStatus === 'REFUNDED')
                            safeStatus = rawStatus;
                        const receiptId = String(t.id) || randomUUID();
                        await db.insertInto('Receipt').values({ id: receiptId,
                            businessId,
                            locationId: targetLocationId,
                            outletId: targetOutletId || undefined,
                            receiptNumber: String(t.id),
                            totalAmount: Number(t.totalAmount || t.total) || 0,
                            paymentMethod: String(t.paymentMethod || 'CASH'),
                            customerPhone: t.customerPhone ? String(t.customerPhone) : null,
                            mpesaCode: t.mpesaCode ? String(t.mpesaCode) : null,
                            status: safeStatus,
                            createdAt: t.timestamp ? new Date(t.timestamp).toISOString() : new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            cashierName: t.cashier || null }).returningAll().executeTakeFirstOrThrow();
                        const receiptItemsToInsert = (t.items || []).map((item) => ({
                            id: randomUUID(),
                            receiptId,
                            productName: item.product?.name || item.productName || item.name || 'Unknown',
                            quantity: Number(item.quantity) || 1,
                            unitPrice: Number(item.product?.price || item.unitPrice || item.price || 0),
                            totalPrice: Number(item.totalPrice || item.total || ((Number(item.product?.price || item.unitPrice || item.price || 0)) * (Number(item.quantity) || 1)))
                        }));
                        if (receiptItemsToInsert.length > 0) {
                            await db.insertInto('ReceiptItem').values(receiptItemsToInsert).execute();
                        }
                        // Deduct stock for this transaction
                        for (const item of (t.items || [])) {
                            const prodId = item.product?.id || item.productId;
                            const qty = Number(item.quantity) || 1;
                            if (prodId) {
                                let inv = null;
                                if (targetOutletId) {
                                    inv = await db.selectFrom('ProductInventory')
                                        .selectAll()
                                        .where('productId', '=', String(prodId))
                                        .where('outletId', '=', targetOutletId)
                                        .executeTakeFirst();
                                }
                                if (!inv && targetLocationId) {
                                    inv = await db.selectFrom('ProductInventory')
                                        .selectAll()
                                        .where('productId', '=', String(prodId))
                                        .where('locationId', '=', targetLocationId)
                                        .executeTakeFirst();
                                }
                                if (inv) {
                                    await db.updateTable('ProductInventory')
                                        .set({ stock: Math.max(0, (Number(inv.stock) || 0) - qty) })
                                        .where('id', '=', inv.id)
                                        .execute();
                                }
                            }
                        }
                        syncedSales++;
                    }
                }
            }
            // Update settings safely by merging (never raw overwrite or erase existing server settings)
            if (businessSetup) {
                const b = await db.selectFrom('Business').selectAll().where('id', '=', businessId).executeTakeFirst();
                if (b) {
                    let currentSettings = {};
                    try {
                        currentSettings = typeof b.settings === 'string' ? JSON.parse(b.settings) : (b.settings || {});
                    }
                    catch (e) { }
                    const incomingSetup = typeof businessSetup === 'string' ? JSON.parse(businessSetup) : { ...businessSetup };
                    // Strip terminal-specific attributes so terminals don't poison the server
                    delete incomingSetup.apiKey;
                    delete incomingSetup.terminalName;
                    delete incomingSetup.outletId;
                    delete incomingSetup.deviceRole;
                    delete incomingSetup.lanAdminIp;
                    delete incomingSetup.apiUrl;
                    delete incomingSetup.isLoggedIn;
                    delete incomingSetup.isSetup;
                    // Only merge non-empty, non-null values to avoid erasing valid configured server fields
                    const cleanIncoming = {};
                    for (const [k, v] of Object.entries(incomingSetup)) {
                        if (v !== undefined && v !== null && v !== '') {
                            cleanIncoming[k] = v;
                        }
                    }
                    const mergedSettings = { ...currentSettings, ...cleanIncoming };
                    await db.updateTable('Business').set({
                        settings: JSON.stringify(mergedSettings),
                        updatedAt: new Date().toISOString()
                    }).where('id', '=', businessId).execute();
                }
            }
            // Sync M-Pesa config from POS settings
            if (businessSetup.mpesaConfig && businessSetup.mpesaConfig.consumerKey) {
                const mc = businessSetup.mpesaConfig;
                const existingConfig = await db.selectFrom('MpesaConfig').selectAll().where('businessId', '=', businessId).where('locationId', '=', targetLocationId).executeTakeFirst();
                const configData = {
                    businessId,
                    locationId: targetLocationId,
                    merchantType: mc.type === 'Paybill' ? 'PAYBILL' : 'BUY_GOODS',
                    tillNumber: mc.type === 'Till' ? String(mc.partyB || mc.shortcode || '') : null,
                    paybillNumber: mc.type === 'Paybill' ? String(mc.partyB || mc.shortcode || '') : null,
                    accountReference: String(businessSetup.mpesaAccountNumber || ''),
                    environment: mc.environment?.toLowerCase() === 'live' || mc.environment?.toLowerCase() === 'production' ? 'production' : 'sandbox',
                    consumerKey: String(mc.consumerKey),
                    consumerSecret: String(mc.consumerSecret),
                    passkey: String(mc.passkey || ''),
                    shortcode: String(mc.shortcode || mc.partyB || ''),
                    initiatorName: mc.initiatorName ? String(mc.initiatorName) : null,
                    initiatorPassword: mc.initiatorPassword ? String(mc.initiatorPassword) : null
                };
                if (existingConfig) {
                    await db.updateTable('MpesaConfig').set(configData).where('id', '=', existingConfig.id).execute();
                }
                else {
                    await db.insertInto('MpesaConfig').values({ id: randomUUID(), ...configData }).returningAll().executeTakeFirstOrThrow();
                }
            }
            else if (businessSetup.mpesaConsumerKey && businessSetup.mpesaConsumerSecret) {
                // Fallback for legacy POS versions
                const existingConfig = await db.selectFrom('MpesaConfig').selectAll().where('businessId', '=', businessId).where('locationId', '=', targetLocationId).executeTakeFirst();
                const configData = {
                    businessId,
                    locationId: targetLocationId,
                    merchantType: businessSetup.mpesaPaybill ? 'PAYBILL' : 'BUY_GOODS',
                    tillNumber: String(businessSetup.mpesaTill || ''),
                    paybillNumber: String(businessSetup.mpesaPaybill || ''),
                    accountReference: String(businessSetup.mpesaAccountNumber || ''),
                    environment: businessSetup.mpesaEnv === 'live' ? 'production' : 'sandbox',
                    consumerKey: String(businessSetup.mpesaConsumerKey),
                    consumerSecret: String(businessSetup.mpesaConsumerSecret),
                    passkey: String(businessSetup.mpesaPasskey || ''),
                    shortcode: String(businessSetup.mpesaTill || businessSetup.mpesaPaybill || '')
                };
                if (existingConfig) {
                    await db.updateTable('MpesaConfig').set(configData).where('id', '=', existingConfig.id).execute();
                }
                else {
                    await db.insertInto('MpesaConfig').values({ id: randomUUID(), ...configData }).returningAll().executeTakeFirstOrThrow();
                }
            }
            // Sync Customers
            if (customers && Array.isArray(customers)) {
                for (const c of customers) {
                    if (!c.name)
                        continue;
                    const existing = await db.selectFrom('Customer').selectAll().where('businessId', '=', businessId).where('name', '=', String(c.name)).executeTakeFirst();
                    if (existing) {
                        await db.updateTable('Customer').set({
                            phone: c.phone ? String(c.phone) : null,
                            email: c.email ? String(c.email) : null
                        }).where('id', '=', existing.id).execute();
                    }
                    else {
                        await db.insertInto('Customer').values({ id: randomUUID(),
                            businessId,
                            name: String(c.name),
                            phone: c.phone ? String(c.phone) : null,
                            email: c.email ? String(c.email) : null
                        }).returningAll().executeTakeFirstOrThrow();
                    }
                    syncedCustomers++;
                }
            }
            // Sync Suppliers
            if (suppliers && Array.isArray(suppliers)) {
                for (const s of suppliers) {
                    if (!s.name)
                        continue;
                    const existing = await db.selectFrom('Supplier').selectAll().where('businessId', '=', businessId).where('name', '=', String(s.name)).executeTakeFirst();
                    if (existing) {
                        await db.updateTable('Supplier').set({
                            contact: s.phone ? String(s.phone) : (s.contactPerson ? String(s.contactPerson) : null),
                            email: s.email ? String(s.email) : null
                        }).where('id', '=', existing.id).execute();
                    }
                    else {
                        await db.insertInto('Supplier').values({ id: randomUUID(),
                            businessId,
                            name: String(s.name),
                            contact: s.phone ? String(s.phone) : (s.contactPerson ? String(s.contactPerson) : null),
                            email: s.email ? String(s.email) : null
                        }).returningAll().executeTakeFirstOrThrow();
                    }
                    syncedSuppliers++;
                }
            }
            // Sync Inventory Logs to StockMovements
            if (inventoryLogs && Array.isArray(inventoryLogs)) {
                for (const log of inventoryLogs) {
                    const existingLog = await db.selectFrom('StockMovement').selectAll().where('businessId', '=', businessId).where('reference', '=', String(log.reference || log.id)).executeTakeFirst();
                    if (!existingLog) {
                        await db.insertInto('StockMovement').values({ id: randomUUID(),
                            businessId,
                            productId: String(log.productId),
                            locationId: targetLocationId,
                            outletId: targetOutletId,
                            type: log.type || log.reason || 'SALE',
                            quantity: Math.abs(Number(log.variance) || 0),
                            reference: String(log.reference || log.id),
                            timestamp: new Date(log.timestamp || Date.now()).toISOString()
                        }).returningAll().executeTakeFirstOrThrow();
                        // Also deduct from absolute stock in ProductInventory
                        let inventory = await db.selectFrom('ProductInventory').selectAll().where('productId', '=', String(log.productId)).where('locationId', '=', targetLocationId).where('outletId', targetOutletId ? '=' : 'is', targetOutletId ? targetOutletId : null).executeTakeFirst();
                        if (!inventory) {
                            inventory = await db.selectFrom('ProductInventory').selectAll().where('productId', '=', String(log.productId)).where('locationId', '=', targetLocationId).where('outletId', 'is', null).executeTakeFirst();
                        }
                        if (inventory) {
                            await db.updateTable('ProductInventory').set({ stock: Math.max(0, inventory.stock + Number(log.variance || 0)) }).where('id', '=', inventory.id).execute();
                        }
                        syncedMovements++;
                    }
                }
            }
            console.log(`[Background Sync] Success! Users: ${syncedUsers}, Products: ${syncedProducts}, Sales: ${syncedSales}, Customers: ${syncedCustomers}, Suppliers: ${syncedSuppliers}, Movements: ${syncedMovements}`);
        }
        catch (error) {
            console.error('POS Full Background Sync error:', error);
        }
    })();
});
export default router;
