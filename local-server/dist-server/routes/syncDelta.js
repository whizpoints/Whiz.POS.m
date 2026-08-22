import { Router } from 'express';
import prisma from '../prisma.js';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
const router = Router();
// const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
// Middleware to authenticate sync requests
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    let apiKey = req.headers['x-api-key'];
    if (apiKey === 'null' || apiKey === 'undefined')
        apiKey = undefined;
    console.log('[SyncDelta Auth] Path:', req.path, 'Headers:', req.headers);
    if (apiKey) {
        // Check if it's a Business API Key
        let business = await prisma.business.findFirst({ where: { apiKey } });
        let outletId = undefined;
        let locationId = undefined;
        let terminalName = undefined;
        // If not a business, check if it's a Terminal API Key
        if (!business) {
            const terminal = await prisma.terminal.findFirst({ where: { apiKey } });
            if (terminal) {
                terminalName = terminal.name;
                // Find the LATEST outlet created for this terminal by matching name
                const outlet = await prisma.outlet.findFirst({
                    where: { name: terminal.name },
                    orderBy: { createdAt: 'desc' }
                });
                if (outlet) {
                    business = await prisma.business.findUnique({ where: { id: outlet.businessId } });
                    outletId = outlet.id;
                    locationId = outlet.locationId;
                }
            }
        }
        if (!business) {
            return res.status(401).json({ error: 'Invalid API Key' });
        }
        req.user = { businessId: business.id, outletId, locationId, terminalName };
        return next();
    }
    if (!authHeader) {
        return res.status(401).json({ error: 'Missing authorization header or API key' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    }
    catch (err) {
        console.error('[SyncDelta Auth] JWT Verification failed:', err);
        return res.status(401).json({ error: 'Invalid or expired token', details: String(err) });
    }
};
router.use(authenticate);
// 1. GET /api/sync/delta?since={timestamp} (PULL)
router.get('/', async (req, res) => {
    try {
        const { businessId, terminalName } = req.user;
        const since = req.query.since;
        if (!since)
            return res.status(400).json({ error: 'Missing "since" timestamp parameter' });
        const sinceDate = new Date(since);
        const locationId = req.user.locationId || req.query.locationId;
        const outletId = req.user.outletId || req.query.outletId;
        const [users, products, categories, inventory, customers, suppliers, business, outlets, terminals] = await Promise.all([
            // Strict user filtering: Admin/Manager or explicitly assigned to this outlet
            prisma.user.findMany({
                where: {
                    businessId,
                    updatedAt: { gt: sinceDate },
                    ...(outletId ? { OR: [{ outletId: outletId }, { role: 'ADMIN' }] } : {})
                }
            }),
            // Products only sync if they have inventory specifically assigned to this outlet
            prisma.product.findMany({
                where: {
                    businessId,
                    ...(outletId ? { inventory: { some: { outletId: outletId } } } : {}),
                    OR: [
                        { updatedAt: { gt: sinceDate } },
                        { inventory: { some: { updatedAt: { gt: sinceDate }, outletId: outletId ? String(outletId) : undefined } } }
                    ]
                }
            }),
            prisma.category.findMany({ where: { businessId, updatedAt: { gt: sinceDate } } }),
            // Inventory is strictly filtered by outlet
            prisma.productInventory.findMany({
                where: {
                    updatedAt: { gt: sinceDate },
                    outletId: outletId ? String(outletId) : undefined,
                    product: { businessId } // Ensure it belongs to the business
                }
            }),
            prisma.customer.findMany({ where: { businessId, updatedAt: { gt: sinceDate } } }),
            prisma.supplier.findMany({ where: { businessId, updatedAt: { gt: sinceDate } } }),
            prisma.business.findUnique({ where: { id: businessId } }),
            prisma.outlet.findMany({ where: { businessId, updatedAt: { gt: sinceDate } } }),
            prisma.terminal.findMany({ where: { updatedAt: { gt: sinceDate } } })
        ]);
        // Map stock into products for legacy compatibility
        const enrichedProducts = products.map((p) => {
            const inv = inventory.find((i) => i.productId === p.id);
            return { ...p, stock: inv ? inv.stock : 0 };
        });
        // Format businessSetup for POS client expectations
        let formattedBusinessSetup = null;
        if (business && business.updatedAt > sinceDate) {
            let settings = {};
            try {
                settings = JSON.parse(business.settings || '{}');
            }
            catch (e) { }
            formattedBusinessSetup = {
                businessId: business.id,
                businessName: business.name,
                ...(terminalName ? { terminalName } : {}),
                address: business.address || '',
                phone: business.contact || '',
                email: business.email || '',
                ...settings
            };
        }
        const responsePayload = {
            success: true,
            timestamp: new Date().toISOString(),
            data: {
                users,
                products: enrichedProducts,
                categories,
                inventory,
                customers,
                suppliers,
                transactions: [], // Intentionally empty: fresh terminals do not download historical ledgers
                outlets,
                terminals,
                businessSetup: formattedBusinessSetup
            }
        };
        try {
            await prisma.$executeRaw `
        INSERT INTO "SyncLog" ("id", "businessId", "outletId", "terminal", "type", "status", "details", "createdAt", "updatedAt") 
        VALUES (${randomUUID()}, ${businessId}, ${outletId || null}, ${terminalName || 'Unknown Terminal'}, 'PULL', 'SUCCESS', ${`Pulled ${users.length} users, ${enrichedProducts.length} products`}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
        }
        catch (e) {
            console.error('Raw log error', e);
        }
        res.json(responsePayload);
    }
    catch (error) {
        console.error('Delta Pull error:', error);
        try {
            await prisma.$executeRaw `
        INSERT INTO "SyncLog" ("id", "businessId", "outletId", "terminal", "type", "status", "details", "createdAt", "updatedAt") 
        VALUES (${randomUUID()}, ${req.user?.businessId || null}, ${req.user?.outletId || req.query.outletId || null}, ${req.user?.terminalName || 'Unknown Terminal'}, 'PULL', 'FAILED', ${error instanceof Error ? error.message : String(error)}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
        }
        catch (e) {
            console.error('Raw log error', e);
        }
        res.status(500).json({ error: 'Internal server error during pull sync' });
    }
});
// 2. POST /api/sync/delta (PUSH)
router.post('/', async (req, res) => {
    try {
        const { businessId } = req.user;
        const { users, products, customers, suppliers, transactions, inventoryLogs, businessSetup } = req.body;
        let targetLocationId = undefined;
        let targetOutletId = undefined;
        if (businessSetup?.locationId) {
            const loc = await prisma.storeLocation.findFirst({ where: { id: businessSetup.locationId, businessId } });
            if (loc)
                targetLocationId = loc.id;
        }
        if (businessSetup?.outletId && targetLocationId) {
            const out = await prisma.outlet.findFirst({ where: { id: businessSetup.outletId, locationId: targetLocationId } });
            if (out)
                targetOutletId = out.id;
        }
        const results = {
            users: 0,
            products: 0,
            customers: 0,
            suppliers: 0,
            transactions: 0,
            inventory: 0,
            skipped: 0
        };
        // Helper for conflict resolution
        const resolveConflict = (incoming, existing) => {
            if (!existing || !existing.updatedAt)
                return true;
            if (!incoming.updatedAt)
                return true; // If local has no timestamp, assume newer
            return new Date(incoming.updatedAt) > new Date(existing.updatedAt);
        };
        // 1. Users
        if (users && Array.isArray(users)) {
            for (const u of users) {
                if (!u.name)
                    continue;
                const fallbackEmail = u.email || `${u.name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${u.id}@pos.local`;
                const existing = await prisma.user.findUnique({ where: { email: fallbackEmail } });
                if (resolveConflict(u, existing)) {
                    let role = 'CASHIER';
                    if (u.role === 'SYSTEM_ADMIN' || u.role === 'Admin')
                        role = 'ADMIN';
                    else if (u.role === 'STORE_MANAGER' || u.role === 'Manager')
                        role = 'MANAGER';
                    await prisma.user.upsert({
                        where: { email: fallbackEmail },
                        create: {
                            businessId, locationId: targetLocationId, email: fallbackEmail,
                            password: u.pin || 'pos1234', name: u.name, role: role,
                            updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date()
                        },
                        update: {
                            name: u.name, role: role, locationId: targetLocationId,
                            updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date()
                        }
                    });
                    results.users++;
                }
                else {
                    results.skipped++;
                }
            }
        }
        // 2. Products
        if (products && Array.isArray(products)) {
            for (const p of products) {
                if (!p.name)
                    continue;
                const sku = String(p.sku || p.barcode || p.id);
                const existing = await prisma.product.findFirst({ where: { businessId, sku } });
                if (resolveConflict(p, existing)) {
                    if (existing) {
                        await prisma.product.update({
                            where: { id: existing.id },
                            data: {
                                name: String(p.name), category: p.category ? String(p.category) : null,
                                price: Number(p.price) || 0, costPrice: Number(p.costPrice) || 0,
                                barcode: p.barcode ? String(p.barcode) : null,
                                updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date()
                            }
                        });
                    }
                    else {
                        await prisma.product.create({
                            data: {
                                businessId, sku: String(sku), barcode: p.barcode ? String(p.barcode) : null,
                                name: String(p.name), category: p.category ? String(p.category) : null,
                                price: Number(p.price) || 0, costPrice: Number(p.costPrice) || 0,
                                updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date()
                            }
                        });
                    }
                    results.products++;
                }
                else {
                    results.skipped++;
                }
                // Handle Inventory Stock
                if (targetLocationId && typeof p.stock !== 'undefined') {
                    const finalProduct = await prisma.product.findFirst({ where: { businessId, sku } });
                    if (finalProduct) {
                        const existingInventory = await prisma.productInventory.findFirst({
                            where: { productId: finalProduct.id, locationId: targetLocationId, outletId: targetOutletId || null }
                        });
                        if (resolveConflict(p, existingInventory)) {
                            if (existingInventory) {
                                await prisma.productInventory.update({
                                    where: { id: existingInventory.id },
                                    data: { stock: Number(p.stock) || 0, updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date() }
                                });
                            }
                            else {
                                await prisma.productInventory.create({
                                    data: {
                                        productId: finalProduct.id, locationId: targetLocationId, outletId: targetOutletId || null,
                                        stock: Number(p.stock) || 0, updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date()
                                    }
                                });
                            }
                        }
                    }
                }
            }
        }
        // 3. Transactions (Sales)
        if (transactions && Array.isArray(transactions)) {
            for (const t of transactions) {
                const existing = await prisma.receipt.findFirst({ where: { businessId, receiptNumber: String(t.id) } });
                const rawStatus = (t.status || '').toUpperCase();
                if (resolveConflict(t, existing)) {
                    if (rawStatus !== 'CANCELLED') {
                        let safeStatus = 'COMPLETED';
                        if (rawStatus === 'PENDING' || rawStatus === 'REFUNDED')
                            safeStatus = rawStatus;
                        if (existing) {
                            await prisma.receipt.update({
                                where: { id: existing.id },
                                data: { status: safeStatus, updatedAt: t.updatedAt ? new Date(t.updatedAt) : new Date() }
                            });
                        }
                        else {
                            await prisma.receipt.create({
                                data: {
                                    businessId, locationId: targetLocationId, outletId: targetOutletId || null,
                                    receiptNumber: String(t.id), totalAmount: Number(t.totalAmount || t.total) || 0,
                                    paymentMethod: String(t.paymentMethod || 'CASH'), customerPhone: t.customerPhone ? String(t.customerPhone) : null,
                                    mpesaCode: t.mpesaCode ? String(t.mpesaCode) : null, status: safeStatus,
                                    createdAt: t.timestamp ? new Date(t.timestamp) : undefined,
                                    updatedAt: t.updatedAt ? new Date(t.updatedAt) : new Date()
                                }
                            });
                        }
                        results.transactions++;
                    }
                }
                else {
                    results.skipped++;
                }
            }
        }
        // 4. Customers
        if (customers && Array.isArray(customers)) {
            for (const c of customers) {
                if (!c.name)
                    continue;
                const existing = await prisma.customer.findFirst({ where: { businessId, name: String(c.name) } });
                if (resolveConflict(c, existing)) {
                    if (existing) {
                        await prisma.customer.update({
                            where: { id: existing.id },
                            data: { phone: c.phone ? String(c.phone) : null, email: c.email ? String(c.email) : null, updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date() }
                        });
                    }
                    else {
                        await prisma.customer.create({
                            data: { businessId, name: String(c.name), phone: c.phone ? String(c.phone) : null, email: c.email ? String(c.email) : null, updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date() }
                        });
                    }
                    results.customers++;
                }
                else {
                    results.skipped++;
                }
            }
        }
        // Update business settings if sent and newer
        if (businessSetup) {
            const b = await prisma.business.findUnique({ where: { id: businessId } });
            if (resolveConflict(businessSetup, b)) {
                // We stringify businessSetup because settings in Prisma is a String type
                const settingsString = typeof businessSetup === 'string' ? businessSetup : JSON.stringify(businessSetup);
                await prisma.business.update({
                    where: { id: businessId },
                    data: { settings: settingsString, updatedAt: businessSetup.updatedAt ? new Date(businessSetup.updatedAt) : new Date() }
                });
            }
        }
        const responsePayload = {
            success: true,
            timestamp: new Date().toISOString(),
            message: 'Delta sync processed successfully',
            results
        };
        try {
            await prisma.$executeRaw `
        INSERT INTO "SyncLog" ("id", "businessId", "outletId", "terminal", "type", "status", "details", "createdAt", "updatedAt") 
        VALUES (${randomUUID()}, ${businessId}, ${targetOutletId || req.user?.outletId || req.query.outletId || null}, ${req.user?.terminalName || businessSetup?.terminalName || 'Unknown Terminal'}, 'PUSH', 'SUCCESS', ${`Pushed ${results.users} users, ${results.products} products, ${results.transactions} txns`}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
        }
        catch (e) {
            console.error('Raw log error', e);
        }
        res.json(responsePayload);
    }
    catch (error) {
        console.error('Delta Push error:', error);
        try {
            await prisma.$executeRaw `
        INSERT INTO "SyncLog" ("id", "businessId", "outletId", "terminal", "type", "status", "details", "createdAt", "updatedAt") 
        VALUES (${randomUUID()}, ${req.user?.businessId || null}, ${req.user?.outletId || req.query.outletId || null}, ${req.user?.terminalName || req.body?.businessSetup?.terminalName || 'Unknown Terminal'}, 'PUSH', 'FAILED', ${error instanceof Error ? error.message : String(error)}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
        }
        catch (e) {
            console.error('Raw log error', e);
        }
        res.status(500).json({ error: 'Internal server error during push sync' });
    }
});
// 3. GET /api/sync/logs (Fetch sync logs)
router.get('/logs', async (req, res) => {
    try {
        const { businessId } = req.user;
        // Fetch logs using raw SQL to bypass Prisma Client types missing the new model
        const logs = await prisma.$queryRaw `
      SELECT * FROM "SyncLog" 
      WHERE "businessId" = ${businessId} 
      ORDER BY "createdAt" DESC 
      LIMIT 200
    `;
        // Optionally fetch outlets to enrich the logs with outlet names
        const outlets = await prisma.outlet.findMany({ where: { businessId } });
        const enrichedLogs = logs.map((log) => {
            const outlet = outlets.find(o => o.id === log.outletId);
            return {
                ...log,
                outletName: outlet ? outlet.name : (log.outletId ? 'Unknown Outlet' : 'Global / Unassigned')
            };
        });
        res.json({ success: true, logs: enrichedLogs });
    }
    catch (error) {
        console.error('Fetch sync logs error:', error);
        res.status(500).json({ error: 'Failed to fetch sync logs' });
    }
});
export default router;
