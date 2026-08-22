import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const router = express.Router();
const prisma = new PrismaClient();
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

// Get all outlets for a location (or all for business)
router.get('/:locationId', async (req: any, res: any) => {
  try {
    const businessId = req.user.businessId;
    const { locationId } = req.params;
    
    const whereClause: any = {};
    if (locationId !== 'ALL') {
        whereClause.locationId = locationId;
    } else {
        whereClause.businessId = businessId;
    }

    const outlets = await prisma.outlet.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' }
    });
    res.json(outlets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch outlets' });
  }
});

// Create a new outlet
router.post('/', async (req, res) => {
  try {
    const { businessId, locationId, name } = req.body;
    if (!businessId || !locationId || !name) {
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

// Delete an outlet
router.delete('/:id', async (req, res) => {
  try {
    await prisma.outlet.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete outlet' });
  }
});

export default router;
