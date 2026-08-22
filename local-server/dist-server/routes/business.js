import { Router } from 'express';
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
        res.json(business);
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
            finalSettings = JSON.stringify(settings);
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
