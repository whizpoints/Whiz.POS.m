import { Router } from 'express';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import prisma from '../prisma.js';
import jwt from 'jsonwebtoken';
const router = Router();
// const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader)
        return res.status(401).json({ error: 'Missing authorization header' });
    const token = authHeader.split(' ')[1];
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    }
    catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};
router.use(authenticate);
router.get('/summary', async (req, res) => {
    try {
        const { businessId } = req.user;
        const { locationId } = req.query;
        const [receipts, recentReceipts] = await Promise.all([
            prisma.receipt.findMany({
                where: { businessId, ...(locationId ? { locationId } : {}) },
                select: { totalAmount: true, status: true, createdAt: true }
            }),
            prisma.receipt.findMany({
                where: { businessId, ...(locationId ? { locationId } : {}) },
                orderBy: { createdAt: 'desc' },
                take: 10
            })
        ]);
        const totalSales = receipts.reduce((sum, r) => sum + r.totalAmount, 0);
        const completedCount = receipts.filter(r => r.status === 'COMPLETED').length;
        res.json({ totalSales, receiptCount: receipts.length, completedCount, recentReceipts });
    }
    catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/sales', async (req, res) => {
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
    }
    catch (error) {
        console.error('Sales error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/staff', async (req, res) => {
    try {
        const { businessId } = req.user;
        const { locationId } = req.query;
        const staff = await prisma.user.findMany({
            where: { businessId, ...(locationId ? { locationId } : {}) },
            select: { id: true, email: true, name: true, role: true, createdAt: true }
        });
        res.json({ staff });
    }
    catch (error) {
        console.error('Staff error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/suppliers', async (req, res) => {
    try {
        const { businessId } = req.user;
        const suppliers = await prisma.supplier.findMany({
            where: { businessId },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ suppliers });
    }
    catch (error) {
        console.error('Suppliers error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/reports', async (req, res) => {
    try {
        const { businessId } = req.user;
        const { locationId } = req.query;
        // Aggregate stats example
        const [totalReceipts, totalProducts, totalCustomers, receipts] = await Promise.all([
            prisma.receipt.count({ where: { businessId, ...(locationId ? { locationId } : {}) } }),
            prisma.product.count({ where: { businessId } }),
            prisma.customer.count({ where: { businessId } }),
            prisma.receipt.findMany({
                where: { businessId, ...(locationId ? { locationId } : {}) },
                select: { totalAmount: true }
            })
        ]);
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
    }
    catch (error) {
        console.error('Reports error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;
