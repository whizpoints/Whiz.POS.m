// @ts-nocheck
import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../db.js';
import jwt from 'jsonwebtoken';
const router = Router();
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader)
        return res.status(401).json({ error: 'Missing authorization header' });
    const token = authHeader.split(' ')[1];
    try {
        const payload = jwt.verify(token, (process.env.JWT_SECRET || 'fallback_secret'));
        req.user = payload;
        next();
    }
    catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};
router.use(authenticate);
// Get all customers
router.get('/', async (req, res) => {
    try {
        const { businessId } = req.user;
        const customers = await db.selectFrom('Customer')
            .selectAll()
            .where('businessId', '=', businessId)
            .orderBy('name', 'asc')
            .execute();
        res.json(customers);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create customer
router.post('/', async (req, res) => {
    try {
        const { businessId } = req.user;
        const { name, phone, email, loyaltyPoints, totalSpent } = req.body;
        // Check for duplicate customer by name (case-insensitive), phone, or email
        if (name) {
            const existingByName = await db.selectFrom('Customer')
                .selectAll()
                .where('businessId', '=', businessId)
                .where((eb) => eb(eb.fn('lower', ['name']), '=', name.trim().toLowerCase()))
                .executeTakeFirst();
            if (existingByName) {
                return res.status(409).json({ error: `A customer named "${existingByName.name}" already exists.` });
            }
        }
        if (phone) {
            const existingByPhone = await db.selectFrom('Customer')
                .selectAll()
                .where('businessId', '=', businessId)
                .where('phone', '=', phone.trim())
                .executeTakeFirst();
            if (existingByPhone) {
                return res.status(409).json({ error: `A customer with phone "${phone}" already exists (${existingByPhone.name}).` });
            }
        }
        if (email) {
            const existingByEmail = await db.selectFrom('Customer')
                .selectAll()
                .where('businessId', '=', businessId)
                .where((eb) => eb(eb.fn('lower', ['email']), '=', email.trim().toLowerCase()))
                .executeTakeFirst();
            if (existingByEmail) {
                return res.status(409).json({ error: `A customer with email "${email}" already exists (${existingByEmail.name}).` });
            }
        }
        const customer = await db.insertInto('Customer')
            .values({
            id: randomUUID(),
            businessId, name: name?.trim(), phone: phone?.trim(), email: email?.trim(), loyaltyPoints, totalSpent
        })
            .returningAll()
            .executeTakeFirstOrThrow();
        res.json(customer);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update customer
router.put('/:id', async (req, res) => {
    try {
        const { businessId } = req.user;
        const { id } = req.params;
        const { name, phone, email, loyaltyPoints, totalSpent } = req.body;
        const customer = await db.updateTable('Customer')
            .set({ name, phone, email, loyaltyPoints, totalSpent })
            .where('id', '=', id)
            .where('businessId', '=', businessId)
            .returningAll()
            .executeTakeFirstOrThrow();
        res.json(customer);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete customer
router.delete('/:id', async (req, res) => {
    try {
        const { businessId } = req.user;
        const { id } = req.params;
        await db.deleteFrom('Customer')
            .where('id', '=', id)
            .where('businessId', '=', businessId)
            .execute();
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;
