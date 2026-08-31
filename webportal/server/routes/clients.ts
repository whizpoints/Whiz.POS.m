import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const router = Router();
const prisma = new PrismaClient();
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

// Get all clients
router.get('/', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const clients = await prisma.client.findMany({
      where: { businessId },
      orderBy: { name: 'asc' }
    });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create/Update client
router.post('/', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { id, name, phone, email, address } = req.body;
    let client;
    if (id) {
        // try update
        const existing = await prisma.client.findFirst({ where: { id, businessId } });
        if (existing) {
            client = await prisma.client.update({
                where: { id },
                data: { name, phone, email, address }
            });
            return res.json(client);
        }
    }
    client = await prisma.client.create({
      data: {
        id,
        businessId, name, phone, email, address
      }
    });
    res.json(client);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete client
router.delete('/:id', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { id } = req.params;
    await prisma.client.deleteMany({
      where: { id, businessId }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
