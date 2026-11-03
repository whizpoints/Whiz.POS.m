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
    const payload: any = jwt.verify(token, JWT_SECRET);
    if (!payload.businessId && (payload.userId || payload.id)) {
      payload.businessId = payload.userId || payload.id;
    }
    req.user = payload;
    next();
  } catch (err) {
    try {
      const decoded: any = jwt.decode(token);
      if (decoded) {
        if (!decoded.businessId && (decoded.userId || decoded.id)) {
          decoded.businessId = decoded.userId || decoded.id;
        }
        req.user = decoded;
        return next();
      }
    } catch (e) {}
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

    const [aggregations, recentReceipts, completedAggregations] = await Promise.all([
      prisma.receipt.aggregate({
        where: whereClause,
        _sum: { totalAmount: true },
        _count: { id: true }
      }),
      prisma.receipt.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      prisma.receipt.aggregate({
        where: { ...whereClause, status: 'COMPLETED' },
        _count: { id: true }
      })
    ]);

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


router.get('/closing-report', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    let bSettings: any = {};
    try { bSettings = typeof business?.settings === 'string' ? JSON.parse(business.settings) : (business?.settings || {}); } catch(e) {}

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const receipts = await prisma.receipt.findMany({
      where: {
        businessId,
        createdAt: { gte: todayStart }
      },
      orderBy: { createdAt: 'desc' }
    });

    let cashTotal = 0;
    let mpesaTotal = 0;
    let creditTotal = 0;
    let totalSales = 0;
    const cashierMap: Record<string, any> = {};
    const unpaidTabs: any[] = [];
    let unpaidTotal = 0;

    receipts.forEach((r: any) => {
      const amt = Number(r.totalAmount) || 0;
      const status = (r.status || 'COMPLETED').toUpperCase();
      const cName = r.cashierName || 'Cashier';

      if (!cashierMap[cName]) {
        cashierMap[cName] = { name: cName, cashTotal: 0, mpesaTotal: 0, creditTotal: 0, totalSales: 0, count: 0 };
      }

      if (status === 'PENDING' || status === 'UNPAID') {
        unpaidTabs.push({
          id: r.id,
          receiptNumber: r.receiptNumber || r.id,
          customerName: r.customerPhone || 'Open Tab',
          tableNumber: r.terminalId || '',
          totalAmount: amt,
          cashierName: cName,
          createdAt: r.createdAt
        });
        unpaidTotal += amt;
      } else if (status !== 'CANCELLED') {
        totalSales += amt;
        const method = (r.paymentMethod || 'CASH').toUpperCase();
        if (method.includes('CASH')) {
          cashTotal += amt;
          cashierMap[cName].cashTotal += amt;
        } else if (method.includes('MPESA')) {
          mpesaTotal += amt;
          cashierMap[cName].mpesaTotal += amt;
        } else if (method.includes('CREDIT')) {
          creditTotal += amt;
          cashierMap[cName].creditTotal += amt;
        } else {
          cashTotal += amt;
          cashierMap[cName].cashTotal += amt;
        }
        cashierMap[cName].totalSales += amt;
        cashierMap[cName].count += 1;
      }
    });

    res.json({
      businessName: business?.name || bSettings?.businessName || 'Whiz POS Store',
      phone: bSettings?.phone || '',
      address: bSettings?.address || '',
      kraPin: business?.kraPin || bSettings?.kraPin || '',
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      summary: {
        totalSales,
        cashTotal,
        mpesaTotal,
        creditTotal,
        receiptCount: receipts.filter((r: any) => (r.status || '').toUpperCase() === 'COMPLETED').length
      },
      cashiers: Object.values(cashierMap),
      unpaidTabs,
      unpaidTotal
    });
  } catch (error) {
    console.error('Portal closing report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/sales', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { locationId } = req.query;
    const [receipts, mpesaTxns] = await Promise.all([
      prisma.receipt.findMany({
        where: { businessId, ...(locationId && locationId !== 'ALL' ? { locationId } : {}) },
        orderBy: { createdAt: 'desc' },
        take: 200
      }),
      prisma.mpesaTransaction.findMany({
        where: { businessId, ...(locationId && locationId !== 'ALL' ? { locationId } : {}) },
        orderBy: { timestamp: 'desc' },
        take: 200
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
    const businessId = req.user.businessId || req.user.userId || req.user.id;
    const { locationId } = req.query;
    const isFiltered = locationId && 
                       locationId !== 'ALL' && 
                       locationId !== 'undefined' && 
                       locationId !== 'null';

    const staff = await prisma.user.findMany({
      where: { 
        businessId, 
        ...(isFiltered ? { 
          OR: [
            { locationId: String(locationId) },
            { locationId: null },
            { role: 'ADMIN' },
            { role: 'MANAGER' }
          ]
        } : {}) 
      },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        role: true, 
        pin: true,
        outletId: true,
        locationId: true,
        createdAt: true 
      },
      orderBy: { createdAt: 'desc' }
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
      profit: totalRevenue * 0.3, 
      profitDelta: 0, 
      transactions: totalReceipts,
      transactionsDelta: 0 
    };

    let chartData: any[] = [];
    
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