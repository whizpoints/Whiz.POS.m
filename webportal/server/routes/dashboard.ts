import prisma from '../db.js';
import { Router } from 'express';
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
    const { locationId, serverId, terminalId, startDate, endDate } = req.query;

    const whereClause: any = { businessId };
    if (locationId && locationId !== 'ALL') whereClause.locationId = locationId;
    if (serverId) whereClause.serverId = serverId;
    if (terminalId) whereClause.terminalId = terminalId;
    
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = new Date(startDate);
      if (endDate) whereClause.createdAt.lte = new Date(endDate);
    }

    const [aggregations, recentReceipts] = await Promise.all([
      prisma.receipt.aggregate({
        where: whereClause,
        _sum: { totalAmount: true },
        _count: { id: true }
      }),
      prisma.receipt.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    const completedAggregations = await prisma.receipt.aggregate({
      where: { ...whereClause, status: 'COMPLETED' },
      _count: { id: true }
    });

    res.json({ 
      totalSales: aggregations._sum.totalAmount || 0, 
      receiptCount: aggregations._count.id || 0, 
      completedCount: completedAggregations._count.id || 0, 
      recentReceipts 
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/sales', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { locationId } = req.query;
    const [receipts, mpesaTxns] = await Promise.all([
      prisma.receipt.findMany({
        where: { businessId, ...(locationId ? { locationId } : {}) },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.mpesaTransaction.findMany({
        where: { businessId, ...(locationId ? { locationId } : {}) },
        orderBy: { timestamp: 'desc' }
      })
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
    const staff = await prisma.user.findMany({
      where: { businessId, ...(locationId ? { locationId } : {}) },
      select: { id: true, email: true, name: true, role: true, createdAt: true }
    });
    res.json({ staff });
  } catch (error) {
    console.error('Staff error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/suppliers', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const suppliers = await prisma.supplier.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ suppliers });
  } catch (error) {
    console.error('Suppliers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/reports', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { locationId, serverId, terminalId, startDate, endDate, groupBy } = req.query;
    
    const whereClause: any = { businessId };
    if (locationId && locationId !== 'ALL') whereClause.locationId = locationId;
    if (serverId) whereClause.serverId = serverId;
    if (terminalId) whereClause.terminalId = terminalId;
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = new Date(startDate);
      if (endDate) whereClause.createdAt.lte = new Date(endDate);
    }

    // Aggregate stats example
    const [aggregations, totalProducts, totalCustomers] = await Promise.all([
      prisma.receipt.aggregate({
        where: whereClause,
        _sum: { totalAmount: true },
        _count: { id: true }
      }),
      prisma.product.count({ where: { businessId } }),
      prisma.customer.count({ where: { businessId } })
    ]);

    const totalRevenue = aggregations._sum.totalAmount || 0;
    const totalReceipts = aggregations._count.id || 0;

    const stats = { 
      revenue: totalRevenue, 
      revenueDelta: 0, 
      profit: totalRevenue * 0.3, // Mock profit for now
      profitDelta: 0, 
      transactions: totalReceipts,
      transactionsDelta: 0 
    };

    let chartData: any[] = [];
    
    // Default to last 7 days chart if no specific groupBy requested
    if (!groupBy || groupBy === 'day') {
      const dbReceipts = await prisma.receipt.findMany({
         where: whereClause,
         select: { totalAmount: true, createdAt: true },
         orderBy: { createdAt: 'asc' }
      });
      
      const salesByDay: Record<string, number> = {};
      dbReceipts.forEach(r => {
         const d = new Date(r.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
         salesByDay[d] = (salesByDay[d] || 0) + r.totalAmount;
      });

      chartData = Object.keys(salesByDay).map(day => ({
         name: day,
         sales: salesByDay[day],
         profit: salesByDay[day] * 0.3
      }));
    } else if (groupBy === 'branch') {
      const grouped = await prisma.receipt.groupBy({
         by: ['locationId'],
         where: whereClause,
         _sum: { totalAmount: true }
      });
      // Resolve location names
      const locations = await prisma.storeLocation.findMany({ where: { businessId } });
      chartData = grouped.map(g => {
         const loc = locations.find(l => l.id === g.locationId);
         return {
            name: loc?.name || 'Unknown',
            sales: g._sum.totalAmount || 0,
            profit: (g._sum.totalAmount || 0) * 0.3
         };
      });
    }

    res.json({ stats, chartData });
  } catch (error) {
    console.error('Reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
