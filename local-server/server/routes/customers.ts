import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import prisma from '../prisma.js';
import jwt from 'jsonwebtoken';

const router = Router();
// const prisma = new PrismaClient();
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

// Get all customers
router.get('/', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const customers = await prisma.customer.findMany({
      where: { businessId },
      orderBy: { name: 'asc' }
    });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create customer
router.post('/', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { name, phone, email, loyaltyPoints, totalSpent } = req.body;
    const customer = await prisma.customer.create({
      data: {
        businessId, name, phone, email, loyaltyPoints, totalSpent
      }
    });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update customer
router.put('/:id', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { id } = req.params;
    const { name, phone, email, loyaltyPoints, totalSpent } = req.body;
    const customer = await prisma.customer.updateMany({
      where: { id, businessId },
      data: { name, phone, email, loyaltyPoints, totalSpent }
    });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete customer
router.delete('/:id', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { id } = req.params;
    await prisma.customer.deleteMany({
      where: { id, businessId }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

