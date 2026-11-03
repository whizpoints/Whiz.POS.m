import prisma from '../db.js';
import express from 'express';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const authenticate = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.split(' ')[1] : req.query.token;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

router.use(authenticate);

// 1. Get all outlets for business
router.get('/', async (req: any, res: any) => {
  try {
    const businessId = req.user.businessId;
    const outlets = await prisma.outlet.findMany({
      where: { businessId },
      orderBy: { createdAt: 'asc' }
    });
    res.json(outlets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch outlets' });
  }
});

// 2. Explicit Outlet detail route
router.get('/detail/:id', async (req: any, res: any) => {
  try {
    const businessId = req.user.businessId;
    const outlet = await prisma.outlet.findFirst({
      where: { id: req.params.id, businessId }
    });
    if (!outlet) return res.status(404).json({ error: 'Outlet not found' });

    const [users, inventory] = await Promise.all([
      prisma.user.findMany({ where: { outletId: outlet.id } }),
      prisma.productInventory.findMany({
        where: { outletId: outlet.id },
        include: { product: true }
      })
    ]);

    res.json({
      ...outlet,
      users,
      inventory
    });
  } catch (error) {
    console.error('Outlet detail error:', error);
    res.status(500).json({ error: 'Failed to fetch outlet details' });
  }
});

// 3. Polymorphic GET /:param (handles 'ALL', locationId, or outletId)
router.get('/:param', async (req: any, res: any) => {
  try {
    const businessId = req.user.businessId;
    const param = req.params.param;

    if (param === 'ALL') {
      const outlets = await prisma.outlet.findMany({
        where: { businessId },
        orderBy: { createdAt: 'asc' }
      });
      return res.json(outlets);
    }

    // Check if param matches an Outlet
    const outlet = await prisma.outlet.findFirst({
      where: { id: param, businessId }
    });

    if (outlet) {
      const [users, inventory] = await Promise.all([
        prisma.user.findMany({ where: { outletId: outlet.id } }),
        prisma.productInventory.findMany({
          where: { outletId: outlet.id },
          include: { product: true }
        })
      ]);

      return res.json({
        ...outlet,
        users,
        inventory
      });
    }

    // Otherwise treat param as locationId
    let outlets = await prisma.outlet.findMany({
      where: { locationId: param, businessId },
      orderBy: { createdAt: 'asc' }
    });

    // Auto-provision default outlet if none exists for this location
    if (outlets.length === 0) {
      const loc = await prisma.storeLocation.findFirst({ where: { id: param, businessId } });
      if (loc) {
        const defaultOutlet = await prisma.outlet.create({
          data: {
            businessId,
            locationId: loc.id,
            name: `${loc.name} - Register 1`
          }
        });
        outlets = [defaultOutlet];
      }
    }

    return res.json(outlets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch outlets' });
  }
});

// 4. Create outlet
router.post('/', async (req: any, res: any) => {
  try {
    const businessId = req.user.businessId;
    const { locationId, name } = req.body;
    if (!locationId || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const outlet = await prisma.outlet.create({
      data: { businessId, locationId, name }
    });
    res.json(outlet);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create outlet' });
  }
});

// 5. Update outlet
router.put('/:id', async (req: any, res: any) => {
  try {
    const businessId = req.user.businessId;
    const { name, locationId } = req.body;
    const now = new Date();
    const outlet = await prisma.outlet.updateMany({
      where: { id: req.params.id, businessId },
      data: { ...(name && { name }), ...(locationId && { locationId }), updatedAt: now }
    });
    res.json(outlet);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update outlet' });
  }
});

// 6. Delete outlet
router.delete('/:id', async (req: any, res: any) => {
  try {
    const businessId = req.user.businessId;
    const outletId = req.params.id;
    await prisma.outlet.deleteMany({
      where: { id: outletId, businessId }
    });

    // Record deletion tombstone in Business.settings so local servers pulling delta know it was deleted
    const b = await prisma.business.findUnique({ where: { id: businessId } });
    if (b) {
      let settings: any = {};
      try { settings = typeof b.settings === 'string' ? JSON.parse(b.settings) : (b.settings || {}); } catch(e) {}
      const deletedOutletIds = Array.isArray(settings.deletedOutletIds) ? settings.deletedOutletIds : [];
      if (!deletedOutletIds.includes(outletId)) {
        deletedOutletIds.push(outletId);
        settings.deletedOutletIds = deletedOutletIds;
        await prisma.business.update({
          where: { id: businessId },
          data: { settings: JSON.stringify(settings), updatedAt: new Date() }
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete outlet' });
  }
});

// 7. Assign User to Outlet
router.post('/:id/users', async (req: any, res: any) => {
  try {
    const businessId = req.user.businessId;
    const { userId } = req.body;
    const outletId = req.params.id;

    const outlet = await prisma.outlet.findFirst({ where: { id: outletId, businessId } });
    if (!outlet) return res.status(404).json({ error: 'Outlet not found' });

    await prisma.user.updateMany({
      where: { id: userId, businessId },
      data: { outletId }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign user' });
  }
});

// 8. Remove User from Outlet
router.delete('/:id/users/:userId', async (req: any, res: any) => {
  try {
    const businessId = req.user.businessId;
    const { userId } = req.params;

    await prisma.user.updateMany({
      where: { id: userId, businessId },
      data: { outletId: null }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove user' });
  }
});

// 9. Assign Single Product to Outlet
router.post('/:id/products', async (req: any, res: any) => {
  try {
    const businessId = req.user.businessId;
    const outletId = req.params.id;
    const { productId, locationId, stock = 0 } = req.body;

    const outlet = await prisma.outlet.findFirst({ where: { id: outletId, businessId } });
    if (!outlet) return res.status(404).json({ error: 'Outlet not found' });

    let targetLocationId = locationId || outlet.locationId;
    if (!targetLocationId) {
      const loc = await prisma.storeLocation.findFirst({ where: { businessId } });
      if (loc) targetLocationId = loc.id;
    }

    if (!targetLocationId) return res.status(400).json({ error: 'No location available' });

    const existing = await prisma.productInventory.findFirst({
      where: { productId, outletId, locationId: targetLocationId }
    });

    if (existing) {
      return res.status(400).json({ error: 'Product is already assigned to this outlet' });
    }

    const requestedQty = Number(stock) || 0;
    if (requestedQty < 0) {
      return res.status(400).json({ error: 'Assigned stock cannot be negative' });
    }

    // STRICT VALIDATION: Check Central Store Stock (outletId is null)
    let centralInv = await prisma.productInventory.findFirst({
      where: { productId, outletId: null }
    });

    const centralStock = centralInv ? Number(centralInv.stock || 0) : 0;
    if (requestedQty > centralStock) {
      return res.status(400).json({ 
        error: `Cannot assign ${requestedQty} units: Central Store only has ${centralStock} units available` 
      });
    }

    // Deduct stock from Central Store
    if (requestedQty > 0 && centralInv) {
      await prisma.productInventory.update({
        where: { id: centralInv.id },
        data: { stock: { decrement: requestedQty }, updatedAt: new Date() }
      });

      await prisma.stockMovement.create({
        data: {
          id: `mov_out_${Date.now()}_${randomUUID().substring(0, 8)}`,
          businessId,
          productId,
          locationId: targetLocationId,
          outletId: null,
          type: 'TRANSFER_OUT',
          quantity: requestedQty,
          reference: `Assigned to outlet ${outlet.name}`,
          timestamp: new Date()
        }
      });
    }

    const newInv = await prisma.productInventory.create({
      data: {
        productId,
        outletId,
        locationId: targetLocationId,
        stock: requestedQty,
        reorderLevel: 5
      }
    });

    if (requestedQty > 0) {
      await prisma.stockMovement.create({
        data: {
          id: `mov_in_${Date.now()}_${randomUUID().substring(0, 8)}`,
          businessId,
          productId,
          locationId: targetLocationId,
          outletId,
          type: 'TRANSFER_IN',
          quantity: requestedQty,
          reference: 'Assigned from Central Store',
          timestamp: new Date()
        }
      });
    }

    res.json({ success: true, inventory: newInv });
  } catch (error: any) {
    console.error('Assign product error:', error);
    res.status(500).json({ error: error.message || 'Failed to assign product' });
  }
});

// 10. Batch Assign Products to Outlet
router.post('/:id/products/batch', async (req: any, res: any) => {
  try {
    const businessId = req.user.businessId;
    const outletId = req.params.id;
    const { productIds, locationId, stock = 0 } = req.body;

    if (!Array.isArray(productIds)) {
      return res.status(400).json({ error: 'productIds must be an array' });
    }

    const outlet = await prisma.outlet.findFirst({ where: { id: outletId, businessId } });
    if (!outlet) return res.status(404).json({ error: 'Outlet not found' });

    let targetLocationId = locationId || outlet.locationId;
    if (!targetLocationId) {
      const loc = await prisma.storeLocation.findFirst({ where: { businessId } });
      if (loc) targetLocationId = loc.id;
    }

    if (!targetLocationId) return res.status(400).json({ error: 'No location available' });

    const requestedQty = Number(stock) || 0;
    if (requestedQty < 0) {
      return res.status(400).json({ error: 'Stock cannot be negative' });
    }

    // STRICT VALIDATION: Verify every product has sufficient stock in Central Store
    if (requestedQty > 0) {
      for (const pid of productIds) {
        const centralInv = await prisma.productInventory.findFirst({
          where: { productId: pid, outletId: null }
        });
        const avail = centralInv ? Number(centralInv.stock || 0) : 0;
        if (requestedQty > avail) {
          const prod = await prisma.product.findUnique({ where: { id: pid } });
          return res.status(400).json({
            error: `Cannot assign ${requestedQty} units of ${prod?.name || 'product'}: Central Store only has ${avail} units available`
          });
        }
      }
    }

    let addedCount = 0;
    for (const productId of productIds) {
      const existing = await prisma.productInventory.findFirst({
        where: { productId, outletId, locationId: targetLocationId }
      });

      if (!existing) {
        // Deduct from Central Store
        if (requestedQty > 0) {
          const centralInv = await prisma.productInventory.findFirst({
            where: { productId, outletId: null }
          });
          if (centralInv) {
            await prisma.productInventory.update({
              where: { id: centralInv.id },
              data: { stock: { decrement: requestedQty }, updatedAt: new Date() }
            });
            await prisma.stockMovement.create({
              data: {
                id: `mov_bout_${Date.now()}_${randomUUID().substring(0, 8)}`,
                businessId,
                productId,
                locationId: targetLocationId,
                outletId: null,
                type: 'TRANSFER_OUT',
                quantity: requestedQty,
                reference: `Batch assigned to outlet ${outlet.name}`,
                timestamp: new Date()
              }
            });
          }
        }

        await prisma.productInventory.create({
          data: {
            productId,
            outletId,
            locationId: targetLocationId,
            stock: requestedQty,
            reorderLevel: 5
          }
        });

        if (requestedQty > 0) {
          await prisma.stockMovement.create({
            data: {
              id: `mov_bin_${Date.now()}_${randomUUID().substring(0, 8)}`,
              businessId,
              productId,
              locationId: targetLocationId,
              outletId,
              type: 'TRANSFER_IN',
              quantity: requestedQty,
              reference: 'Batch assigned from Central Store',
              timestamp: new Date()
            }
          });
        }
        addedCount++;
      }
    }

    res.json({ success: true, addedCount });
  } catch (error: any) {
    console.error('Batch assign error:', error);
    res.status(500).json({ error: error.message || 'Failed to assign products' });
  }
});

// 11. Adjust Stock for Outlet (Increment / Decrement with StockMovement)
router.post('/:id/inventory/adjust', async (req: any, res: any) => {
  try {
    const businessId = req.user.businessId;
    const outletId = req.params.id;
    const { inventoryId, amount, type } = req.body;

    const outlet = await prisma.outlet.findFirst({ where: { id: outletId, businessId } });
    if (!outlet) return res.status(404).json({ error: 'Outlet not found' });

    const inventory = await prisma.productInventory.findUnique({
      where: { id: inventoryId }
    });
    if (!inventory) return res.status(404).json({ error: 'Inventory record not found' });

    const qty = Number(amount);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Invalid quantity' });
    }

    let delta = 0;
    let movementType = 'TRANSFER_IN';
    if (type === 'ADD' || type === 'ADJUSTMENT_UP') {
      // Adding stock to outlet means pulling from Central Store: Check availability!
      const centralInv = await prisma.productInventory.findFirst({
        where: { productId: inventory.productId, outletId: null }
      });
      const avail = centralInv ? Number(centralInv.stock || 0) : 0;
      if (qty > avail) {
        return res.status(400).json({
          error: `Cannot add ${qty} units: Central Store only has ${avail} units available`
        });
      }

      if (centralInv) {
        await prisma.productInventory.update({
          where: { id: centralInv.id },
          data: { stock: { decrement: qty }, updatedAt: new Date() }
        });
      }
      delta = qty;
      movementType = 'TRANSFER_IN';
    } else if (type === 'DEDUCT' || type === 'ADJUSTMENT_DOWN') {
      if (inventory.stock < qty) {
        return res.status(400).json({ error: 'Insufficient stock in outlet to deduct' });
      }
      // Return deducted stock back to Central Store!
      let centralInv = await prisma.productInventory.findFirst({
        where: { productId: inventory.productId, outletId: null }
      });
      if (centralInv) {
        await prisma.productInventory.update({
          where: { id: centralInv.id },
          data: { stock: { increment: qty }, updatedAt: new Date() }
        });
      }
      delta = -qty;
      movementType = 'TRANSFER_OUT';
    } else {
      return res.status(400).json({ error: 'Invalid adjustment type' });
    }

    // 1. Update ProductInventory
    const updated = await prisma.productInventory.update({
      where: { id: inventoryId },
      data: {
        stock: { increment: delta },
        updatedAt: new Date()
      }
    });

    // 2. Create StockMovement for sync
    const movementId = `adj_${Date.now()}_${randomUUID().substring(0, 8)}`;
    await prisma.stockMovement.create({
      data: {
        id: movementId,
        businessId,
        productId: inventory.productId,
        locationId: inventory.locationId,
        outletId,
        type: movementType,
        quantity: qty,
        reference: type === 'ADD' ? 'Transferred from Central Store' : 'Returned to Central Store',
        timestamp: new Date()
      }
    });

    // Broadcast update via socket if active
    const io = req.app.get('io');
    if (io) {
      io.to(`business_${businessId}`).emit('downward_sync_event', {
        type: 'STOCK_ADJUSTMENT',
        outletId,
        productId: inventory.productId,
        delta
      });
    }

    res.json({ success: true, stock: updated.stock, delta });
  } catch (error: any) {
    console.error('Inventory adjust error:', error);
    res.status(500).json({ error: error.message || 'Failed to adjust stock' });
  }
});

// 12. Update Stock Directly on Outlet Inventory (PUT /:id/inventory/:inventoryId)
router.put('/:id/inventory/:inventoryId', async (req: any, res: any) => {
  try {
    const businessId = req.user.businessId;
    const outletId = req.params.id;
    const { inventoryId } = req.params;
    const { stock: rawStock } = req.body;

    const newStock = parseInt(rawStock, 10);
    if (isNaN(newStock) || newStock < 0) {
      return res.status(400).json({ error: 'Invalid stock level. Must be non-negative integer.' });
    }

    const outlet = await prisma.outlet.findFirst({ where: { id: outletId, businessId } });
    if (!outlet) return res.status(404).json({ error: 'Outlet not found' });

    const inventory = await prisma.productInventory.findFirst({
      where: { id: inventoryId, outletId }
    });
    if (!inventory) return res.status(404).json({ error: 'Inventory record not found' });

    const currStock = Number(inventory.stock || 0);
    const delta = newStock - currStock;
    const now = new Date();

    if (delta > 0) {
      // Need delta from Central Store
      const centralInv = await prisma.productInventory.findFirst({
        where: { productId: inventory.productId, outletId: null }
      });
      const avail = centralInv ? Number(centralInv.stock || 0) : 0;
      if (delta > avail) {
        return res.status(400).json({
          error: `Cannot set stock to ${newStock}: Requires +${delta} units, but Central Store only has ${avail} units available`
        });
      }

      if (centralInv) {
        await prisma.productInventory.update({
          where: { id: centralInv.id },
          data: { stock: { decrement: delta }, updatedAt: now }
        });

        await prisma.stockMovement.create({
          data: {
            id: `mov_out_${Date.now()}_${randomUUID().substring(0, 8)}`,
            businessId,
            productId: inventory.productId,
            locationId: inventory.locationId,
            outletId: null,
            type: 'TRANSFER_OUT',
            quantity: delta,
            reference: `Transferred to outlet ${outlet.name} (Direct set)`,
            timestamp: now
          }
        });
      }
    } else if (delta < 0) {
      // Return excess back to Central Store
      const returnQty = Math.abs(delta);
      const centralInv = await prisma.productInventory.findFirst({
        where: { productId: inventory.productId, outletId: null }
      });

      if (centralInv) {
        await prisma.productInventory.update({
          where: { id: centralInv.id },
          data: { stock: { increment: returnQty }, updatedAt: now }
        });
      } else {
        await prisma.productInventory.create({
          data: {
            productId: inventory.productId,
            locationId: inventory.locationId,
            outletId: null,
            stock: returnQty,
            reorderLevel: 5
          }
        });
      }

      await prisma.stockMovement.create({
        data: {
          id: `mov_ret_${Date.now()}_${randomUUID().substring(0, 8)}`,
          businessId,
          productId: inventory.productId,
          locationId: inventory.locationId,
          outletId: null,
          type: 'TRANSFER_IN',
          quantity: returnQty,
          reference: `Returned from outlet ${outlet.name} to Central Store (Direct set)`,
          timestamp: now
        }
      });
    }

    const updated = await prisma.productInventory.update({
      where: { id: inventoryId },
      data: { stock: newStock, updatedAt: now }
    });

    if (delta !== 0) {
      await prisma.stockMovement.create({
        data: {
          id: `set_${Date.now()}_${randomUUID().substring(0, 8)}`,
          businessId,
          productId: inventory.productId,
          locationId: inventory.locationId,
          outletId,
          type: delta > 0 ? 'TRANSFER_IN' : 'TRANSFER_OUT',
          quantity: Math.abs(delta),
          reference: 'Direct stock level update on outlet',
          timestamp: now
        }
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`business_${businessId}`).emit('downward_sync_event', {
        type: 'STOCK_SET',
        outletId,
        productId: inventory.productId,
        stock: newStock
      });
    }

    res.json({ success: true, stock: updated.stock });
  } catch (error: any) {
    console.error('Outlet inventory PUT error:', error);
    res.status(500).json({ error: error.message || 'Failed to update stock' });
  }
});

// 13. Remove Product from Outlet (DELETE /:id/inventory/:inventoryId)
router.delete('/:id/inventory/:inventoryId', async (req: any, res: any) => {
  try {
    const businessId = req.user.businessId;
    const outletId = req.params.id;
    const { inventoryId } = req.params;

    const inventory = await prisma.productInventory.findFirst({
      where: { id: inventoryId, outletId }
    });
    if (!inventory) {
      return res.status(404).json({ error: 'Inventory record not found for this outlet' });
    }

    const remainingStock = Number(inventory.stock || 0);
    const now = new Date();

    if (remainingStock > 0) {
      const centralInv = await prisma.productInventory.findFirst({
        where: { productId: inventory.productId, outletId: null }
      });

      if (centralInv) {
        await prisma.productInventory.update({
          where: { id: centralInv.id },
          data: { stock: { increment: remainingStock }, updatedAt: now }
        });
      } else {
        await prisma.productInventory.create({
          data: {
            productId: inventory.productId,
            locationId: inventory.locationId,
            outletId: null,
            stock: remainingStock,
            reorderLevel: 5
          }
        });
      }

      await prisma.stockMovement.create({
        data: {
          id: `mov_del_${Date.now()}_${randomUUID().substring(0, 8)}`,
          businessId,
          productId: inventory.productId,
          locationId: inventory.locationId,
          outletId: null,
          type: 'TRANSFER_IN',
          quantity: remainingStock,
          reference: `Returned to Central Store on unassigning from outlet`,
          timestamp: now
        }
      });
    }

    await prisma.productInventory.delete({
      where: { id: inventoryId }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`business_${businessId}`).emit('downward_sync_event', {
        type: 'PRODUCT_UNASSIGNED',
        outletId,
        productId: inventory.productId
      });
    }

    res.json({ success: true, message: 'Product unassigned and stock returned to Central Store' });
  } catch (error: any) {
    console.error('Delete outlet inventory error:', error);
    res.status(500).json({ error: error.message || 'Failed to unassign product' });
  }
});

// 14. Force sync
router.post('/:id/force-sync', async (req: any, res: any) => {
  try {
    const businessId = req.user.businessId;
    const outletId = req.params.id;

    const now = new Date();
    await Promise.all([
      prisma.outlet.updateMany({ where: { id: outletId, businessId }, data: { updatedAt: now } }),
      prisma.productInventory.updateMany({ where: { outletId }, data: { updatedAt: now } }),
      prisma.business.updateMany({ where: { id: businessId }, data: { updatedAt: now } })
    ]);

    const io = req.app.get('io');
    if (io) {
      io.to(`business_${businessId}`).emit('downward_sync_event', {
        type: 'FORCE_SYNC',
        outletId,
        timestamp: now.toISOString()
      });
    }

    res.json({ success: true, message: 'Outlet data marked for sync' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger sync' });
  }
});

export default router;
