import express from 'express';
import db from '../db.js';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader)
        return res.status(401).json({ error: 'Missing authorization header' });
    const token = authHeader.split(' ')[1];
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    }
    catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};
router.use(authenticate);
router.get('/', async (req, res) => {
    try {
        const { businessId } = req.user;
        const outlets = await db.selectFrom('Outlet').selectAll()
            .where('businessId', '=', businessId)
            .orderBy('createdAt', 'asc')
            .execute();
        res.json(outlets);
    }
    catch (error) {
        console.error('Outlets GET error:', error);
        res.status(500).json({ error: 'Failed to fetch outlets' });
    }
});
router.get('/location/:locationId', async (req, res) => {
    try {
        const { businessId } = req.user;
        const { locationId } = req.params;
        let query = db.selectFrom('Outlet').selectAll().where('businessId', '=', businessId);
        if (locationId !== 'ALL') {
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
router.get('/:id', async (req, res) => {
    try {
        const { businessId } = req.user;
        const outlet = await db.selectFrom('Outlet')
            .selectAll()
            .where('id', '=', req.params.id)
            .where('businessId', '=', businessId)
            .executeTakeFirst();
        if (!outlet)
            return res.status(404).json({ error: 'Outlet not found' });
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
        res.json({
            ...outlet,
            users,
            inventory: inventoryWithProducts
        });
    }
    catch (error) {
        console.error('Outlets GET by id error:', error);
        res.status(500).json({ error: 'Failed to fetch outlet details' });
    }
});
router.post('/', async (req, res) => {
    try {
        const { businessId } = req.user;
        const { locationId, name } = req.body;
        if (!locationId) {
            return res.status(400).json({ error: 'locationId is required' });
        }
        if (!name) {
            return res.status(400).json({ error: 'name is required' });
        }
        const outlet = await db.insertInto('Outlet').values({
            id: randomUUID(),
            businessId,
            locationId,
            name
        }).returningAll().executeTakeFirstOrThrow();
        res.json(outlet);
    }
    catch (error) {
        console.error('Outlets POST error:', error);
        res.status(500).json({ error: 'Failed to create outlet' });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const { businessId } = req.user;
        const outlet = await db.updateTable('Outlet')
            .set(req.body)
            .where('id', '=', req.params.id)
            .where('businessId', '=', businessId)
            .returningAll()
            .executeTakeFirstOrThrow();
        res.json(outlet);
    }
    catch (error) {
        console.error('Outlets PUT error:', error);
        res.status(500).json({ error: 'Failed to update outlet' });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const { businessId } = req.user;
        await db.deleteFrom('Outlet')
            .where('id', '=', req.params.id)
            .where('businessId', '=', businessId)
            .execute();
        res.json({ success: true });
    }
    catch (error) {
        console.error('Outlets DELETE error:', error);
        res.status(500).json({ error: 'Failed to delete outlet' });
    }
});
router.post('/:id/users', async (req, res) => {
    try {
        const { businessId } = req.user;
        const { userId } = req.body;
        const outlet = await db.selectFrom('Outlet')
            .selectAll()
            .where('id', '=', req.params.id)
            .where('businessId', '=', businessId)
            .executeTakeFirst();
        if (!outlet)
            return res.status(404).json({ error: 'Outlet not found' });
        await db.updateTable('User')
            .set({ outletId: req.params.id })
            .where('id', '=', userId)
            .execute();
        res.json({ success: true });
    }
    catch (error) {
        console.error('Outlets POST users error:', error);
        res.status(500).json({ error: 'Failed to assign user' });
    }
});
router.delete('/:id/users/:userId', async (req, res) => {
    try {
        const { businessId } = req.user;
        const { userId } = req.params;
        const outlet = await db.selectFrom('Outlet')
            .selectAll()
            .where('id', '=', req.params.id)
            .where('businessId', '=', businessId)
            .executeTakeFirst();
        if (!outlet)
            return res.status(404).json({ error: 'Outlet not found' });
        await db.updateTable('User')
            .set({ outletId: null })
            .where('id', '=', userId)
            .execute();
        res.json({ success: true });
    }
    catch (error) {
        console.error('Outlets DELETE users error:', error);
        res.status(500).json({ error: 'Failed to remove user' });
    }
});
router.post('/:id/products', async (req, res) => {
    try {
        const { businessId } = req.user;
        const { productId, locationId, stock = 0 } = req.body;
        const outletId = req.params.id;
        const outlet = await db.selectFrom('Outlet')
            .selectAll()
            .where('id', '=', outletId)
            .where('businessId', '=', businessId)
            .executeTakeFirst();
        if (!outlet)
            return res.status(404).json({ error: 'Outlet not found' });
        let targetLocationId = locationId;
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
            .where('locationId', '=', targetLocationId)
            .executeTakeFirst();
        if (existing) {
            return res.status(400).json({ error: 'Product is already assigned to this outlet' });
        }
        await db.insertInto('ProductInventory').values({
            id: randomUUID(),
            productId,
            outletId,
            locationId: targetLocationId,
            stock: Number(stock)
        }).execute();
        if (Number(stock) > 0) {
            await db.insertInto('StockMovement').values({
                id: randomUUID(),
                businessId,
                productId,
                locationId: targetLocationId,
                outletId,
                type: 'INITIAL',
                quantity: Number(stock),
                sourceTerminal: 'SERVER',
                reference: 'Product assigned to outlet'
            }).execute();
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Outlets POST products error:', error);
        res.status(500).json({ error: 'Failed to assign product' });
    }
});
router.post('/:id/products/batch', async (req, res) => {
    try {
        const { businessId } = req.user;
        const { productIds, locationId, stock = 0 } = req.body;
        const outletId = req.params.id;
        if (!Array.isArray(productIds)) {
            return res.status(400).json({ error: 'productIds must be an array' });
        }
        const outlet = await db.selectFrom('Outlet')
            .selectAll()
            .where('id', '=', outletId)
            .where('businessId', '=', businessId)
            .executeTakeFirst();
        if (!outlet)
            return res.status(404).json({ error: 'Outlet not found' });
        let targetLocationId = locationId;
        if (!targetLocationId) {
            const loc = await db.selectFrom('StoreLocation').selectAll().where('businessId', '=', businessId).executeTakeFirst();
            if (loc)
                targetLocationId = loc.id;
        }
        if (!targetLocationId)
            return res.status(400).json({ error: 'No location available for inventory' });
        let addedCount = 0;
        for (const productId of productIds) {
            const existing = await db.selectFrom('ProductInventory')
                .selectAll()
                .where('productId', '=', productId)
                .where('outletId', '=', outletId)
                .where('locationId', '=', targetLocationId)
                .executeTakeFirst();
            if (!existing) {
                await db.insertInto('ProductInventory').values({
                    id: randomUUID(),
                    productId,
                    outletId,
                    locationId: targetLocationId,
                    stock: Number(stock)
                }).execute();
                if (Number(stock) > 0) {
                    await db.insertInto('StockMovement').values({
                        id: randomUUID(),
                        businessId,
                        productId,
                        locationId: targetLocationId,
                        outletId,
                        type: 'INITIAL',
                        quantity: Number(stock),
                        sourceTerminal: 'SERVER',
                        reference: 'Product assigned to outlet'
                    }).execute();
                }
                addedCount++;
            }
        }
        res.json({ success: true, addedCount });
    }
    catch (error) {
        console.error('Outlets POST products batch error:', error);
        res.status(500).json({ error: 'Failed to assign products in batch' });
    }
});
router.post('/:id/inventory/adjust', async (req, res) => {
    try {
        const { businessId } = req.user;
        const { inventoryId, amount, type } = req.body;
        const outlet = await db.selectFrom('Outlet')
            .selectAll()
            .where('id', '=', req.params.id)
            .where('businessId', '=', businessId)
            .executeTakeFirst();
        if (!outlet)
            return res.status(404).json({ error: 'Outlet not found' });
        const inventory = await db.selectFrom('ProductInventory')
            .selectAll()
            .where('id', '=', inventoryId)
            .executeTakeFirst();
        if (!inventory)
            return res.status(404).json({ error: 'Inventory record not found' });
        let newStock = inventory.stock;
        if (type === 'ADD')
            newStock += amount;
        else if (type === 'DEDUCT') {
            if (newStock < amount)
                return res.status(400).json({ error: 'Insufficient stock' });
            newStock -= amount;
        }
        else {
            return res.status(400).json({ error: 'Invalid adjustment type' });
        }
        await db.updateTable('ProductInventory')
            .set({ stock: newStock })
            .where('id', '=', inventoryId)
            .execute();
        await db.insertInto('StockMovement').values({
            id: `adj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            businessId,
            productId: inventory.productId,
            locationId: inventory.locationId,
            outletId: req.params.id,
            type: type === 'ADD' ? 'ADJUSTMENT_UP' : 'ADJUSTMENT_DOWN',
            quantity: amount,
            reference: 'Outlet Manual Adjust',
            sourceTerminal: 'SERVER',
            timestamp: new Date().toISOString()
        }).execute();
        res.json({ success: true, stock: newStock });
    }
    catch (error) {
        console.error('Outlets POST inventory adjust error:', error);
        res.status(500).json({ error: 'Failed to adjust stock' });
    }
});
router.post('/:id/force-sync', async (req, res) => {
    try {
        const { businessId } = req.user;
        const outletId = req.params.id;
        const outlet = await db.selectFrom('Outlet')
            .selectAll()
            .where('id', '=', outletId)
            .where('businessId', '=', businessId)
            .executeTakeFirst();
        if (!outlet)
            return res.status(404).json({ error: 'Outlet not found' });
        const now = new Date().toISOString();
        await db.updateTable('ProductInventory')
            .set({ updatedAt: now })
            .where('outletId', '=', outletId)
            .execute();
        await db.updateTable('User')
            .set({ updatedAt: now })
            .where('outletId', '=', outletId)
            .execute();
        await db.updateTable('Outlet')
            .set({ updatedAt: now })
            .where('id', '=', outletId)
            .execute();
        await db.updateTable('Business')
            .set({ updatedAt: now })
            .where('id', '=', req.user.businessId)
            .execute();
        await db.updateTable('Category')
            .set({ updatedAt: now })
            .where('businessId', '=', req.user.businessId)
            .execute();
        res.json({ success: true, message: 'Current data marked for push to terminals' });
    }
    catch (error) {
        console.error('Outlets POST force-sync error:', error);
        res.status(500).json({ error: 'Failed to force sync data' });
    }
});
export default router;
