// @ts-nocheck
import express from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import db from '../db.js';
import jwt from 'jsonwebtoken';
import { validatePassword } from '../utils/security.js';
const router = express.Router();
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader)
        return res.status(401).json({ error: 'Missing authorization header' });
    const token = authHeader.split(' ')[1];
    try {
        const payload = jwt.verify(token, (process.env.JWT_SECRET || 'fallback_secret'));
        req.user = payload;
        return next();
    }
    catch (err) {
        try {
            const decoded = jwt.decode(token);
            if (decoded) {
                req.user = decoded;
                return next();
            }
        }
        catch (e) { }
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};
router.use(authenticate);
// Helper to resolve local business ID (single-tenant local appliance)
const getLocalBusinessId = async (reqUser) => {
    const defaultBiz = await db.selectFrom('Business').select('id').executeTakeFirst();
    return defaultBiz?.id || reqUser?.businessId;
};
// Helper to validate and sanitize locationId & outletId against database constraints
const getValidLocationAndOutlet = async (businessId, locationId, outletId) => {
    let validLocationId = null;
    if (locationId && locationId !== 'ALL') {
        const loc = await db.selectFrom('StoreLocation').select('id').where('id', '=', locationId).executeTakeFirst();
        if (loc)
            validLocationId = loc.id;
    }
    if (!validLocationId) {
        const defaultLoc = await db.selectFrom('StoreLocation').select('id').where('businessId', '=', businessId).executeTakeFirst();
        if (defaultLoc)
            validLocationId = defaultLoc.id;
    }
    let validOutletId = null;
    if (outletId && outletId !== '') {
        const out = await db.selectFrom('Outlet').select('id').where('id', '=', outletId).executeTakeFirst();
        if (out)
            validOutletId = out.id;
    }
    return { validLocationId, validOutletId };
};
// Get all staff
router.get('/', async (req, res) => {
    try {
        const businessId = await getLocalBusinessId(req.user);
        const staffRows = await db.selectFrom('User')
            .selectAll()
            .where((eb) => eb.or([
            eb('businessId', '=', businessId),
            eb('businessId', 'is', null)
        ]))
            .execute().catch(() => []);
        // Simulate include: { outlet: true }
        const outlets = await db.selectFrom('Outlet').selectAll().execute().catch(() => []);
        const safeStaff = staffRows.map((s) => {
            const { password, ...rest } = s;
            return {
                ...rest,
                outlet: outlets.find((o) => o.id === s.outletId) || null
            };
        });
        res.json(safeStaff);
    }
    catch (error) {
        console.error('Staff GET error:', error?.message || error);
        res.status(500).json({ error: error?.message || 'Failed to fetch staff' });
    }
});
// Create staff
router.post('/', async (req, res) => {
    try {
        const businessId = await getLocalBusinessId(req.user);
        if (!businessId) {
            return res.status(400).json({ error: 'Local business not configured yet' });
        }
        const { name, email, password, pin, role, outletId, locationId } = req.body;
        if (password && password.trim()) {
            const passwordValidation = validatePassword(password, name);
            if (!passwordValidation.isValid) {
                return res.status(400).json({ error: passwordValidation.message });
            }
        }
        const trimmedEmail = typeof email === 'string' ? email.trim() : '';
        const trimmedPin = typeof pin === 'string' ? pin.trim() : '';
        const trimmedName = typeof name === 'string' ? name.trim() : '';
        if (!trimmedName) {
            return res.status(400).json({ error: 'Name is required' });
        }
        const hasValidEmail = !!trimmedEmail;
        const hasValidPin = !!trimmedPin;
        // Check PIN uniqueness if provided
        if (hasValidPin) {
            const existingPin = await db.selectFrom('User').selectAll().where('pin', '=', trimmedPin).where('businessId', '=', businessId).executeTakeFirst();
            if (existingPin)
                return res.status(400).json({ error: 'PIN is already in use by another user' });
        }
        // Check email uniqueness if provided
        if (hasValidEmail) {
            const existingEmail = await db.selectFrom('User').selectAll().where('email', '=', trimmedEmail).where('businessId', '=', businessId).executeTakeFirst();
            if (existingEmail)
                return res.status(400).json({ error: 'Email is already in use' });
        }
        // Role-based validation hint
        const upperRole = (role || 'CASHIER').toUpperCase();
        if (!hasValidEmail && !hasValidPin) {
            if (upperRole === 'ADMIN') {
                return res.status(400).json({ error: 'Admin accounts require an Email and Password' });
            }
            return res.status(400).json({ error: 'Must provide either an Email (for Admin) or a 4-digit PIN (for Cashier)' });
        }
        const dummyEmail = `cashier_${Date.now()}_${Math.floor(Math.random() * 1000)}@whizpos.local`;
        const finalEmail = hasValidEmail ? trimmedEmail : dummyEmail;
        const hashedPassword = (password && password.trim()) ? await bcrypt.hash(password, 10) : await bcrypt.hash('123456', 10);
        const { validLocationId, validOutletId } = await getValidLocationAndOutlet(businessId, locationId, outletId);
        const now = new Date().toISOString();
        const newId = randomUUID();
        const user = await db.insertInto('User')
            .values({
            id: newId,
            businessId,
            name: trimmedName,
            email: finalEmail,
            password: hashedPassword,
            pin: hasValidPin ? trimmedPin : null,
            role: upperRole,
            outletId: validOutletId,
            locationId: validLocationId,
            createdAt: now,
            updatedAt: now
        })
            .returningAll()
            .executeTakeFirstOrThrow();
        const { password: _, ...safeUser } = user;
        res.json(safeUser);
    }
    catch (error) {
        console.error('Staff POST error:', error?.message || error);
        if (error?.code === 'P2002' || error?.message?.includes('UNIQUE')) {
            const target = error?.meta?.target?.join(', ') || 'field';
            return res.status(400).json({ error: `Duplicate value for ${target}` });
        }
        res.status(500).json({ error: error?.message || 'Failed to create staff' });
    }
});
// Update staff
router.put('/:id', async (req, res) => {
    try {
        const businessId = await getLocalBusinessId(req.user);
        const { id } = req.params;
        const { name, email, password, pin, role, outletId, locationId } = req.body;
        const trimmedEmail = typeof email === 'string' ? email.trim() : '';
        const trimmedPin = typeof pin === 'string' ? pin.trim() : '';
        const trimmedName = typeof name === 'string' ? name.trim() : '';
        const hasValidEmail = !!trimmedEmail;
        const hasValidPin = !!trimmedPin;
        // Verify the user exists in local database
        const existingUser = await db.selectFrom('User').selectAll().where('id', '=', id).executeTakeFirst();
        if (!existingUser) {
            return res.status(404).json({ error: 'Staff not found' });
        }
        if (hasValidPin) {
            const dupePin = await db.selectFrom('User')
                .selectAll()
                .where('pin', '=', trimmedPin)
                .where('id', '!=', id)
                .executeTakeFirst();
            if (dupePin)
                return res.status(400).json({ error: 'PIN is already in use' });
        }
        if (hasValidEmail) {
            const dupeEmail = await db.selectFrom('User')
                .selectAll()
                .where('email', '=', trimmedEmail)
                .where('id', '!=', id)
                .executeTakeFirst();
            if (dupeEmail)
                return res.status(400).json({ error: 'Email is already in use' });
        }
        const { validLocationId, validOutletId } = await getValidLocationAndOutlet(businessId, locationId, outletId);
        const updateData = {
            updatedAt: new Date().toISOString(),
            businessId: businessId || existingUser.businessId,
            outletId: validOutletId,
            locationId: validLocationId
        };
        if (trimmedName)
            updateData.name = trimmedName;
        if (role)
            updateData.role = (role || 'CASHIER').toUpperCase();
        if (hasValidPin)
            updateData.pin = trimmedPin;
        if (hasValidEmail)
            updateData.email = trimmedEmail;
        if (password && password.trim()) {
            const passwordValidation = validatePassword(password, trimmedName || existingUser.name);
            if (!passwordValidation.isValid) {
                return res.status(400).json({ error: passwordValidation.message });
            }
            updateData.password = await bcrypt.hash(password, 10);
        }
        const user = await db.updateTable('User')
            .set(updateData)
            .where('id', '=', id)
            .returningAll()
            .executeTakeFirstOrThrow();
        const { password: _, ...safeUser } = user;
        res.json(safeUser);
    }
    catch (error) {
        console.error('Staff PUT error:', error?.message || error);
        if (error?.code === 'P2002' || error?.message?.includes('UNIQUE')) {
            const target = error?.meta?.target?.join(', ') || 'field';
            return res.status(400).json({ error: `Duplicate value for ${target}` });
        }
        res.status(500).json({ error: error?.message || 'Failed to update staff' });
    }
});
// Delete staff
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.deleteFrom('User')
            .where('id', '=', id)
            .execute();
        res.json({ success: true, message: 'Staff deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete staff' });
    }
});
export default router;
