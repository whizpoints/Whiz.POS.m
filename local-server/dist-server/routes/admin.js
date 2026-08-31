import { Router } from 'express';
import db from '../db.js';
import jwt from 'jsonwebtoken';
const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
// Middleware to verify if user is super admin
// (For demo purposes, we will assume any user with role 'ADMIN' is a super admin for now, 
// but in reality you'd want a separate SUPER_ADMIN role or specific email checking)
const requireSuperAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader)
            return res.status(401).json({ error: 'Unauthorized' });
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        req.user = decoded;
        next();
    }
    catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};
// GET all businesses
router.get('/businesses', requireSuperAdmin, async (req, res) => {
    try {
        const businessesRaw = await db.selectFrom('Business')
            .selectAll()
            .orderBy('createdAt', 'desc')
            .execute();
        // For each business, fetch users to mimic prisma include
        const businesses = await Promise.all(businessesRaw.map(async (b) => {
            const users = await db.selectFrom('User')
                .select(['id', 'name', 'email', 'role'])
                .where('businessId', '=', b.id)
                .execute();
            return { ...b, users };
        }));
        res.json({ user: req.user, businesses });
    }
    catch (error) {
        console.error('Fetch businesses error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// DELETE a business
router.delete('/businesses/:id', requireSuperAdmin, async (req, res) => {
    try {
        const businessId = req.params.id;
        // Ensure you don't delete your own business while logged in (optional safety check)
        if (req.user.businessId === businessId) {
            return res.status(400).json({ error: 'Cannot delete your active business' });
        }
        // Prisma will cascade delete users, products, etc. if relations are configured correctly.
        // For Kysely we do it manually.
        await db.deleteFrom('User').where('businessId', '=', businessId).execute();
        await db.deleteFrom('Business').where('id', '=', businessId).execute();
        res.json({ success: true, message: 'Business deleted successfully' });
    }
    catch (error) {
        console.error('Delete business error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;
