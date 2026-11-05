// @ts-nocheck
import { Router } from 'express';
import db from '../db.js';
import { randomUUID } from 'crypto';
import { authenticate } from '../middleware/auth.js';
const router = Router();
router.use(authenticate);
const getLocalBusinessId = async (reqUser) => {
    const defaultBiz = await db.selectFrom('Business').select('id').executeTakeFirst();
    return defaultBiz?.id || reqUser?.businessId;
};
router.get('/summary', async (req, res) => {
    try {
        const businessId = await getLocalBusinessId(req.user);
        const { locationId } = req.query;
        let q1 = db.selectFrom('Receipt').select(['id', 'totalAmount', 'status', 'paymentMethod', 'cashierName', 'createdAt']).where('businessId', '=', businessId);
        if (locationId && locationId !== 'ALL')
            q1 = q1.where('locationId', '=', locationId);
        let q2 = db.selectFrom('Receipt').selectAll().where('businessId', '=', businessId).orderBy('createdAt', 'desc').limit(10);
        if (locationId && locationId !== 'ALL')
            q2 = q2.where('locationId', '=', locationId);
        const [receipts, recentReceipts] = await Promise.all([
            q1.execute().catch(() => []),
            q2.execute().catch(() => [])
        ]);
        const totalSales = receipts.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
        const completedCount = receipts.filter(r => r.status === 'COMPLETED').length;
        let cashTotal = 0;
        let mpesaTotal = 0;
        let creditTotal = 0;
        const cashierMap = {};
        const dayMap = {};
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            dayMap[key] = { label, sales: 0, count: 0 };
        }
        receipts.forEach(r => {
            const amt = Number(r.totalAmount) || 0;
            const method = (r.paymentMethod || 'CASH').toUpperCase();
            if (method.includes('CASH'))
                cashTotal += amt;
            else if (method.includes('MPESA'))
                mpesaTotal += amt;
            else if (method.includes('CREDIT'))
                creditTotal += amt;
            else
                cashTotal += amt;
            const cName = r.cashierName || 'Cashier';
            if (!cashierMap[cName])
                cashierMap[cName] = { name: cName, sales: 0, count: 0 };
            cashierMap[cName].sales += amt;
            cashierMap[cName].count += 1;
            if (r.createdAt) {
                try {
                    const dKey = new Date(r.createdAt).toISOString().slice(0, 10);
                    if (dayMap[dKey]) {
                        dayMap[dKey].sales += amt;
                        dayMap[dKey].count += 1;
                    }
                }
                catch (e) { }
            }
        });
        const paymentBreakdown = [
            { name: 'Cash', value: cashTotal, color: '#10b981' },
            { name: 'M-Pesa', value: mpesaTotal, color: '#06b6d4' },
            { name: 'Credit', value: creditTotal, color: '#f59e0b' }
        ];
        const trend = Object.values(dayMap);
        const topCashiers = Object.values(cashierMap).sort((a, b) => b.sales - a.sales).slice(0, 5);
        res.json({
            totalSales,
            receiptCount: receipts.length,
            completedCount,
            recentReceipts,
            cashTotal,
            mpesaTotal,
            creditTotal,
            paymentBreakdown,
            trend,
            topCashiers
        });
    }
    catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/closing-report', async (req, res) => {
    try {
        const businessId = await getLocalBusinessId(req.user);
        const business = await db.selectFrom('Business').selectAll().where('id', '=', businessId).executeTakeFirst();
        let bSettings = {};
        try {
            bSettings = typeof business?.settings === 'string' ? JSON.parse(business.settings) : (business?.settings || {});
        }
        catch (e) { }
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const receipts = await db.selectFrom('Receipt')
            .selectAll()
            .where('businessId', '=', businessId)
            .where('createdAt', '>=', todayStart.toISOString())
            .execute()
            .catch(() => []);
        let cashTotal = 0;
        let mpesaTotal = 0;
        let creditTotal = 0;
        let totalSales = 0;
        const cashierMap = {};
        const unpaidTabs = [];
        let unpaidTotal = 0;
        receipts.forEach((r) => {
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
                    customerName: r.customerName || 'Walk-in Tab',
                    tableNumber: r.tableNumber || r.billRef || '',
                    totalAmount: amt,
                    cashierName: cName,
                    createdAt: r.createdAt
                });
                unpaidTotal += amt;
            }
            else if (status !== 'CANCELLED') {
                totalSales += amt;
                const method = (r.paymentMethod || 'CASH').toUpperCase();
                if (method.includes('CASH')) {
                    cashTotal += amt;
                    cashierMap[cName].cashTotal += amt;
                }
                else if (method.includes('MPESA')) {
                    mpesaTotal += amt;
                    cashierMap[cName].mpesaTotal += amt;
                }
                else if (method.includes('CREDIT')) {
                    creditTotal += amt;
                    cashierMap[cName].creditTotal += amt;
                }
                else {
                    cashTotal += amt;
                    cashierMap[cName].cashTotal += amt;
                }
                cashierMap[cName].totalSales += amt;
                cashierMap[cName].count += 1;
            }
        });
        res.json({
            businessName: business?.name || bSettings?.businessName || 'Whiz POS Store',
            phone: bSettings?.phone || business?.phone || '',
            address: bSettings?.address || '',
            kraPin: business?.kraPin || bSettings?.kraPin || '',
            date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
            summary: {
                totalSales,
                cashTotal,
                mpesaTotal,
                creditTotal,
                receiptCount: receipts.filter((r) => (r.status || '').toUpperCase() === 'COMPLETED').length
            },
            cashiers: Object.values(cashierMap),
            unpaidTabs,
            unpaidTotal
        });
    }
    catch (error) {
        console.error('Closing report error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/sales', async (req, res) => {
    try {
        const businessId = await getLocalBusinessId(req.user);
        const { locationId } = req.query;
        let q1 = db.selectFrom('Receipt').selectAll().where('businessId', '=', businessId).orderBy('createdAt', 'desc');
        if (locationId && locationId !== 'ALL')
            q1 = q1.where('locationId', '=', locationId);
        let q2 = db.selectFrom('MpesaTransaction').selectAll().where('businessId', '=', businessId).orderBy('timestamp', 'desc');
        if (locationId && locationId !== 'ALL')
            q2 = q2.where('locationId', '=', locationId);
        const [receipts, mpesaTxns] = await Promise.all([
            q1.execute().catch(() => []),
            q2.execute().catch(() => [])
        ]);
        res.json({ receipts, mpesaTxns });
    }
    catch (error) {
        console.error('Sales error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/staff', async (req, res) => {
    try {
        const businessId = await getLocalBusinessId(req.user);
        const { locationId } = req.query;
        let q = db.selectFrom('User')
            .select(['id', 'email', 'name', 'role', 'pin', 'outletId', 'locationId', 'createdAt'])
            .where((eb) => eb.or([
            eb('businessId', '=', businessId),
            eb('businessId', 'is', null)
        ]));
        if (locationId && locationId !== 'ALL')
            q = q.where('locationId', '=', locationId);
        const staff = await q.execute().catch(() => []);
        res.json({ staff });
    }
    catch (error) {
        console.error('Staff error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/suppliers', async (req, res) => {
    try {
        const businessId = await getLocalBusinessId(req.user);
        const suppliers = await db.selectFrom('Supplier').selectAll().where('businessId', '=', businessId).orderBy('createdAt', 'desc').execute().catch(() => []);
        res.json({ suppliers });
    }
    catch (error) {
        console.error('Suppliers error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/reports', async (req, res) => {
    try {
        const businessId = await getLocalBusinessId(req.user);
        const { locationId } = req.query;
        let q1 = db.selectFrom('Receipt').select((eb) => eb.fn.count('id').as('count')).where('businessId', '=', businessId);
        if (locationId && locationId !== 'ALL')
            q1 = q1.where('locationId', '=', locationId);
        const [totalReceiptsRes, totalProductsRes, totalCustomersRes, receipts, allProducts] = await Promise.all([
            q1.executeTakeFirst().catch(() => ({ count: 0 })),
            db.selectFrom('Product').select((eb) => eb.fn.count('id').as('count')).where('businessId', '=', businessId).executeTakeFirst().catch(() => ({ count: 0 })),
            db.selectFrom('Customer').select((eb) => eb.fn.count('id').as('count')).where('businessId', '=', businessId).executeTakeFirst().catch(() => ({ count: 0 })),
            (async () => {
                let q4 = db.selectFrom('Receipt').select(['id', 'totalAmount', 'createdAt']).where('businessId', '=', businessId);
                if (locationId && locationId !== 'ALL')
                    q4 = q4.where('locationId', '=', locationId);
                return await q4.execute().catch(() => []);
            })(),
            db.selectFrom('Product').select(['id', 'name', 'costPrice', 'price']).where('businessId', '=', businessId).execute().catch(() => [])
        ]);
        const totalReceipts = Number(totalReceiptsRes?.count || 0);
        const totalRevenue = receipts.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
        const productCostMap = new Map();
        allProducts.forEach((p) => {
            if (p.name)
                productCostMap.set(p.name.trim().toLowerCase(), Number(p.costPrice) || 0);
        });
        const receiptIds = receipts.map((r) => r.id);
        let items = [];
        if (receiptIds.length > 0) {
            items = await db.selectFrom('ReceiptItem').selectAll().where('receiptId', 'in', receiptIds).execute().catch(() => []);
        }
        let totalProfit = 0;
        const receiptProfitMap = new Map();
        items.forEach((item) => {
            const nameKey = (item.productName || '').trim().toLowerCase();
            const cost = productCostMap.get(nameKey) ?? 0;
            const qty = Number(item.quantity) || 1;
            const revenue = Number(item.totalPrice) || ((Number(item.unitPrice) || 0) * qty);
            const profit = cost > 0 ? (revenue - (cost * qty)) : (revenue * 0.25);
            totalProfit += profit;
            receiptProfitMap.set(item.receiptId, (receiptProfitMap.get(item.receiptId) || 0) + profit);
        });
        if (items.length === 0 && totalRevenue > 0) {
            totalProfit = totalRevenue * 0.25;
        }
        const stats = {
            revenue: totalRevenue,
            revenueDelta: 0,
            profit: Math.round(totalProfit * 100) / 100,
            profitDelta: 0,
            transactions: totalReceipts,
            transactionsDelta: 0
        };
        const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const salesByDay = {};
        dayOrder.forEach(d => { salesByDay[d] = { sales: 0, profit: 0 }; });
        receipts.forEach((r) => {
            const d = new Date(r.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
            if (salesByDay[d]) {
                const rev = Number(r.totalAmount) || 0;
                const pft = receiptProfitMap.get(r.id) ?? (rev * 0.25);
                salesByDay[d].sales += rev;
                salesByDay[d].profit += pft;
            }
        });
        const chartData = dayOrder.map(day => ({
            name: day,
            sales: Math.round(salesByDay[day].sales * 100) / 100,
            profit: Math.round(salesByDay[day].profit * 100) / 100
        }));
        res.json({ stats, chartData });
    }
    catch (error) {
        console.error('Reports error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// ==========================================
// 1. Stock Valuation Report
// ==========================================
router.get('/reports/stock-valuation', async (req, res) => {
    try {
        const businessId = await getLocalBusinessId(req.user);
        const { locationId, outletId } = req.query;
        const products = await db.selectFrom('Product').selectAll().where('businessId', '=', businessId).orderBy('name', 'asc').execute();
        const invs = await db.selectFrom('ProductInventory').selectAll().where('productId', 'in', products.length > 0 ? products.map(p => p.id) : ['']).execute();
        let totalCostValue = 0;
        let totalRetailValue = 0;
        let totalUnits = 0;
        const categoryBreakdown = {};
        const items = products.map((p) => {
            let filteredInvs = invs.filter((i) => i.productId === p.id);
            if (outletId && outletId !== 'ALL') {
                filteredInvs = filteredInvs.filter((i) => i.outletId === outletId);
            }
            else if (locationId && locationId !== 'ALL') {
                filteredInvs = filteredInvs.filter((i) => i.locationId === locationId);
            }
            const totalStock = filteredInvs.reduce((sum, i) => sum + (Number(i.stock) || 0), 0);
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
    }
    catch (error) {
        console.error('Local stock valuation error:', error);
        res.status(500).json({ error: 'Failed to calculate stock valuation' });
    }
});
// ==========================================
// 2. Dead Stock Report
// ==========================================
router.get('/reports/dead-stock', async (req, res) => {
    try {
        const businessId = await getLocalBusinessId(req.user);
        const { days = '30' } = req.query;
        const dayThreshold = parseInt(String(days), 10) || 30;
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - dayThreshold);
        const thresholdIso = thresholdDate.toISOString();
        const products = await db.selectFrom('Product').selectAll().where('businessId', '=', businessId).execute();
        const invs = await db.selectFrom('ProductInventory').selectAll().where('productId', 'in', products.length > 0 ? products.map(p => p.id) : ['']).execute();
        const recentReceipts = await db.selectFrom('Receipt').select(['id', 'createdAt']).where('businessId', '=', businessId).where('createdAt', '>=', thresholdIso).execute();
        const recentReceiptIds = recentReceipts.map(r => r.id);
        const recentItems = recentReceiptIds.length > 0
            ? await db.selectFrom('ReceiptItem').selectAll().where('receiptId', 'in', recentReceiptIds).execute()
            : [];
        const soldMap = new Map();
        for (const item of recentItems) {
            const pName = (item.productName || '').trim().toLowerCase();
            soldMap.set(pName, (soldMap.get(pName) || 0) + (Number(item.quantity) || 0));
        }
        let totalTiedUpCapital = 0;
        let totalDeadUnits = 0;
        const now = Date.now();
        const deadItems = [];
        for (const p of products) {
            const pInvs = invs.filter(i => i.productId === p.id);
            const totalStock = pInvs.reduce((sum, i) => sum + (Number(i.stock) || 0), 0);
            if (totalStock <= 0)
                continue;
            const pKey = (p.name || '').trim().toLowerCase();
            const unitsSold = soldMap.get(pKey) || 0;
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
                }
                else if (daysDormant >= 60) {
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
    }
    catch (error) {
        console.error('Local dead stock error:', error);
        res.status(500).json({ error: 'Failed to generate dead stock report' });
    }
});
// ==========================================
// 3. Top 20 Pareto Bestsellers
// ==========================================
router.get('/reports/pareto-bestsellers', async (req, res) => {
    try {
        const businessId = await getLocalBusinessId(req.user);
        const { period = '30d' } = req.query;
        const startDate = new Date();
        if (period === '7d')
            startDate.setDate(startDate.getDate() - 7);
        else if (period === '90d')
            startDate.setDate(startDate.getDate() - 90);
        else
            startDate.setDate(startDate.getDate() - 30);
        const receipts = await db.selectFrom('Receipt').select(['id', 'totalAmount']).where('businessId', '=', businessId).where('status', '=', 'COMPLETED').where('createdAt', '>=', startDate.toISOString()).execute();
        const rIds = receipts.map(r => r.id);
        const items = rIds.length > 0 ? await db.selectFrom('ReceiptItem').selectAll().where('receiptId', 'in', rIds).execute() : [];
        const products = await db.selectFrom('Product').selectAll().where('businessId', '=', businessId).execute();
        const productCostMap = new Map();
        products.forEach((p) => {
            productCostMap.set((p.name || '').trim().toLowerCase(), Number(p.costPrice) || 0);
        });
        const itemMap = new Map();
        let totalBusinessRevenue = 0;
        for (const item of items) {
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
    }
    catch (error) {
        console.error('Local Pareto error:', error);
        res.status(500).json({ error: 'Failed to calculate Pareto bestsellers' });
    }
});
// ==========================================
// 4. Physical Stocktake & Variance
// ==========================================
router.get('/reports/stocktake-variance', async (req, res) => {
    try {
        const businessId = await getLocalBusinessId(req.user);
        const products = await db.selectFrom('Product').selectAll().where('businessId', '=', businessId).orderBy('name', 'asc').execute();
        const invs = await db.selectFrom('ProductInventory').selectAll().where('productId', 'in', products.length > 0 ? products.map(p => p.id) : ['']).execute();
        const items = products.map((p) => {
            const pInvs = invs.filter(i => i.productId === p.id);
            const expectedStock = pInvs.reduce((sum, i) => sum + (Number(i.stock) || 0), 0);
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
    }
    catch (error) {
        console.error('Local stocktake variance error:', error);
        res.status(500).json({ error: 'Failed to fetch stocktake list' });
    }
});
router.post('/reports/stocktake-commit', async (req, res) => {
    try {
        const businessId = await getLocalBusinessId(req.user);
        const { counts, notes = 'Physical Stocktake Reconciliation' } = req.body;
        if (!Array.isArray(counts)) {
            return res.status(400).json({ error: 'counts must be an array' });
        }
        const now = new Date().toISOString();
        let reconciledCount = 0;
        let netVarianceValue = 0;
        for (const c of counts) {
            const { productId, actualStock, expectedStock, costPrice } = c;
            if (!productId || actualStock === undefined)
                continue;
            const variance = Number(actualStock) - Number(expectedStock || 0);
            if (variance === 0)
                continue;
            const cost = Number(costPrice) || 0;
            netVarianceValue += (variance * cost);
            const inv = await db.selectFrom('ProductInventory').selectAll().where('productId', '=', productId).executeTakeFirst();
            if (inv) {
                await db.updateTable('ProductInventory')
                    .set({ stock: Math.max(0, Number(actualStock)), updatedAt: now })
                    .where('id', '=', inv.id)
                    .execute();
            }
            await db.insertInto('StockMovement').values({
                id: randomUUID(),
                businessId,
                productId,
                locationId: inv?.locationId || 'default',
                outletId: inv?.outletId || null,
                type: variance > 0 ? 'STOCKTAKE_SURPLUS' : 'STOCKTAKE_SHRINKAGE',
                quantity: variance,
                reference: `${notes} (Expected: ${expectedStock}, Actual: ${actualStock})`,
                sourceTerminal: 'BACKOFFICE',
                timestamp: now,
                updatedAt: now
            }).execute();
            reconciledCount++;
        }
        res.json({ success: true, reconciledCount, netVarianceValue: Math.round(netVarianceValue * 100) / 100 });
    }
    catch (error) {
        console.error('Local stocktake commit error:', error);
        res.status(500).json({ error: 'Failed to commit stocktake' });
    }
});
// ==========================================
// 5. M-Pesa Statement Reconciler
// ==========================================
router.post('/reports/reconcile-mpesa', async (req, res) => {
    try {
        const businessId = await getLocalBusinessId(req.user);
        const { statementTransactions } = req.body;
        if (!Array.isArray(statementTransactions) || statementTransactions.length === 0) {
            return res.status(400).json({ error: 'statementTransactions array is required' });
        }
        const dbReceipts = await db.selectFrom('Receipt').selectAll().where('businessId', '=', businessId).where('paymentMethod', 'like', '%MPESA%').orderBy('createdAt', 'desc').limit(500).execute();
        const dbMpesaTxns = await db.selectFrom('MpesaTransaction').selectAll().where('businessId', '=', businessId).orderBy('timestamp', 'desc').limit(500).execute();
        const receiptByCode = new Map();
        dbReceipts.forEach(r => {
            if (r.mpesaCode)
                receiptByCode.set(r.mpesaCode.trim().toUpperCase(), r);
        });
        const mpesaTxnByCode = new Map();
        dbMpesaTxns.forEach(t => {
            if (t.transactionId)
                mpesaTxnByCode.set(t.transactionId.trim().toUpperCase(), t);
        });
        const matched = [];
        const unmatchedTill = [];
        const processedStatementCodes = new Set();
        for (const stmt of statementTransactions) {
            const code = String(stmt.code || stmt.receiptNumber || stmt.transactionId || '').trim().toUpperCase();
            if (!code)
                continue;
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
            }
            else {
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
        const missingOnStatement = [];
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
    }
    catch (error) {
        console.error('Local M-Pesa reconcile error:', error);
        res.status(500).json({ error: 'Failed to reconcile M-Pesa statement' });
    }
});
// ==========================================
// 6. Comprehensive Executive Daily Summary
// ==========================================
router.get('/reports/executive-daily', async (req, res) => {
    try {
        const businessId = await getLocalBusinessId(req.user);
        const { date } = req.query;
        const targetDate = date ? new Date(date) : new Date();
        const dayStart = new Date(targetDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(targetDate);
        dayEnd.setHours(23, 59, 59, 999);
        const business = await db.selectFrom('Business').selectAll().where('id', '=', businessId).executeTakeFirst();
        const receipts = await db.selectFrom('Receipt').selectAll().where('businessId', '=', businessId).where('createdAt', '>=', dayStart.toISOString()).where('createdAt', '<=', dayEnd.toISOString()).orderBy('createdAt', 'desc').execute();
        const rIds = receipts.map(r => r.id);
        const receiptItems = rIds.length > 0 ? await db.selectFrom('ReceiptItem').selectAll().where('receiptId', 'in', rIds).execute() : [];
        const products = await db.selectFrom('Product').selectAll().where('businessId', '=', businessId).execute();
        const invs = await db.selectFrom('ProductInventory').selectAll().where('productId', 'in', products.length > 0 ? products.map(p => p.id) : ['']).execute();
        let totalRevenue = 0;
        let cashTotal = 0;
        let mpesaTotal = 0;
        let creditTotal = 0;
        const cashierTotals = {};
        receipts.forEach((r) => {
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
            }
            else if (method.includes('CREDIT')) {
                creditTotal += amt;
            }
            else {
                cashTotal += amt;
                cashierTotals[cName].cash += amt;
            }
        });
        const productSoldMap = new Map();
        receiptItems.forEach((item) => {
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
        products.forEach((p) => {
            const pInvs = invs.filter(i => i.productId === p.id);
            const stock = pInvs.reduce((sum, i) => sum + (Number(i.stock) || 0), 0);
            const cost = Number(p.costPrice) || 0;
            totalStockUnits += stock;
            totalInventoryCost += (stock * cost);
            if (stock <= (p.reorderLevel || 5))
                lowStockCount++;
        });
        const grossProfit = Math.round(totalRevenue * 0.28 * 100) / 100;
        const vatTax = Math.round((totalRevenue / 1.16) * 0.16 * 100) / 100;
        let bSettings = {};
        try {
            bSettings = typeof business?.settings === 'string' ? JSON.parse(business.settings || '{}') : (business?.settings || {});
        }
        catch (e) { }
        const resolvedKraPin = business?.kraPin || bSettings.kraPin || bSettings.etimsPin || '';
        const resolvedPhone = bSettings.phone || bSettings.contact || business?.phone || '';
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
    }
    catch (error) {
        console.error('Local executive daily report error:', error);
        res.status(500).json({ error: 'Failed to generate executive daily report' });
    }
});
export default router;
