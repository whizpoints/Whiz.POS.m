import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Middleware to verify if user is super admin
// (For demo purposes, we will assume any user with role 'ADMIN' is a super admin for now, 
// but in reality you'd want a separate SUPER_ADMIN role or specific email checking)
const requireSuperAdmin = async (req: any, res: any, next: any) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
        
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        
        if (!decoded.isSuperAdmin) {
            return res.status(403).json({ error: 'Forbidden: Super Admin Access Required' });
        }
        
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// GET all businesses
router.get('/businesses', requireSuperAdmin, async (req, res) => {
    try {
        const businesses = await prisma.business.findMany({
            include: {
                users: {
                    select: { id: true, name: true, email: true, role: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ businesses });
    } catch (error) {
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
        // If not, we should delete them manually first.
        await prisma.user.deleteMany({ where: { businessId } });
        // Add other models if needed: await prisma.product.deleteMany({ where: { businessId } });
        
        await prisma.business.delete({ where: { id: businessId } });

        res.json({ success: true, message: 'Business deleted successfully' });
    } catch (error) {
        console.error('Delete business error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// TOGGLE Suspend a business
router.post('/businesses/:id/suspend', requireSuperAdmin, async (req, res) => {
    try {
        const businessId = req.params.id;
        const { suspend } = req.body;
        
        if (req.user.businessId === businessId) {
            return res.status(400).json({ error: 'Cannot suspend your own business' });
        }

        const business = await prisma.business.findUnique({ where: { id: businessId } });
        if (!business) return res.status(404).json({ error: 'Business not found' });
        
        let settings = business.settings as any || {};
        if (typeof settings === 'string') settings = JSON.parse(settings);
        
        settings.isSuspended = suspend;

        await prisma.business.update({ 
            where: { id: businessId }, 
            data: { settings } 
        });
        
        // If suspended, emit a global disconnect event to kick them out instantly
        if (suspend && req.app.get('io')) {
            req.app.get('io').to(`business_${businessId}`).emit('account_suspended');
        }

        res.json({ success: true, message: `Business ${suspend ? 'suspended' : 'reactivated'} successfully` });
    } catch (error) {
        console.error('Suspend business error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
