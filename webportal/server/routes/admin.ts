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

// IMPERSONATE (Ghost Mode) - Login as business owner
router.post('/businesses/:id/impersonate', requireSuperAdmin, async (req, res) => {
    try {
        const businessId = req.params.id;
        
        const business = await prisma.business.findUnique({ 
            where: { id: businessId },
            include: { users: true }
        });
        
        if (!business) return res.status(404).json({ error: 'Business not found' });
        
        const owner = business.users.find(u => u.role === 'ADMIN' || u.role === 'OWNER') || business.users[0];
        if (!owner) return res.status(404).json({ error: 'No users found in this business to impersonate' });

        // Include original admin's email or ID in token to allow them to "switch back" if needed, 
        // but for now we just give them a standard token with isSuperAdmin appended so they keep their god mode powers
        const token = jwt.sign({ 
            userId: owner.id, 
            businessId: owner.businessId, 
            role: owner.role,
            isSuperAdmin: true // they keep their super admin status so they aren't permanently locked out of /admin
        }, JWT_SECRET, { expiresIn: '1h' });

        res.json({
            token,
            user: {
                id: owner.id,
                name: owner.name,
                email: owner.email,
                role: owner.role,
                businessId: owner.businessId,
                businessName: business.name,
                isSuperAdmin: true
            }
        });
    } catch (error) {
        console.error('Impersonate business error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET BROADCAST COUNT
router.get('/broadcast/count', requireSuperAdmin, async (req, res) => {
    try {
        const target = req.query.target as string;
        let count = 0;
        
        if (target === 'TEST') {
            count = 1;
        } else {
            let whereClause = {};
            if (target === 'ACTIVE_TENANTS') {
                const activeBusinesses = await prisma.business.findMany();
                const activeIds = activeBusinesses.filter(b => {
                    let s = b.settings as any || {};
                    if (typeof s === 'string') s = JSON.parse(s);
                    return !s.isSuspended;
                }).map(b => b.id);
                whereClause = { businessId: { in: activeIds }, role: { in: ['OWNER', 'ADMIN'] } };
            } else if (target === 'SUSPENDED_TENANTS') {
                const allBusinesses = await prisma.business.findMany();
                const suspendedIds = allBusinesses.filter(b => {
                    let s = b.settings as any || {};
                    if (typeof s === 'string') s = JSON.parse(s);
                    return s.isSuspended;
                }).map(b => b.id);
                whereClause = { businessId: { in: suspendedIds }, role: { in: ['OWNER', 'ADMIN'] } };
            } else if (target === 'ALL_USERS') {
                whereClause = {};
            }
            
            const users = await prisma.user.findMany({
                where: whereClause,
                select: { email: true },
                distinct: ['email']
            });
            count = users.filter(u => u.email).length;
        }
        res.json({ count });
    } catch (error) {
        console.error('Count broadcast error:', error);
        res.status(500).json({ error: 'Failed to count recipients.' });
    }
});

// BROADCAST EMAILS
router.post('/broadcast', requireSuperAdmin, async (req, res) => {
    try {
        const { target, fromName, fromEmail, subject, htmlBody, testEmail } = req.body;
        
        let recipientsData: { email: string, name: string, businessName: string }[] = [];
        
        if (target === 'TEST' && testEmail) {
            recipientsData = [{ email: testEmail, name: 'Test User', businessName: 'WhizPoint Testing' }];
        } else {
            // Fetch all users based on target
            let whereClause = {};
            if (target === 'ACTIVE_TENANTS') {
                const activeBusinesses = await prisma.business.findMany();
                // Filter businesses that are not suspended
                const activeIds = activeBusinesses
                    .filter(b => {
                        let s = b.settings as any || {};
                        if (typeof s === 'string') s = JSON.parse(s);
                        return !s.isSuspended;
                    })
                    .map(b => b.id);
                    
                whereClause = { businessId: { in: activeIds }, role: { in: ['OWNER', 'ADMIN'] } };
            } else if (target === 'SUSPENDED_TENANTS') {
                const allBusinesses = await prisma.business.findMany();
                const suspendedIds = allBusinesses
                    .filter(b => {
                        let s = b.settings as any || {};
                        if (typeof s === 'string') s = JSON.parse(s);
                        return s.isSuspended;
                    })
                    .map(b => b.id);
                whereClause = { businessId: { in: suspendedIds }, role: { in: ['OWNER', 'ADMIN'] } };
            } else if (target === 'ALL_USERS') {
                whereClause = {}; // literally everyone
            }
            
            const users = await prisma.user.findMany({
                where: whereClause,
                select: { email: true, name: true, business: { select: { name: true } } }
            });
            
            // Deduplicate by email
            const uniqueUsers = new Map();
            for (const u of users) {
                if (u.email && !uniqueUsers.has(u.email)) {
                    uniqueUsers.set(u.email, {
                        email: u.email,
                        name: u.name,
                        businessName: u.business?.name || 'Valued Business'
                    });
                }
            }
            recipientsData = Array.from(uniqueUsers.values());
        }

        if (recipientsData.length === 0) {
            return res.status(400).json({ error: 'No recipients found for this target.' });
        }

        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.createTransport({
            host: process.env.BREVO_SMTP_SERVER,
            port: Number(process.env.BREVO_SMTP_PORT) || 587,
            secure: false,
            auth: {
                user: process.env.BREVO_SMTP_LOGIN,
                pass: process.env.BREVO_SMTP_KEY,
            },
        });

        const senderAlias = `${fromName} <${fromEmail}@whizpoint.app>`;
        const replyToEmail = 'no-reply@whizpoint.app';

        // Send individually so the "To" field displays the recipient's actual email
        for (const recipient of recipientsData) {
            // Apply personalization tags
            const personalizedBody = htmlBody
                .replace(/\{\{BusinessName\}\}/gi, recipient.businessName)
                .replace(/\{\{Name\}\}/gi, recipient.name);
                
            const personalizedSubject = subject
                .replace(/\{\{BusinessName\}\}/gi, recipient.businessName)
                .replace(/\{\{Name\}\}/gi, recipient.name);

            const mailOptions = {
                from: senderAlias,
                to: recipient.email,
                replyTo: replyToEmail,
                subject: personalizedSubject,
                html: personalizedBody
            };
            
            try {
                await transporter.sendMail(mailOptions);
            } catch (err) {
                console.error(`Failed to send to ${recipient.email}:`, err);
            }
        }

        res.json({ success: true, message: `Broadcast sent successfully to ${recipientsData.length} recipients.` });
    } catch (error) {
        console.error('Broadcast error:', error);
        res.status(500).json({ error: 'Failed to send broadcast.' });
    }
});

export default router;
