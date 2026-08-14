import express from 'express';
import prisma from '../prisma.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const authenticate = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing authorization header' });

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

router.use(authenticate);

router.get('/', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const outlets = await prisma.outlet.findMany({
      where: { businessId },
      orderBy: { createdAt: 'asc' }
    });
    res.json(outlets);
  } catch (error) {
    console.error('Outlets GET error:', error);
    res.status(500).json({ error: 'Failed to fetch outlets' });
  }
});

router.get('/location/:locationId', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { locationId } = req.params;
    const outlets = await prisma.outlet.findMany({
      where: { locationId, businessId },
      orderBy: { createdAt: 'asc' }
    });
    res.json(outlets);
  } catch (error) {
    console.error('Outlets GET by location error:', error);
    res.status(500).json({ error: 'Failed to fetch outlets' });
  }
});

router.get('/:id', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const outlet = await prisma.outlet.findUnique({
      where: { id: req.params.id, businessId },
      include: {
        users: true,
        inventory: {
          include: {
            product: true
          }
        }
      }
    });
    if (!outlet) return res.status(404).json({ error: 'Outlet not found' });
    res.json(outlet);
  } catch (error) {
    console.error('Outlets GET by id error:', error);
    res.status(500).json({ error: 'Failed to fetch outlet details' });
  }
});

router.post('/', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { locationId, name } = req.body;
    if (!locationId) {
      return res.status(400).json({ error: 'locationId is required' });
    }
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const outlet = await prisma.outlet.create({
      data: { businessId, locationId, name }
    });
    res.json(outlet);
  } catch (error) {
    console.error('Outlets POST error:', error);
    res.status(500).json({ error: 'Failed to create outlet' });
  }
});

router.put('/:id', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const outlet = await prisma.outlet.update({
      where: { id: req.params.id, businessId },
      data: req.body
    });
    res.json(outlet);
  } catch (error) {
    console.error('Outlets PUT error:', error);
    res.status(500).json({ error: 'Failed to update outlet' });
  }
});

router.delete('/:id', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    await prisma.outlet.delete({
      where: { id: req.params.id, businessId }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Outlets DELETE error:', error);
    res.status(500).json({ error: 'Failed to delete outlet' });
  }
});

router.post('/:id/users', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { userId } = req.body;

    const outlet = await prisma.outlet.findUnique({
      where: { id: req.params.id, businessId }
    });
    if (!outlet) return res.status(404).json({ error: 'Outlet not found' });

    await prisma.user.update({
      where: { id: userId },
      data: { outletId: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Outlets POST users error:', error);
    res.status(500).json({ error: 'Failed to assign user' });
  }
});

router.delete('/:id/users/:userId', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { userId } = req.params;

    const outlet = await prisma.outlet.findUnique({
      where: { id: req.params.id, businessId }
    });
    if (!outlet) return res.status(404).json({ error: 'Outlet not found' });

    await prisma.user.update({
      where: { id: userId },
      data: { outletId: null }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Outlets DELETE users error:', error);
    res.status(500).json({ error: 'Failed to remove user' });
  }
});

router.post('/:id/products', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { productId, locationId } = req.body;
    const outletId = req.params.id;

    const outlet = await prisma.outlet.findUnique({
      where: { id: outletId, businessId }
    });
    if (!outlet) return res.status(404).json({ error: 'Outlet not found' });

    let targetLocationId = locationId;
    if (!targetLocationId) {
      const loc = await prisma.storeLocation.findFirst({ where: { businessId } });
      if (loc) targetLocationId = loc.id;
    }

    if (!targetLocationId) return res.status(400).json({ error: 'No location available for inventory' });

    const existing = await prisma.productInventory.findFirst({
      where: { productId, outletId, locationId: targetLocationId }
    });

    if (existing) {
      return res.status(400).json({ error: 'Product is already assigned to this outlet' });
    }

    await prisma.productInventory.create({
      data: {
        productId,
        outletId,
        locationId: targetLocationId,
        stock: 0
      }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Outlets POST products error:', error);
    res.status(500).json({ error: 'Failed to assign product' });
  }
});

router.post('/:id/products/batch', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { productIds, locationId } = req.body;
    const outletId = req.params.id;

    if (!Array.isArray(productIds)) {
      return res.status(400).json({ error: 'productIds must be an array' });
    }

    const outlet = await prisma.outlet.findUnique({
      where: { id: outletId, businessId }
    });
    if (!outlet) return res.status(404).json({ error: 'Outlet not found' });

    let targetLocationId = locationId;
    if (!targetLocationId) {
      const loc = await prisma.storeLocation.findFirst({ where: { businessId } });
      if (loc) targetLocationId = loc.id;
    }

    if (!targetLocationId) return res.status(400).json({ error: 'No location available for inventory' });

    let addedCount = 0;
    for (const productId of productIds) {
      const existing = await prisma.productInventory.findFirst({
        where: { productId, outletId, locationId: targetLocationId }
      });

      if (!existing) {
        await prisma.productInventory.create({
          data: {
            productId,
            outletId,
            locationId: targetLocationId,
            stock: 0
          }
        });
        addedCount++;
      }
    }

    res.json({ success: true, addedCount });
  } catch (error) {
    console.error('Outlets POST products batch error:', error);
    res.status(500).json({ error: 'Failed to assign products in batch' });
  }
});

router.post('/:id/inventory/adjust', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { inventoryId, amount, type } = req.body;

    const outlet = await prisma.outlet.findUnique({
      where: { id: req.params.id, businessId }
    });
    if (!outlet) return res.status(404).json({ error: 'Outlet not found' });

    const inventory = await prisma.productInventory.findUnique({ where: { id: inventoryId } });
    if (!inventory) return res.status(404).json({ error: 'Inventory record not found' });

    let newStock = inventory.stock;
    if (type === 'ADD') newStock += amount;
    else if (type === 'DEDUCT') {
      if (newStock < amount) return res.status(400).json({ error: 'Insufficient stock' });
      newStock -= amount;
    } else {
      return res.status(400).json({ error: 'Invalid adjustment type' });
    }

    await prisma.productInventory.update({
      where: { id: inventoryId },
      data: { stock: newStock }
    });

    res.json({ success: true, stock: newStock });
  } catch (error) {
    console.error('Outlets POST inventory adjust error:', error);
    res.status(500).json({ error: 'Failed to adjust stock' });
  }
});

export default router;
