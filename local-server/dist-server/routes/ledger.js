import express from 'express';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import db from '../db.js';
import { randomUUID } from 'crypto';
const router = express.Router();
// Get stock movements for a business
router.get('/:businessId', async (req, res) => {
    try {
        const { businessId } = req.params;
        const smRecords = await db.selectFrom('StockMovement')
            .selectAll()
            .where('businessId', '=', businessId)
            .orderBy('timestamp', 'desc')
            .limit(100)
            .execute();
        const productIds = [...new Set(smRecords.map(m => m.productId).filter(Boolean))];
        const locationIds = [...new Set(smRecords.map(m => m.locationId).filter(Boolean))];
        const outletIds = [...new Set(smRecords.map(m => m.outletId).filter(Boolean))];
        const [products, locations, outlets] = await Promise.all([
            productIds.length ? db.selectFrom('Product').selectAll().where('id', 'in', productIds).execute() : [],
            locationIds.length ? db.selectFrom('StoreLocation').selectAll().where('id', 'in', locationIds).execute() : [],
            outletIds.length ? db.selectFrom('Outlet').selectAll().where('id', 'in', outletIds).execute() : []
        ]);
        const movements = smRecords.map(sm => ({
            ...sm,
            product: products.find(p => p.id === sm.productId) || null,
            location: locations.find(l => l.id === sm.locationId) || null,
            outlet: outlets.find(o => o.id === sm.outletId) || null
        }));
        res.json(movements);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch ledger' });
    }
});
// Transfer stock from Hub (Location) to Terminal (Outlet)
router.post('/transfer', async (req, res) => {
    try {
        const { businessId, productId, locationId, outletId, quantity } = req.body;
        if (!businessId || !productId || !locationId || !outletId || !quantity) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const qty = parseInt(quantity, 10);
        if (qty <= 0)
            return res.status(400).json({ error: 'Quantity must be positive' });
        // Use a transaction to ensure ledger integrity
        await db.transaction().execute(async (tx) => {
            // 1. Deduct from Hub (Main Store) inventory
            let hubInventoryQ = tx.selectFrom('ProductInventory')
                .selectAll()
                .where('productId', '=', productId)
                .where('locationId', '=', locationId);
            // Try to find the one where outletId is null
            let hubInventoryResults = await hubInventoryQ.execute();
            const hubInventory = hubInventoryResults.find((inv) => inv.outletId === null);
            if (!hubInventory || hubInventory.stock < qty) {
                throw new Error('Insufficient stock in Main Store');
            }
            await tx.updateTable('ProductInventory')
                .set({ stock: hubInventory.stock - qty })
                .where('id', '=', hubInventory.id)
                .execute();
            // 2. Add to Terminal (Outlet) inventory
            let outletInventoryQ = tx.selectFrom('ProductInventory')
                .selectAll()
                .where('productId', '=', productId)
                .where('locationId', '=', locationId)
                .where('outletId', '=', outletId);
            const outletInventory = await outletInventoryQ.executeTakeFirst();
            if (outletInventory) {
                await tx.updateTable('ProductInventory')
                    .set({ stock: outletInventory.stock + qty })
                    .where('id', '=', outletInventory.id)
                    .execute();
            }
            else {
                await tx.insertInto('ProductInventory').values({
                    id: randomUUID(),
                    productId,
                    locationId,
                    outletId,
                    stock: qty
                }).execute();
            }
            // 3. Write Ledger entry
            await tx.insertInto('StockMovement').values({
                id: randomUUID(),
                businessId,
                productId,
                locationId,
                outletId,
                type: 'TRANSFER',
                quantity: qty,
                reference: 'Hub to Terminal Transfer',
                timestamp: new Date().toISOString()
            }).execute();
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Transfer failed' });
    }
});
export default router;
