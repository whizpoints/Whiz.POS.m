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

    const [aggregations, totalProducts, totalCustomers, allProducts, dbReceipts] = await Promise.all([
      prisma.receipt.aggregate({
        where: whereClause,
        _sum: { totalAmount: true },
        _count: { id: true }
      }),
      prisma.product.count({ where: { businessId } }),
      prisma.customer.count({ where: { businessId } }),
      prisma.product.findMany({
        where: { businessId },
        select: { id: true, name: true, costPrice: true, price: true }
      }),
      prisma.receipt.findMany({
        where: whereClause,
        include: { items: true },
        orderBy: { createdAt: 'asc' }
      })
    ]);

    const productCostMap = new Map<string, number>();
    allProducts.forEach(p => {
      if (p.name) productCostMap.set(p.name.trim().toLowerCase(), p.costPrice || 0);
    });

    let totalProfit = 0;
    const receiptProfitMap = new Map<string, number>();

    dbReceipts.forEach(r => {
      let rProfit = 0;
      if (r.items && r.items.length > 0) {
        r.items.forEach(item => {
          const nameKey = (item.productName || '').trim().toLowerCase();
          const cost = productCostMap.get(nameKey) ?? 0;
          const qty = Number(item.quantity) || 1;
          const itemRev = Number(item.totalPrice) || ((Number(item.unitPrice) || 0) * qty);
          const pft = cost > 0 ? (itemRev - (cost * qty)) : (itemRev * 0.25);
          rProfit += pft;
        });
      } else {
        rProfit = (r.totalAmount || 0) * 0.25;
      }
      totalProfit += rProfit;
      receiptProfitMap.set(r.id, rProfit);
    });

    const totalRevenue = aggregations._sum.totalAmount || 0;
    const totalReceipts = aggregations._count.id || 0;

    const stats = { 
      revenue: totalRevenue, 
      revenueDelta: 0, 
      profit: Math.round(totalProfit * 100) / 100, 
      profitDelta: 0, 
      transactions: totalReceipts,
      transactionsDelta: 0 
    };

    let chartData: any[] = [];
    
    if (!groupBy || groupBy === 'day') {
      const salesByDay: Record<string, { sales: number; profit: number }> = {};
      dbReceipts.forEach(r => {
         const d = new Date(r.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
         if (!salesByDay[d]) salesByDay[d] = { sales: 0, profit: 0 };
         salesByDay[d].sales += r.totalAmount || 0;
         salesByDay[d].profit += receiptProfitMap.get(r.id) || ((r.totalAmount || 0) * 0.25);
      });

      chartData = Object.keys(salesByDay).map(day => ({
         name: day,
         sales: Math.round(salesByDay[day].sales * 100) / 100,
         profit: Math.round(salesByDay[day].profit * 100) / 100
      }));
    } else if (groupBy === 'branch') {
      const branchMap: Record<string, { sales: number; profit: number }> = {};
      dbReceipts.forEach(r => {
        const locId = r.locationId || 'unknown';
        if (!branchMap[locId]) branchMap[locId] = { sales: 0, profit: 0 };
        branchMap[locId].sales += r.totalAmount || 0;
        branchMap[locId].profit += receiptProfitMap.get(r.id) || ((r.totalAmount || 0) * 0.25);
      });
      const locations = await prisma.storeLocation.findMany({ where: { businessId } });
      chartData = Object.keys(branchMap).map(locId => {
         const loc = locations.find(l => l.id === locId);
         return {
            name: loc?.name || 'Central Store',
            sales: Math.round(branchMap[locId].sales * 100) / 100,
            profit: Math.round(branchMap[locId].profit * 100) / 100
         };
      });
    }

    res.json({ stats, chartData });
  } catch (error) {
    console.error('Reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ==========================================
// 1. Stock Valuation Report (At Cost vs At Selling Price)
// ==========================================
router.get('/reports/stock-valuation', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { locationId, outletId } = req.query;

    const products = await prisma.product.findMany({
      where: { businessId },
      include: { inventory: true },
      orderBy: { name: 'asc' }
    });

    let totalCostValue = 0;
    let totalRetailValue = 0;
    let totalUnits = 0;
    const categoryBreakdown: Record<string, { category: string; units: number; costValue: number; retailValue: number; profit: number }> = {};

    const items = products.map((p: any) => {
      let filteredInvs = p.inventory || [];
      if (outletId && outletId !== 'ALL') {
        filteredInvs = filteredInvs.filter((i: any) => i.outletId === outletId);
      } else if (locationId && locationId !== 'ALL') {
        filteredInvs = filteredInvs.filter((i: any) => i.locationId === locationId);
      }

      const totalStock = filteredInvs.reduce((sum: number, i: any) => sum + (Number(i.stock) || 0), 0);
      const costPrice = Number(p.costPrice) || 0;
      const sellingPrice = Number(p.price) || 0;
      const costValue = totalStock * costPrice;
      const retailValue = totalStock * sellingPrice;
      const potentialProfit = Math.max(0, retailValue - costValue);
      const marginPct = retailValue > 0 ? Math.round(((retailValue - costValue) / retailValue) * 100) : 0;

      totalCostValue += costValue;
      totalRetailValue += retailValue;
      totalUnits += totalStock;

      const cat = p.category || 'Uncategorized';
      if (!categoryBreakdown[cat]) {
        categoryBreakdown[cat] = { category: cat, units: 0, costValue: 0, retailValue: 0, profit: 0 };
      }
      categoryBreakdown[cat].units += totalStock;
      categoryBreakdown[cat].costValue += costValue;
      categoryBreakdown[cat].retailValue += retailValue;
      categoryBreakdown[cat].profit += potentialProfit;

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: cat,
        stock: totalStock,
        reorderLevel: p.reorderLevel || 5,
        costPrice,
        sellingPrice,
        costValue,
        retailValue,
        potentialProfit,
        marginPct
      };
    });

    const potentialProfit = totalRetailValue - totalCostValue;
    const overallMargin = totalRetailValue > 0 ? Math.round((potentialProfit / totalRetailValue) * 100) : 0;

    res.json({
      summary: {
        totalProducts: products.length,
        totalUnits,
        totalCostValue: Math.round(totalCostValue * 100) / 100,
        totalRetailValue: Math.round(totalRetailValue * 100) / 100,
        potentialProfit: Math.round(potentialProfit * 100) / 100,
        overallMargin
      },
      categories: Object.values(categoryBreakdown),
      items
    });
  } catch (error: any) {
    console.error('Stock valuation error:', error);
    res.status(500).json({ error: 'Failed to calculate stock valuation' });
  }
});

// ==========================================
// 2. Dead Stock & Slow-Moving Items Report
// ==========================================
router.get('/reports/dead-stock', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { days = '30' } = req.query;
    const dayThreshold = parseInt(String(days), 10) || 30;

    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - dayThreshold);

    const [products, recentReceiptItems] = await Promise.all([
      prisma.product.findMany({
        where: { businessId },
        include: { inventory: true },
        orderBy: { name: 'asc' }
      }),
      prisma.receiptItem.findMany({
        where: {
          receipt: {
            businessId,
            createdAt: { gte: thresholdDate }
          }
        },
        select: {
          productName: true,
          quantity: true,
          receipt: { select: { createdAt: true } }
        }
      })
    ]);

    const soldMap = new Map<string, { qty: number; lastSold: Date | null }>();
    for (const item of recentReceiptItems) {
      const pName = (item.productName || '').trim().toLowerCase();
      const cur = soldMap.get(pName) || { qty: 0, lastSold: null };
      cur.qty += Number(item.quantity) || 0;
      if (!cur.lastSold || new Date(item.receipt.createdAt) > cur.lastSold) {
        cur.lastSold = new Date(item.receipt.createdAt);
      }
      soldMap.set(pName, cur);
    }

    let totalTiedUpCapital = 0;
    let totalDeadUnits = 0;
    const now = Date.now();

    const deadItems: any[] = [];
    for (const p of products) {
      const totalStock = (p.inventory || []).reduce((sum: number, i: any) => sum + (Number(i.stock) || 0), 0);
      if (totalStock <= 0) continue;

      const pKey = (p.name || '').trim().toLowerCase();
      const salesInfo = soldMap.get(pKey);
      const unitsSold = salesInfo ? salesInfo.qty : 0;

      if (unitsSold === 0) {
        const cost = Number(p.costPrice) || (Number(p.price) * 0.7);
        const tiedCapital = totalStock * cost;
        totalTiedUpCapital += tiedCapital;
        totalDeadUnits += totalStock;

        const createdAtTime = new Date(p.createdAt).getTime();
        const daysDormant = Math.max(dayThreshold, Math.floor((now - createdAtTime) / (1000 * 60 * 60 * 24)));

        let status = 'SLOW_MOVING';
        let recommendation = 'Bundle with popular items or discount 10%';
        if (daysDormant >= 90) {
          status = 'DEAD_STOCK';
          recommendation = 'Flash sale, liquidate, or return to vendor';
        } else if (daysDormant >= 60) {
          status = 'DORMANT';
          recommendation = 'Relocate to prominent shelf or offer 15% discount';
        }

        deadItems.push({
          id: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category || 'General',
          stock: totalStock,
          costPrice: cost,
          sellingPrice: Number(p.price) || 0,
          tiedUpCapital: Math.round(tiedCapital * 100) / 100,
          daysDormant,
          status,
          recommendation
        });
      }
    }

    deadItems.sort((a, b) => b.tiedUpCapital - a.tiedUpCapital);

    res.json({
      summary: {
        totalDeadProducts: deadItems.length,
        totalDeadUnits,
        totalTiedUpCapital: Math.round(totalTiedUpCapital * 100) / 100,
        dayThreshold
      },
      items: deadItems
    });
  } catch (error: any) {
    console.error('Dead stock error:', error);
    res.status(500).json({ error: 'Failed to generate dead stock report' });
  }
});

// ==========================================
// 3. Top 20 Pareto (80/20) Bestsellers
// ==========================================
router.get('/reports/pareto-bestsellers', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { period = '30d' } = req.query;

    const startDate = new Date();
    if (period === '7d') startDate.setDate(startDate.getDate() - 7);
    else if (period === '90d') startDate.setDate(startDate.getDate() - 90);
    else startDate.setDate(startDate.getDate() - 30);

    const [receiptItems, products] = await Promise.all([
      prisma.receiptItem.findMany({
        where: {
          receipt: {
            businessId,
            status: 'COMPLETED',
            createdAt: { gte: startDate }
          }
        },
        include: { receipt: true }
      }),
      prisma.product.findMany({ where: { businessId } })
    ]);

    const productCostMap = new Map<string, number>();
    products.forEach((p: any) => {
      productCostMap.set((p.name || '').trim().toLowerCase(), Number(p.costPrice) || 0);
    });

    const itemMap = new Map<string, { name: string; unitsSold: number; totalRevenue: number; totalCost: number }>();
    let totalBusinessRevenue = 0;

    for (const item of receiptItems) {
      const name = (item.productName || 'Unknown').trim();
      const key = name.toLowerCase();
      const qty = Number(item.quantity) || 0;
      const rev = Number(item.totalPrice) || ((Number(item.unitPrice) || 0) * qty);
      const unitCost = productCostMap.get(key) || 0;
      const cost = unitCost > 0 ? (unitCost * qty) : (rev * 0.7);

      totalBusinessRevenue += rev;
      const cur = itemMap.get(key) || { name, unitsSold: 0, totalRevenue: 0, totalCost: 0 };
      cur.unitsSold += qty;
      cur.totalRevenue += rev;
      cur.totalCost += cost;
      itemMap.set(key, cur);
    }

    const sorted = Array.from(itemMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);

    let cumulativeRevenue = 0;
    const paretoItems = sorted.map((item, idx) => {
      cumulativeRevenue += item.totalRevenue;
      const grossProfit = Math.max(0, item.totalRevenue - item.totalCost);
      const marginPct = item.totalRevenue > 0 ? Math.round((grossProfit / item.totalRevenue) * 100) : 0;
      const revenuePct = totalBusinessRevenue > 0 ? Math.round((item.totalRevenue / totalBusinessRevenue) * 1000) / 10 : 0;
      const cumulativePct = totalBusinessRevenue > 0 ? Math.round((cumulativeRevenue / totalBusinessRevenue) * 100) : 0;

      return {
        rank: idx + 1,
        name: item.name,
        unitsSold: item.unitsSold,
        totalRevenue: Math.round(item.totalRevenue * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        marginPct,
        revenuePct,
        cumulativePct,
        isPareto80: cumulativePct <= 80
      };
    });

    const top20 = paretoItems.slice(0, 20);
    const pareto80Count = paretoItems.filter(i => i.isPareto80).length;

    res.json({
      summary: {
        totalRevenue: Math.round(totalBusinessRevenue * 100) / 100,
        uniqueItemsSold: sorted.length,
        paretoCoreCount: pareto80Count || Math.min(top20.length, 5),
        period
      },
      top20
    });
  } catch (error: any) {
    console.error('Pareto error:', error);
    res.status(500).json({ error: 'Failed to calculate Pareto bestsellers' });
  }
});

// ==========================================
// 4. Physical Stocktake & Variance Audit
// ==========================================
router.get('/reports/stocktake-variance', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const products = await prisma.product.findMany({
      where: { businessId },
      include: { inventory: true },
      orderBy: { name: 'asc' }
    });

    const items = products.map((p: any) => {
      const expectedStock = (p.inventory || []).reduce((sum: number, i: any) => sum + (Number(i.stock) || 0), 0);
      return {
        productId: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category || 'General',
        costPrice: Number(p.costPrice) || 0,
        sellingPrice: Number(p.price) || 0,
        expectedStock,
        countedStock: expectedStock
      };
    });

    res.json({ products: items });
  } catch (error: any) {
    console.error('Stocktake variance error:', error);
    res.status(500).json({ error: 'Failed to fetch stocktake list' });
  }
});

router.post('/reports/stocktake-commit', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { counts, notes = 'Physical Stocktake Reconciliation' } = req.body;

    if (!Array.isArray(counts)) {
      return res.status(400).json({ error: 'counts must be an array' });
    }

    const now = new Date();
    let reconciledCount = 0;
    let netVarianceValue = 0;

    for (const c of counts) {
      const { productId, actualStock, expectedStock, costPrice } = c;
      if (!productId || actualStock === undefined) continue;

      const variance = Number(actualStock) - Number(expectedStock || 0);
      if (variance === 0) continue;

      const cost = Number(costPrice) || 0;
      netVarianceValue += (variance * cost);

      const inv = await prisma.productInventory.findFirst({
        where: { productId }
      });
      if (inv) {
        await prisma.productInventory.update({
          where: { id: inv.id },
          data: { stock: Math.max(0, Number(actualStock)) }
        });
      }

      await prisma.stockMovement.create({
        data: {
          businessId,
          productId,
          locationId: inv?.locationId || 'default',
          type: variance > 0 ? 'STOCKTAKE_SURPLUS' : 'STOCKTAKE_SHRINKAGE',
          quantity: variance,
          reference: `${notes} (Expected: ${expectedStock}, Actual: ${actualStock})`,
          sourceTerminal: 'BACKOFFICE',
          timestamp: now
        }
      });
      reconciledCount++;
    }

    res.json({ success: true, reconciledCount, netVarianceValue: Math.round(netVarianceValue * 100) / 100 });
  } catch (error: any) {
    console.error('Stocktake commit error:', error);
    res.status(500).json({ error: 'Failed to commit stocktake' });
  }
});

// ==========================================
// 5. M-Pesa Statement Reconciler
// ==========================================
router.post('/reports/reconcile-mpesa', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { statementTransactions } = req.body;

    if (!Array.isArray(statementTransactions) || statementTransactions.length === 0) {
      return res.status(400).json({ error: 'statementTransactions array is required' });
    }

    const [dbReceipts, dbMpesaTxns] = await Promise.all([
      prisma.receipt.findMany({
        where: { businessId, paymentMethod: { contains: 'MPESA' } },
        orderBy: { createdAt: 'desc' },
        take: 500
      }),
      prisma.mpesaTransaction.findMany({
        where: { businessId },
        orderBy: { timestamp: 'desc' },
        take: 500
      })
    ]);

    const receiptByCode = new Map<string, any>();
    dbReceipts.forEach(r => {
      if (r.mpesaCode) receiptByCode.set(r.mpesaCode.trim().toUpperCase(), r);
    });

    const mpesaTxnByCode = new Map<string, any>();
    dbMpesaTxns.forEach(t => {
      if (t.transactionId) mpesaTxnByCode.set(t.transactionId.trim().toUpperCase(), t);
    });

    const matched: any[] = [];
    const unmatchedTill: any[] = [];
    const processedStatementCodes = new Set<string>();

    for (const stmt of statementTransactions) {
      const code = String(stmt.code || stmt.receiptNumber || stmt.transactionId || '').trim().toUpperCase();
      if (!code) continue;
      processedStatementCodes.add(code);

      const amt = Number(stmt.amount) || 0;
      const matchedReceipt = receiptByCode.get(code);
      const matchedRaw = mpesaTxnByCode.get(code);

      if (matchedReceipt) {
        matched.push({
          code,
          statementAmount: amt,
          receiptAmount: matchedReceipt.totalAmount,
          customerName: matchedReceipt.cashierName || matchedRaw?.customerName || 'Verified Customer',
          receiptNumber: matchedReceipt.receiptNumber,
          date: stmt.date || matchedReceipt.createdAt,
          status: 'MATCHED'
        });
      } else {
        unmatchedTill.push({
          code,
          statementAmount: amt,
          customerName: stmt.name || matchedRaw?.customerName || 'Unlinked M-Pesa Payment',
          date: stmt.date || new Date().toISOString(),
          status: 'TILL_ONLY_UNRECORDED',
          note: 'Payment received on Safaricom Till/Paybill but no receipt created on POS'
        });
      }
    }

    const missingOnStatement: any[] = [];
    dbReceipts.slice(0, 50).forEach(r => {
      const c = (r.mpesaCode || '').trim().toUpperCase();
      if (c && !processedStatementCodes.has(c)) {
        missingOnStatement.push({
          code: c,
          receiptAmount: r.totalAmount,
          receiptNumber: r.receiptNumber,
          cashierName: r.cashierName,
          date: r.createdAt,
          status: 'POS_ONLY_MISSING_ON_STATEMENT'
        });
      }
    });

    res.json({
      summary: {
        totalStatementEntries: statementTransactions.length,
        matchedCount: matched.length,
        unmatchedTillCount: unmatchedTill.length,
        missingOnStatementCount: missingOnStatement.length,
        reconciliationRate: statementTransactions.length > 0 ? Math.round((matched.length / statementTransactions.length) * 100) : 0
      },
      matched,
      unmatchedTill,
      missingOnStatement
    });
  } catch (error: any) {
    console.error('M-Pesa reconcile error:', error);
    res.status(500).json({ error: 'Failed to reconcile M-Pesa statement' });
  }
});

// ==========================================
// 6. Comprehensive Executive Daily Summary
// ==========================================
router.get('/reports/executive-daily', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { date } = req.query;

    const targetDate = date ? new Date(date) : new Date();
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    const [business, receipts, receiptItems, products] = await Promise.all([
      prisma.business.findUnique({ where: { id: businessId } }),
      prisma.receipt.findMany({
        where: { businessId, createdAt: { gte: dayStart, lte: dayEnd } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.receiptItem.findMany({
        where: { receipt: { businessId, createdAt: { gte: dayStart, lte: dayEnd } } }
      }),
      prisma.product.findMany({
        where: { businessId },
        include: { inventory: true }
      })
    ]);

    let totalRevenue = 0;
    let cashTotal = 0;
    let mpesaTotal = 0;
    let creditTotal = 0;
    const cashierTotals: Record<string, { name: string; sales: number; bills: number; cash: number; mpesa: number }> = {};

    receipts.forEach((r: any) => {
      const amt = Number(r.totalAmount) || 0;
      totalRevenue += amt;
      const method = (r.paymentMethod || 'CASH').toUpperCase();
      const cName = r.cashierName || 'Staff';

      if (!cashierTotals[cName]) {
        cashierTotals[cName] = { name: cName, sales: 0, bills: 0, cash: 0, mpesa: 0 };
      }
      cashierTotals[cName].sales += amt;
      cashierTotals[cName].bills += 1;

      if (method.includes('MPESA')) {
        mpesaTotal += amt;
        cashierTotals[cName].mpesa += amt;
      } else if (method.includes('CREDIT')) {
        creditTotal += amt;
      } else {
        cashTotal += amt;
        cashierTotals[cName].cash += amt;
      }
    });

    const productSoldMap = new Map<string, { name: string; qty: number; revenue: number }>();
    receiptItems.forEach((item: any) => {
      const name = (item.productName || 'Item').trim();
      const qty = Number(item.quantity) || 0;
      const rev = Number(item.totalPrice) || ((Number(item.unitPrice) || 0) * qty);
      const cur = productSoldMap.get(name) || { name, qty: 0, revenue: 0 };
      cur.qty += qty;
      cur.revenue += rev;
      productSoldMap.set(name, cur);
    });

    const topBestsellers = Array.from(productSoldMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    let totalStockUnits = 0;
    let totalInventoryCost = 0;
    let lowStockCount = 0;

    products.forEach((p: any) => {
      const stock = (p.inventory || []).reduce((sum: number, i: any) => sum + (Number(i.stock) || 0), 0);
      const cost = Number(p.costPrice) || 0;
      totalStockUnits += stock;
      totalInventoryCost += (stock * cost);
      if (stock <= (p.reorderLevel || 5)) lowStockCount++;
    });

    const grossProfit = Math.round(totalRevenue * 0.28 * 100) / 100;
    const vatTax = Math.round((totalRevenue / 1.16) * 0.16 * 100) / 100;

    let bSettings: any = {};
    try {
      bSettings = typeof business?.settings === 'string' ? JSON.parse(business.settings || '{}') : (business?.settings || {});
    } catch (e) {}

    const resolvedKraPin = business?.kraPin || bSettings.kraPin || bSettings.etimsPin || '';
    const resolvedPhone = bSettings.phone || bSettings.contact || (business as any)?.phone || '';
    const resolvedEmail = business?.email || bSettings.email || '';

    res.json({
      business: {
        name: business?.name || 'Business',
        phone: resolvedPhone,
        email: resolvedEmail,
        kraPin: resolvedKraPin
      },
      date: dayStart.toISOString().slice(0, 10),
      metrics: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        grossProfit,
        vatTax,
        billCount: receipts.length,
        avgBasketValue: receipts.length > 0 ? Math.round((totalRevenue / receipts.length) * 100) / 100 : 0
      },
      paymentSplit: {
        cash: Math.round(cashTotal * 100) / 100,
        mpesa: Math.round(mpesaTotal * 100) / 100,
        credit: Math.round(creditTotal * 100) / 100
      },
      expenses: [],
      totalExpenses: 0,
      netProfit: grossProfit,
      topBestsellers,
      cashiers: Object.values(cashierTotals),
      inventoryHealth: {
        totalStockUnits,
        totalInventoryCost: Math.round(totalInventoryCost * 100) / 100,
        lowStockCount
      }
    });
  } catch (error: any) {
    console.error('Executive daily report error:', error);
    res.status(500).json({ error: 'Failed to generate executive daily report' });
  }
});

export default router;