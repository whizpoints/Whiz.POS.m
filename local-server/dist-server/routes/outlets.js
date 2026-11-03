// @ts-nocheck
import express from 'express';
import db from '../db.js';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
const router = express.Router();
const getLocalBusinessId = async (reqUser) => {
    const defaultBiz = await db.selectFrom('Business').select('id').executeTakeFirst();
    return defaultBiz?.id || reqUser?.businessId;
};
const authenticate = async (req, res, next) => {
    const defaultBiz = await db.selectFrom('Business').select('id').executeTakeFirst();
    const defaultBizId = defaultBiz?.id;
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] || req.headers['X-API-KEY'] || req.headers['x-api-key'.toLowerCase()];
    if (apiKey) {
        const business = await db.selectFrom('Business').selectAll().where('apiKey', '=', apiKey).executeTakeFirst();
        if (business) {
            req.user = { businessId: business.id };
            return next();
        }
    }
    if (authHeader) {
        const token = authHeader.includes(' ') ? authHeader.split(' ')[1] : authHeader;
        const businessByToken = await db.selectFrom('Business').selectAll().where('apiKey', '=', token).executeTakeFirst();
        if (businessByToken) {
            req.user = { businessId: businessByToken.id };
            return next();
        }
        try {
            const payload = jwt.verify(token, (process.env.JWT_SECRET || 'fallback_secret'));
            req.user = payload;
            if (defaultBizId)
                req.user.businessId = defaultBizId;
            return next();
        }
        catch (err) {
            try {
                const decoded = jwt.decode(token);
                if (decoded) {
                    req.user = decoded;
                    if (defaultBizId)
                        req.user.businessId = defaultBizId;
                    return next();
                }
            }
            catch (e) { }
        }
    }
    // Fallback for standalone single-tenant server
    if (defaultBizId) {
        req.user = { businessId: defaultBizId };
        return next();
    }
    return res.status(401).json({ error: 'Missing or invalid authorization' });
};
router.use(authenticate);
// 1. Get all outlets for business
router.get('/', async (req, res) => {
    try {
        const businessId = await getLocalBusinessId(req.user);
        const outlets = await db.selectFrom('Outlet').selectAll()
            .where((eb) => eb.or([
            eb('businessId', '=', businessId),
            eb('businessId', 'is', null)
        ]))
            .orderBy('createdAt', 'asc')
            .execute();
        res.json(outlets);
    }
    catch (error) {
        console.error('Outlets GET error:', error);
        res.status(500).json({ error: 'Failed to fetch outlets' });
    }
});
// 2. Explicit location-scoped outlets
router.get('/location/:locationId', async (req, res) => {
    try {
        const businessId = await getLocalBusinessId(req.user);
        const { locationId } = req.params;
        let query = db.selectFrom('Outlet').selectAll()
            .where((eb) => eb.or([
            eb('businessId', '=', businessId),
            eb('businessId', 'is', null)
        ]));
        if (locationId && locationId !== 'ALL') {
            query = query.where('locationId', '=', locationId);
        }
        const outlets = await query.orderBy('createdAt', 'asc').execute();
        res.json(outlets);
    }
    catch (error) {
        console.error('Outlets GET by location error:', error);
        res.status(500).json({ error: 'Failed to fetch outlets' });
    }
});
// 3. Detail by ID
const getOutletDetailHandler = async (req, res) => {
    try {
        const businessId = await getLocalBusinessId(req.user);
        const param = req.params.id;
        if (param === 'ALL') {
            const outlets = await db.selectFrom('Outlet').selectAll()
                .where((eb) => eb.or([
                eb('businessId', '=', businessId),
                eb('businessId', 'is', null)
            ]))
                .orderBy('createdAt', 'asc')
                .execute();
            return res.json(outlets);
        }
        // Check if param is an Outlet ID
        const outlet = await db.selectFrom('Outlet')
            .selectAll()
            .where('id', '=', param)
            .executeTakeFirst();
        if (outlet) {
            const users = await db.selectFrom('User').selectAll().where('outletId', '=', outlet.id).execute();
            const inventory = await db.selectFrom('ProductInventory').selectAll().where('outletId', '=', outlet.id).execute();
            let inventoryWithProducts = [];
            if (inventory.length > 0) {
                const productIds = inventory.map(i => i.productId);
                const products = await db.selectFrom('Product').selectAll().where('id', 'in', productIds).execute();
                const productMap = {};
                for (const p of products) {
                    productMap[p.id] = p;
                }
                inventoryWithProducts = inventory.map(inv => ({
                    ...inv,
                    product: productMap[inv.productId] || null
                }));
            }
            return res.json({
                ...outlet,
                users,
                inventory: inventoryWithProducts
            });
        }
        // Check if param is a Location ID
        const outletsByLoc = await db.selectFrom('Outlet').selectAll()
            .where('locationId', '=', param)
            .orderBy('createdAt', 'asc')
            .execute();
        if (outletsByLoc.length > 0) {
            return res.json(outletsByLoc);
        }
        // Fallback: return all outlets if not found as specific single outlet
        const allOutlets = await db.selectFrom('Outlet').selectAll()
            .where((eb) => eb.or([
            eb('businessId', '=', businessId),
            eb('businessId', 'is', null)
        ]))
            .orderBy('createdAt', 'asc')
            .execute();
        res.json(allOutlets);
    }
    catch (error) {
        console.error('Outlets GET by id error:', error);
        res.status(500).json({ error: 'Failed to fetch outlet details' });
    }
};
router.get('/detail/:id', getOutletDetailHandler);
router.get('/:id', getOutletDetailHandler);
// 4. Create Outlet
router.post('/', async (req, res) => {
    try {
        const businessId = await getLocalBusinessId(req.user);
        let { locationId, name } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'name is required' });
        }
        if (!locationId || locationId === 'ALL') {
            const defaultLoc = await db.selectFrom('StoreLocation').selectAll().where('businessId', '=', businessId).executeTakeFirst();
            locationId = defaultLoc?.id;
        }
        if (!locationId) {
            return res.status(400).json({ error: 'locationId is required' });
        }
        const now = new Date().toISOString();
        const outlet = await db.insertInto('Outlet').values({
            id: randomUUID(),
            businessId,
            locationId,
            name,
            createdAt: now,
            updatedAt: now
        }).returningAll().executeTakeFirstOrThrow();
        res.json(outlet);
    }
    catch (error) {
        console.error('Outlets POST error:', error);
        res.status(500).json({ error: 'Failed to create outlet' });
    }
});
// 5. Update Outlet
router.put('/:id', async (req, res) => {
    try {
        const businessId = await getLocalBusinessId(req.user);
        const now = new Date().toISOString();
        const outlet = await db.updateTable('Outlet')
            .set({ ...req.body, updatedAt: now })
            .where('id', '=', req.params.id)
            .returningAll()
            .executeTakeFirstOrThrow();
        res.json(outlet);
    }
    catch (error) {
        console.error('Outlets PUT error:', error);
        res.status(500).json({ error: 'Failed to update outlet' });
    }
});
// 6. Delete Outlet
router.delete('/:id', async (req, res) => {
    try {
        const outletId = req.params.id;
        const businessId = await getLocalBusinessId(req.user);
        await db.deleteFrom('Outlet')
            .where('id', '=', outletId)
            .execute();
        // Record deletion tombstone in Business.settings so future syncs never resurrect it
        if (businessId) {
            const b = await db.selectFrom('Business').selectAll().where('id', '=', businessId).executeTakeFirst();
            if (b) {
                let settings = {};
                try {
                    settings = typeof b.settings === 'string' ? JSON.parse(b.settings) : (b.settings || {});
                }
                catch (e) { }
                const deletedOutletIds = Array.isArray(settings.deletedOutletIds) ? settings.deletedOutletIds : [];
                if (!deletedOutletIds.includes(outletId)) {
                    deletedOutletIds.push(outletId);
                    settings.deletedOutletIds = deletedOutletIds;
                    await db.updateTable('Business').set({
                        settings: JSON.stringify(settings),
                        updatedAt: new Date().toISOString()
                    }).where('id', '=', businessId).execute();
                }
                // Forward deletion directly to Cloud if connected
                const CLOUD_API = (process.env.CLOUD_API_URL || settings.backOfficeUrl || 'https://backoffice.whizpoint.app').replace(/\/+$/, '');
                const apiKey = settings.backOfficeApiKey || b.apiKey;
                if (CLOUD_API && apiKey) {
                    fetch(`${CLOUD_API}/api/outlets/${outletId}`, {
                        method: 'DELETE',
                        headers: { 'x-api-key': apiKey, 'Authorization': `Bearer ${apiKey}` }
                    }).catch(e => console.error('[Outlets] Forward delete to cloud failed:', e.message));
                }
            }
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Outlets DELETE error:', error);
        res.status(500).json({ error: 'Failed to delete outlet' });
    }
});
// 7. Assign User to Outlet
router.post('/:id/users', async (req, res) => {
    try {
        const { userId } = req.body;
        const outlet = await db.selectFrom('Outlet')
            .selectAll()
            .where('id', '=', req.params.id)
            .executeTakeFirst();
        if (!outlet)
            return res.status(404).json({ error: 'Outlet not found' });
        const now = new Date().toISOString();
        await db.updateTable('User')
            .set({ outletId: req.params.id, updatedAt: now })
            .where('id', '=', userId)
            .execute();
        res.json({ success: true });
    }
    catch (error) {
        console.error('Outlets POST users error:', error);
        res.status(500).json({ error: 'Failed to assign user' });
    }
});
// 8. Remove User from Outlet
router.delete('/:id/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const outlet = await db.selectFrom('Outlet')
            .selectAll()
            .where('id', '=', req.params.id)
            .executeTakeFirst();
        if (!outlet)
            return res.status(404).json({ error: 'Outlet not found' });
        const now = new Date().toISOString();
        await db.updateTable('User')
            .set({ outletId: null, updatedAt: now })
            .where('id', '=', userId)
            .execute();
        res.json({ success: true });
    }
    catch (error) {
        console.error('Outlets DELETE users error:', error);
        res.status(500).json({ error: 'Failed to remove user' });
    }
});
// 9. Assign product
router.post('/:id/products', async (req, res) => {
    try {
        const businessId = await getLocalBusinessId(req.user);
        const { productId, locationId, stock = 0 } = req.body;
        const outletId = req.params.id;
        const outlet = await db.selectFrom('Outlet')
            .selectAll()
            .where('id', '=', outletId)
            .executeTakeFirst();
        if (!outlet)
            return res.status(404).json({ error: 'Outlet not found' });
        let targetLocationId = locationId || outlet.locationId;
        if (!targetLocationId) {
            const loc = await db.selectFrom('StoreLocation').selectAll().where('businessId', '=', businessId).executeTakeFirst();
            if (loc)
                targetLocationId = loc.id;
        }
        if (!targetLocationId)
            return res.status(400).json({ error: 'No location available for inventory' });
        const existing = await db.selectFrom('ProductInventory')
            .selectAll()
            .where('productId', '=', productId)
            .where('outletId', '=', outletId)
            .executeTakeFirst();
        if (existing) {
            return res.status(400).json({ error: 'Product is already assigned to this outlet' });
        }
        const requestedQty = Number(stock) || 0;
        if (requestedQty < 0)
            return res.status(400).json({ error: 'Assigned stock cannot be negative' });
        // STRICT VALIDATION: Check Central Store Stock (where outletId is null)
        const centralInv = await db.selectFrom('ProductInventory')
            .selectAll()
            .where('productId', '=', productId)
            .where('outletId', 'is', null)
            .executeTakeFirst();
        const centralStock = centralInv ? Number(centralInv.stock || 0) : 0;
        if (requestedQty > centralStock) {
            return res.status(400).json({
                error: `Cannot assign ${requestedQty} units: Central Store only has ${centralStock} units available`
            });
        }
        const now = new Date().toISOString();
        if (requestedQty > 0 && centralInv) {
            await db.updateTable('ProductInventory')
                .set({ stock: centralStock - requestedQty, updatedAt: now })
                .where('id', '=', centralInv.id)
                .execute();
        }
        const newInvId = randomUUID();
        await db.insertInto('ProductInventory').values({
            id: newInvId,
            productId,
            outletId,
            locationId: targetLocationId,
            stock: requestedQty,
            updatedAt: now
        }).execute();
        await db.updateTable('Product')
            .set({ updatedAt: now })
            .where('id', '=', productId)
            .execute();
        if (requestedQty > 0) {
            await db.insertInto('StockMovement').values({
                id: randomUUID(),
                businessId,
                productId,
                locationId: targetLocationId,
                outletId,
                type: 'INITIAL',
                quantity: requestedQty,
                sourceTerminal: 'SERVER',
                reference: 'Product assigned from Central Store',
                updatedAt: now
            }).execute();
        }
        const io = req.app.get('io');
        if (io) {
            io.emit('stock_updated', { productId, outletId, stock: Number(stock) });
        }
        res.json({ success: true, inventoryId: newInvId });
    }
    catch (error) {
        console.error('Outlets POST products error:', error);
        res.status(500).json({ error: 'Failed to assign product' });
    }
});
// 10. Batch assign products
router.post('/:id/products/batch', async (req, res) => {
    try {
        const businessId = await getLocalBusinessId(req.user);
        const { productIds, locationId, stock = 0 } = req.body;
        const outletId = req.params.id;
        if (!Array.isArray(productIds)) {
            return res.status(400).json({ error: 'productIds must be an array' });
        }
        const outlet = await db.selectFrom('Outlet')
            .selectAll()
            .where('id', '=', outletId)
            .executeTakeFirst();
        if (!outlet)
            return res.status(404).json({ error: 'Outlet not found' });
        let targetLocationId = locationId || outlet.locationId;
        if (!targetLocationId) {
            const loc = await db.selectFrom('StoreLocation').selectAll().where('businessId', '=', businessId).executeTakeFirst();
            if (loc)
                targetLocationId = loc.id;
        }
        if (!targetLocationId)
            return res.status(400).json({ error: 'No location available for inventory' });
        const requestedQty = Number(stock) || 0;
        if (requestedQty < 0)
            return res.status(400).json({ error: 'Assigned stock cannot be negative' });
        // STRICT VALIDATION: Verify all products against Central Store stock
        if (requestedQty > 0) {
            for (const pid of productIds) {
                const centralInv = await db.selectFrom('ProductInventory')
                    .selectAll()
                    .where('productId', '=', pid)
                    .where('outletId', 'is', null)
                    .executeTakeFirst();
                const avail = centralInv ? Number(centralInv.stock || 0) : 0;
                if (requestedQty > avail) {
                    const prod = await db.selectFrom('Product').selectAll().where('id', '=', pid).executeTakeFirst();
                    return res.status(400).json({
                        error: `Cannot assign ${requestedQty} units of ${prod?.name || 'product'}: Central Store only has ${avail} units available`
                    });
                }
            }
        }
        let addedCount = 0;
        const now = new Date().toISOString();
        for (const productId of productIds) {
            const existing = await db.selectFrom('ProductInventory')
                .selectAll()
                .where('productId', '=', productId)
                .where('outletId', '=', outletId)
                .executeTakeFirst();
            if (!existing) {
                if (requestedQty > 0) {
                    const centralInv = await db.selectFrom('ProductInventory')
                        .selectAll()
                        .where('productId', '=', productId)
                        .where('outletId', 'is', null)
                        .executeTakeFirst();
                    if (centralInv) {
                        await db.updateTable('ProductInventory')
                            .set({ stock: Number(centralInv.stock || 0) - requestedQty, updatedAt: now })
                            .where('id', '=', centralInv.id)
                            .execute();
                    }
                }
                await db.insertInto('ProductInventory').values({
                    id: randomUUID(),
                    productId,
                    outletId,
                    locationId: targetLocationId,
                    stock: requestedQty,
                    updatedAt: now
                }).execute();
                await db.updateTable('Product')
                    .set({ updatedAt: now })
                    .where('id', '=', productId)
                    .execute();
                if (requestedQty > 0) {
                    await db.insertInto('StockMovement').values({
                        id: randomUUID(),
                        businessId,
                        productId,
                        locationId: targetLocationId,
                        outletId,
                        type: 'INITIAL',
                        quantity: requestedQty,
                        sourceTerminal: 'SERVER',
                        reference: 'Batch assigned from Central Store',
                        updatedAt: now
                    }).execute();
                }
                addedCount++;
            }
        }
        const io = req.app.get('io');
        if (io) {
            io.emit('stock_updated', { outletId });
        }
        res.json({ success: true, addedCount });
    }
    catch (error) {
        console.error('Outlets POST products batch error:', error);
        res.status(500).json({ error: 'Failed to assign products in batch' });
    }
});
// 11. Adjust Stock for Outlet (Increment / Decrement with Central Store reconciliation)
router.post('/:id/inventory/adjust', async (req, res) => {
    try {
        const businessId = await getLocalBusinessId(req.user);
        const outletId = req.params.id;
        const { inventoryId, amount, type } = req.body;
        const outlet = await db.selectFrom('Outlet')
            .selectAll()
            .where('id', '=', outletId)
            .executeTakeFirst();
        if (!outlet)
            return res.status(404).json({ error: 'Outlet not found' });
        const inventory = await db.selectFrom('ProductInventory')
            .selectAll()
            .where('id', '=', inventoryId)
            .executeTakeFirst();
        if (!inventory)
            return res.status(404).json({ error: 'Inventory record not found' });
        const qty = Number(amount);
        if (isNaN(qty) || qty <= 0) {
            return res.status(400).json({ error: 'Invalid quantity' });
        }
        const now = new Date().toISOString();
        let delta = 0;
        let movementType = 'TRANSFER_IN';
        if (type === 'ADD' || type === 'ADJUSTMENT_UP') {
            // Adding stock to outlet requires pulling from Central Store (outletId is null)
            const centralInv = await db.selectFrom('ProductInventory')
                .selectAll()
                .where('productId', '=', inventory.productId)
                .where('outletId', 'is', null)
                .executeTakeFirst();
            const avail = centralInv ? Number(centralInv.stock || 0) : 0;
            if (qty > avail) {
                return res.status(400).json({
                    error: `Cannot add ${qty} units: Central Store only has ${avail} units available`
                });
            }
            if (centralInv) {
                await db.updateTable('ProductInventory')
                    .set({ stock: avail - qty, updatedAt: now })
                    .where('id', '=', centralInv.id)
                    .execute();
                await db.insertInto('StockMovement').values({
                    id: `mov_out_${Date.now()}_${randomUUID().substring(0, 8)}`,
                    businessId,
                    productId: inventory.productId,
                    locationId: inventory.locationId,
                    outletId: null,
                    type: 'TRANSFER_OUT',
                    quantity: qty,
                    reference: `Transferred to outlet ${outlet.name}`,
                    sourceTerminal: 'SERVER',
                    timestamp: now,
                    updatedAt: now
                }).execute();
            }
            delta = qty;
            movementType = 'TRANSFER_IN';
        }
        else if (type === 'DEDUCT' || type === 'ADJUSTMENT_DOWN') {
            const currentOutletStock = Number(inventory.stock || 0);
            if (currentOutletStock < qty) {
                return res.status(400).json({ error: 'Insufficient stock in outlet to deduct' });
            }
            // Return deducted stock back to Central Store (outletId is null)
            const centralInv = await db.selectFrom('ProductInventory')
                .selectAll()
                .where('productId', '=', inventory.productId)
                .where('outletId', 'is', null)
                .executeTakeFirst();
            if (centralInv) {
                await db.updateTable('ProductInventory')
                    .set({ stock: Number(centralInv.stock || 0) + qty, updatedAt: now })
                    .where('id', '=', centralInv.id)
                    .execute();
            }
            else {
                await db.insertInto('ProductInventory').values({
                    id: randomUUID(),
                    productId: inventory.productId,
                    locationId: inventory.locationId,
                    outletId: null,
                    stock: qty,
                    reorderLevel: 5,
                    updatedAt: now
                }).execute();
            }
            await db.insertInto('StockMovement').values({
                id: `mov_ret_${Date.now()}_${randomUUID().substring(0, 8)}`,
                businessId,
                productId: inventory.productId,
                locationId: inventory.locationId,
                outletId: null,
                type: 'TRANSFER_IN',
                quantity: qty,
                reference: `Returned from outlet ${outlet.name} to Central Store`,
                sourceTerminal: 'SERVER',
                timestamp: now,
                updatedAt: now
            }).execute();
            delta = -qty;
            movementType = 'TRANSFER_OUT';
        }
        else {
            return res.status(400).json({ error: 'Invalid adjustment type' });
        }
        // Update outlet ProductInventory
        const newStock = Number(inventory.stock || 0) + delta;
        await db.updateTable('ProductInventory')
            .set({ stock: newStock, updatedAt: now })
            .where('id', '=', inventoryId)
            .execute();
        await db.updateTable('Product')
            .set({ updatedAt: now })
            .where('id', '=', inventory.productId)
            .execute();
        // Log movement on the outlet side
        await db.insertInto('StockMovement').values({
            id: `adj_${Date.now()}_${randomUUID().substring(0, 8)}`,
            businessId,
            productId: inventory.productId,
            locationId: inventory.locationId,
            outletId,
            type: movementType,
            quantity: qty,
            reference: type === 'ADD' ? 'Transferred from Central Store' : 'Returned to Central Store',
            sourceTerminal: 'SERVER',
            timestamp: now,
            updatedAt: now
        }).execute();
        const io = req.app.get('io');
        if (io) {
            io.emit('stock_updated', {
                type: 'STOCK_ADJUSTMENT',
                outletId,
                productId: inventory.productId,
                stock: newStock,
                delta
            });
        }
        res.json({ success: true, stock: newStock, delta });
    }
    catch (error) {
        console.error('Inventory adjust error:', error);
        res.status(500).json({ error: error.message || 'Failed to adjust stock' });
    }
});
// 12. Update Stock Directly on Outlet Inventory (PUT /:id/inventory/:inventoryId)
router.put('/:id/inventory/:inventoryId', async (req, res) => {
    try {
        const businessId = await getLocalBusinessId(req.user);
        const outletId = req.params.id;
        const { inventoryId } = req.params;
        const { stock: rawStock } = req.body;
        const newStock = parseInt(rawStock, 10);
        if (isNaN(newStock) || newStock < 0) {
            return res.status(400).json({ error: 'Invalid stock level. Must be non-negative integer.' });
        }
        const outlet = await db.selectFrom('Outlet')
            .selectAll()
            .where('id', '=', outletId)
            .executeTakeFirst();
        if (!outlet)
            return res.status(404).json({ error: 'Outlet not found' });
        const inventory = await db.selectFrom('ProductInventory')
            .selectAll()
            .where('id', '=', inventoryId)
            .where('outletId', '=', outletId)
            .executeTakeFirst();
        if (!inventory)
            return res.status(404).json({ error: 'Inventory record not found' });
        const currStock = Number(inventory.stock || 0);
        const delta = newStock - currStock;
        const now = new Date().toISOString();
        if (delta > 0) {
            // Need delta from Central Store
            const centralInv = await db.selectFrom('ProductInventory')
                .selectAll()
                .where('productId', '=', inventory.productId)
                .where('outletId', 'is', null)
                .executeTakeFirst();
            const avail = centralInv ? Number(centralInv.stock || 0) : 0;
            if (delta > avail) {
                return res.status(400).json({
                    error: `Cannot set stock to ${newStock}: Requires +${delta} units, but Central Store only has ${avail} units available`
                });
            }
            if (centralInv) {
                await db.updateTable('ProductInventory')
                    .set({ stock: avail - delta, updatedAt: now })
                    .where('id', '=', centralInv.id)
                    .execute();
                await db.insertInto('StockMovement').values({
                    id: `mov_out_${Date.now()}_${randomUUID().substring(0, 8)}`,
                    businessId,
                    productId: inventory.productId,
                    locationId: inventory.locationId,
                    outletId: null,
                    type: 'TRANSFER_OUT',
                    quantity: delta,
                    reference: `Transferred to outlet ${outlet.name} (Direct set)`,
                    sourceTerminal: 'SERVER',
                    timestamp: now,
                    updatedAt: now
                }).execute();
            }
        }
        else if (delta < 0) {
            // Return excess stock back to Central Store
            const returnQty = Math.abs(delta);
            const centralInv = await db.selectFrom('ProductInventory')
                .selectAll()
                .where('productId', '=', inventory.productId)
                .where('outletId', 'is', null)
                .executeTakeFirst();
            if (centralInv) {
                await db.updateTable('ProductInventory')
                    .set({ stock: Number(centralInv.stock || 0) + returnQty, updatedAt: now })
                    .where('id', '=', centralInv.id)
                    .execute();
            }
            else {
                await db.insertInto('ProductInventory').values({
                    id: randomUUID(),
                    productId: inventory.productId,
                    locationId: inventory.locationId,
                    outletId: null,
                    stock: returnQty,
                    reorderLevel: 5,
                    updatedAt: now
                }).execute();
            }
            await db.insertInto('StockMovement').values({
                id: `mov_ret_${Date.now()}_${randomUUID().substring(0, 8)}`,
                businessId,
                productId: inventory.productId,
                locationId: inventory.locationId,
                outletId: null,
                type: 'TRANSFER_IN',
                quantity: returnQty,
                reference: `Returned from outlet ${outlet.name} to Central Store (Direct set)`,
                sourceTerminal: 'SERVER',
                timestamp: now,
                updatedAt: now
            }).execute();
        }
        await db.updateTable('ProductInventory')
            .set({ stock: newStock, updatedAt: now })
            .where('id', '=', inventoryId)
            .execute();
        await db.updateTable('Product')
            .set({ updatedAt: now })
            .where('id', '=', inventory.productId)
            .execute();
        if (delta !== 0) {
            await db.insertInto('StockMovement').values({
                id: `set_${Date.now()}_${randomUUID().substring(0, 8)}`,
                businessId,
                productId: inventory.productId,
                locationId: inventory.locationId,
                outletId,
                type: delta > 0 ? 'TRANSFER_IN' : 'TRANSFER_OUT',
                quantity: Math.abs(delta),
                reference: `Direct stock level update on outlet`,
                sourceTerminal: 'SERVER',
                timestamp: now,
                updatedAt: now
            }).execute();
        }
        const io = req.app.get('io');
        if (io) {
            io.emit('stock_updated', {
                outletId,
                productId: inventory.productId,
                stock: newStock
            });
        }
        res.json({ success: true, stock: newStock });
    }
    catch (error) {
        console.error('Outlet inventory PUT error:', error);
        res.status(500).json({ error: error.message || 'Failed to update stock' });
    }
});
// 13. Remove Product from Outlet (DELETE /:id/inventory/:inventoryId)
router.delete('/:id/inventory/:inventoryId', async (req, res) => {
    try {
        const businessId = await getLocalBusinessId(req.user);
        const outletId = req.params.id;
        const { inventoryId } = req.params;
        const inventory = await db.selectFrom('ProductInventory')
            .selectAll()
            .where('id', '=', inventoryId)
            .where('outletId', '=', outletId)
            .executeTakeFirst();
        if (!inventory) {
            return res.status(404).json({ error: 'Inventory record not found for this outlet' });
        }
        const remainingStock = Number(inventory.stock || 0);
        const now = new Date().toISOString();
        // If outlet still has stock, return it back to Central Store!
        if (remainingStock > 0) {
            const centralInv = await db.selectFrom('ProductInventory')
                .selectAll()
                .where('productId', '=', inventory.productId)
                .where('outletId', 'is', null)
                .executeTakeFirst();
            if (centralInv) {
                await db.updateTable('ProductInventory')
                    .set({ stock: Number(centralInv.stock || 0) + remainingStock, updatedAt: now })
                    .where('id', '=', centralInv.id)
                    .execute();
            }
            else {
                await db.insertInto('ProductInventory').values({
                    id: randomUUID(),
                    productId: inventory.productId,
                    locationId: inventory.locationId,
                    outletId: null,
                    stock: remainingStock,
                    reorderLevel: 5,
                    updatedAt: now
                }).execute();
            }
            await db.insertInto('StockMovement').values({
                id: `mov_del_${Date.now()}_${randomUUID().substring(0, 8)}`,
                businessId,
                productId: inventory.productId,
                locationId: inventory.locationId,
                outletId: null,
                type: 'TRANSFER_IN',
                quantity: remainingStock,
                reference: `Returned to Central Store on unassigning from outlet`,
                sourceTerminal: 'SERVER',
                timestamp: now,
                updatedAt: now
            }).execute();
        }
        await db.deleteFrom('ProductInventory')
            .where('id', '=', inventoryId)
            .execute();
        await db.updateTable('Product')
            .set({ updatedAt: now })
            .where('id', '=', inventory.productId)
            .execute();
        const io = req.app.get('io');
        if (io) {
            io.emit('stock_updated', { outletId, productId: inventory.productId, unassigned: true });
        }
        res.json({ success: true, message: 'Product unassigned and stock returned to Central Store' });
    }
    catch (error) {
        console.error('Delete outlet inventory error:', error);
        res.status(500).json({ error: error.message || 'Failed to unassign product' });
    }
});
// 14. Force Sync for Outlet (POST /:id/force-sync)
router.post('/:id/force-sync', async (req, res) => {
    try {
        const outletId = req.params.id;
        const now = new Date().toISOString();
        await db.updateTable('Outlet')
            .set({ updatedAt: now })
            .where('id', '=', outletId)
            .execute();
        await db.updateTable('ProductInventory')
            .set({ updatedAt: now })
            .where('outletId', '=', outletId)
            .execute();
        const io = req.app.get('io');
        if (io) {
            io.emit('downward_sync_event', {
                type: 'FORCE_SYNC',
                outletId,
                timestamp: now
            });
            io.emit('stock_updated', { outletId });
        }
        res.json({ success: true, message: 'Outlet data staged for synchronization to POS' });
    }
    catch (error) {
        console.error('Force sync error:', error);
        res.status(500).json({ error: error.message || 'Failed to trigger force sync' });
    }
});
export default router;
