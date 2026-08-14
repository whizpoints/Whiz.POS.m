import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get stock movements for a business
router.get('/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const movements = await prisma.stockMovement.findMany({
      where: { businessId },
      include: { product: true, location: true, outlet: true },
      orderBy: { timestamp: 'desc' },
      take: 100
    });
    res.json(movements);
  } catch (error) {
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
    if (qty <= 0) return res.status(400).json({ error: 'Quantity must be positive' });

    // Use a transaction to ensure ledger integrity
    await prisma.$transaction(async (tx) => {
      // 1. Deduct from Hub (Main Store) inventory
      const hubInventory = await tx.productInventory.findFirst({
        where: { productId, locationId, outletId: null }
      });
      
      if (!hubInventory || hubInventory.stock < qty) {
        throw new Error('Insufficient stock in Main Store');
      }

      await tx.productInventory.update({
        where: { id: hubInventory.id },
        data: { stock: hubInventory.stock - qty }
      });

      // 2. Add to Terminal (Outlet) inventory
      const outletInventory = await tx.productInventory.findFirst({
        where: { productId, locationId, outletId }
      });

      if (outletInventory) {
        await tx.productInventory.update({
          where: { id: outletInventory.id },
          data: { stock: outletInventory.stock + qty }
        });
      } else {
        await tx.productInventory.create({
          data: { productId, locationId, outletId, stock: qty }
        });
      }

      // 3. Write Ledger entry
      await tx.stockMovement.create({
        data: {
          businessId,
          productId,
          locationId,
          outletId,
          type: 'TRANSFER',
          quantity: qty,
          reference: 'Hub to Terminal Transfer'
        }
      });
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Transfer failed' });
  }
});

export default router;
