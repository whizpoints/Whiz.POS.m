import { Router } from 'express';
import db from '../db.js';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';

const router = Router();
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

router.get('/summary', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { locationId } = req.query;

    let q1 = db.selectFrom('Receipt').select(['totalAmount', 'status', 'createdAt']).where('businessId', '=', businessId);
    if (locationId) q1 = q1.where('locationId', '=', locationId);
    
    let q2 = db.selectFrom('Receipt').selectAll().where('businessId', '=', businessId).orderBy('createdAt', 'desc').limit(10);
    if (locationId) q2 = q2.where('locationId', '=', locationId);

    const [receipts, recentReceipts] = await Promise.all([
      q1.execute(),
      q2.execute()
    ]);

    const totalSales = receipts.reduce((sum, r) => sum + r.totalAmount, 0);
    const completedCount = receipts.filter(r => r.status === 'COMPLETED').length;

    res.json({ totalSales, receiptCount: receipts.length, completedCount, recentReceipts });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/sales', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { locationId } = req.query;
    
    let q1 = db.selectFrom('Receipt').selectAll().where('businessId', '=', businessId).orderBy('createdAt', 'desc');
    if (locationId) q1 = q1.where('locationId', '=', locationId);
    
    let q2 = db.selectFrom('MpesaTransaction').selectAll().where('businessId', '=', businessId).orderBy('timestamp', 'desc');
    if (locationId) q2 = q2.where('locationId', '=', locationId);

    const [receipts, mpesaTxns] = await Promise.all([
      q1.execute(),
      q2.execute()
    ]);
    res.json({ receipts, mpesaTxns });
  } catch (error) {
    console.error('Sales error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/staff', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { locationId } = req.query;
    let q = db.selectFrom('User').select(['id', 'email', 'name', 'role', 'createdAt']).where('businessId', '=', businessId);
    if (locationId) q = q.where('locationId', '=', locationId);
    const staff = await q.execute();
    res.json({ staff });
  } catch (error) {
    console.error('Staff error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/suppliers', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const suppliers = await db.selectFrom('Supplier').selectAll().where('businessId', '=', businessId).orderBy('createdAt', 'desc').execute();
    res.json({ suppliers });
  } catch (error) {
    console.error('Suppliers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/reports', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { locationId } = req.query;
    
    let q1 = db.selectFrom('Receipt').select((eb) => eb.fn.count('id').as('count')).where('businessId', '=', businessId);
    if (locationId) q1 = q1.where('locationId', '=', locationId);

    const [totalReceiptsRes, totalProductsRes, totalCustomersRes, receipts] = await Promise.all([
      q1.executeTakeFirst(),
      db.selectFrom('Product').select((eb) => eb.fn.count('id').as('count')).where('businessId', '=', businessId).executeTakeFirst(),
      db.selectFrom('Customer').select((eb) => eb.fn.count('id').as('count')).where('businessId', '=', businessId).executeTakeFirst(),
      (async () => {
        let q4 = db.selectFrom('Receipt').select(['totalAmount']).where('businessId', '=', businessId);
        if (locationId) q4 = q4.where('locationId', '=', locationId);
        return await q4.execute();
      })()
    ]);
    
    const totalReceipts = Number(totalReceiptsRes?.count || 0);

    const totalRevenue = receipts.reduce((sum, r) => sum + r.totalAmount, 0);

    const stats = { 
      revenue: totalRevenue, 
      revenueDelta: 0, 
      profit: totalRevenue * 0.3, // Mock profit 
      profitDelta: 0, 
      transactions: totalReceipts,
      transactionsDelta: 0 
    };
    
    const chartData = [
      { name: 'Mon', sales: totalRevenue * 0.1, profit: totalRevenue * 0.1 * 0.3 },
      { name: 'Tue', sales: totalRevenue * 0.2, profit: totalRevenue * 0.2 * 0.3 },
      { name: 'Wed', sales: totalRevenue * 0.15, profit: totalRevenue * 0.15 * 0.3 },
      { name: 'Thu', sales: totalRevenue * 0.25, profit: totalRevenue * 0.25 * 0.3 },
      { name: 'Fri', sales: totalRevenue * 0.3, profit: totalRevenue * 0.3 * 0.3 }
    ];

    res.json({ stats, chartData });
  } catch (error) {
    console.error('Reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
