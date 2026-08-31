import { Router } from 'express';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import prisma from '../prisma.js';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { uploadAsset } from '../services/s3Service.js';
const router = Router();
// const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
// Use memory storage for multer to buffer the file directly to S3
const upload = multer({ storage: multer.memoryStorage() });
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] || (authHeader ? authHeader.split(' ')[1] : null);
    if (!apiKey)
        return res.status(401).json({ error: 'Missing authorization header or API key' });
    try {
        // Try to verify as JWT (Web Portal)
        const payload = jwt.verify(apiKey, JWT_SECRET);
        req.user = payload;
        return next();
    }
    catch (err) {
        // Fallback: Verify as API Key (Desktop POS)
        try {
            const business = await prisma.business.findFirst({ where: { apiKey } });
            if (business) {
                req.user = { businessId: business.id };
                return next();
            }
        }
        catch (dbErr) { }
        return res.status(401).json({ error: 'Invalid token or API key' });
    }
};
// Check if setup is complete
router.get('/setup-status', async (req, res) => {
    try {
        const business = await prisma.business.findFirst();
        res.json({ isSetup: !!business, business });
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.use(authenticate);
// Get Business Profile
router.get('/profile', async (req, res) => {
    try {
        const { businessId } = req.user;
        const business = await prisma.business.findUnique({
            where: { id: businessId },
            select: { id: true, name: true, email: true, logoUrl: true, createdAt: true, settings: true, apiKey: true }
        });
        if (!business)
            return res.status(404).json({ error: 'Business not found' });
        let parsedSettings = {};
        try {
            if (business.settings && typeof business.settings === 'string') {
                parsedSettings = JSON.parse(business.settings);
            }
            else if (business.settings && typeof business.settings === 'object') {
                parsedSettings = business.settings;
            }
        }
        catch (e) { }
        res.json({ ...business, settings: parsedSettings });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update Business Profile
router.post('/profile', async (req, res) => {
    try {
        const { businessId } = req.user;
        const { name, settings, apiKey } = req.body;
        // Defensively ensure settings is a string since Prisma schema defines it as String
        let finalSettings = settings;
        if (settings && typeof settings === 'object') {
            // Clean up any corrupted keys caused by previous string spreading bugs
            const cleanedSettings = {};
            for (const [key, value] of Object.entries(settings)) {
                if (!/^\d+$/.test(key)) {
                    cleanedSettings[key] = value;
                }
            }
            finalSettings = JSON.stringify(cleanedSettings);
        }
        const business = await prisma.business.update({
            where: { id: businessId },
            data: {
                ...(name && { name }),
                ...(finalSettings !== undefined && { settings: finalSettings }),
                ...(apiKey !== undefined && { apiKey })
            },
            select: { id: true, name: true, settings: true, apiKey: true }
        });
        res.json({ success: true, business });
    }
    catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});
// Update Business Logo
router.post('/logo', upload.single('logo'), async (req, res) => {
    try {
        const { businessId } = req.user;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'No logo file provided' });
        }
        const fileExtension = file.originalname.split('.').pop();
        const fileName = `logos/${businessId}-${Date.now()}.${fileExtension}`;
        // Upload to R2/S3
        const logoUrl = await uploadAsset(file.buffer, fileName, file.mimetype);
        // Update DB
        const updatedBusiness = await prisma.business.update({
            where: { id: businessId },
            data: { logoUrl },
            select: { id: true, name: true, logoUrl: true }
        });
        res.json({ success: true, business: updatedBusiness });
    }
    catch (error) {
        console.error('Logo upload error:', error);
        res.status(500).json({ error: 'Failed to upload logo' });
    }
});
// Export Data Backup
router.get('/backup', async (req, res) => {
    try {
        const { businessId } = req.user;
        const business = await prisma.business.findUnique({ where: { id: businessId } });
        if (!business)
            return res.status(404).json({ error: 'Business not found' });
        const categories = await prisma.category.findMany({ where: { businessId } });
        const products = await prisma.product.findMany({ where: { businessId } });
        const users = await prisma.user.findMany({ where: { businessId } });
        const customers = await prisma.customer.findMany({ where: { businessId } });
        // Clean up sensitive/irrelevant data for export
        const cleanUsers = users.map(u => ({ ...u, id: undefined, businessId: undefined, locationId: null, outletId: null, createdAt: undefined, updatedAt: undefined }));
        const cleanCategories = categories.map(c => ({ id: c.id, name: c.name }));
        const cleanProducts = products.map(p => ({ id: p.id, sku: p.sku, barcode: p.barcode, name: p.name, category: p.category, price: p.price, costPrice: p.costPrice, taxRate: p.taxRate, reorderLevel: p.reorderLevel }));
        const cleanCustomers = customers.map(c => ({ id: c.id, name: c.name, phone: c.phone, email: c.email, loyaltyPoints: c.loyaltyPoints, totalSpent: c.totalSpent }));
        const backupData = {
            version: "1.0",
            type: "whiz-local-backup",
            timestamp: new Date().toISOString(),
            data: {
                settings: business.settings,
                categories: cleanCategories,
                products: cleanProducts,
                users: cleanUsers,
                customers: cleanCustomers
            }
        };
        res.json(backupData);
    }
    catch (error) {
        console.error('Backup error:', error);
        res.status(500).json({ error: 'Failed to generate backup' });
    }
});
// Restore Data Backup
router.post('/restore', async (req, res) => {
    try {
        const { businessId } = req.user;
        const { backup } = req.body;
        if (!backup || backup.type !== 'whiz-local-backup' || !backup.data) {
            return res.status(400).json({ error: 'Invalid backup file format' });
        }
        const { settings, categories, products, users, customers } = backup.data;
        // 1. Restore Settings
        if (settings) {
            let currentBusiness = await prisma.business.findUnique({ where: { id: businessId } });
            let currentSettings = typeof currentBusiness?.settings === 'string' ? JSON.parse(currentBusiness.settings) : (currentBusiness?.settings || {});
            let newSettings = typeof settings === 'string' ? JSON.parse(settings) : settings;
            // Preserve API keys when merging settings
            const mergedSettings = { ...newSettings, backOfficeApiKey: currentSettings.backOfficeApiKey, backOfficeUrl: currentSettings.backOfficeUrl, cloudBusinessId: currentSettings.cloudBusinessId, locationId: currentSettings.locationId };
            await prisma.business.update({
                where: { id: businessId },
                data: { settings: JSON.stringify(mergedSettings) }
            });
        }
        // 2. Restore Categories
        if (categories && categories.length > 0) {
            for (const cat of categories) {
                await prisma.category.upsert({
                    where: { id: cat.id },
                    update: { name: cat.name, businessId },
                    create: { id: cat.id, name: cat.name, businessId }
                });
            }
        }
        // 3. Restore Products
        if (products && products.length > 0) {
            for (const p of products) {
                await prisma.product.upsert({
                    where: { id: p.id },
                    update: { sku: p.sku, barcode: p.barcode, name: p.name, category: p.category, price: p.price, costPrice: p.costPrice, taxRate: p.taxRate, reorderLevel: p.reorderLevel, businessId },
                    create: { id: p.id, sku: p.sku, barcode: p.barcode, name: p.name, category: p.category, price: p.price, costPrice: p.costPrice, taxRate: p.taxRate, reorderLevel: p.reorderLevel, businessId }
                });
            }
        }
        // 4. Restore Users (match by email to avoid unique constraint errors, don't update password if exists)
        if (users && users.length > 0) {
            for (const u of users) {
                const existing = await prisma.user.findUnique({ where: { email: u.email } });
                if (existing) {
                    await prisma.user.update({
                        where: { email: u.email },
                        data: { name: u.name, role: u.role, pin: u.pin, businessId }
                    });
                }
                else {
                    await prisma.user.create({
                        data: { email: u.email, name: u.name, role: u.role, pin: u.pin, password: u.password, businessId }
                    });
                }
            }
        }
        // 5. Restore Customers
        if (customers && customers.length > 0) {
            for (const c of customers) {
                await prisma.customer.upsert({
                    where: { id: c.id },
                    update: { name: c.name, phone: c.phone, email: c.email, loyaltyPoints: c.loyaltyPoints, totalSpent: c.totalSpent, businessId },
                    create: { id: c.id, name: c.name, phone: c.phone, email: c.email, loyaltyPoints: c.loyaltyPoints, totalSpent: c.totalSpent, businessId }
                });
            }
        }
        res.json({ success: true, message: 'Backup restored successfully' });
    }
    catch (error) {
        console.error('Restore error:', error);
        res.status(500).json({ error: 'Failed to restore backup' });
    }
});
// Get Business Locations
router.get('/locations', async (req, res) => {
    try {
        const { businessId } = req.user;
        const locations = await prisma.storeLocation.findMany({
            where: { businessId },
            orderBy: { createdAt: 'asc' }
        });
        res.json({ success: true, locations });
    }
    catch (error) {
        console.error('Fetch locations error:', error);
        res.status(500).json({ error: 'Failed to fetch locations' });
    }
});
export default router;
