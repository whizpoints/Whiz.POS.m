import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../db.js';
import jwt from 'jsonwebtoken';
const router = Router();
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
        const customer = await db.insertInto('Customer')
            .values({
            id: randomUUID(),
            businessId, name, phone, email, loyaltyPoints, totalSpent
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
