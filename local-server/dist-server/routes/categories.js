import express from 'express';
import prisma from '../prisma.js';
import jwt from 'jsonwebtoken';
const router = express.Router();
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
// Get all categories
router.get('/', async (req, res) => {
    try {
        const { businessId } = req.user;
        const categories = await prisma.category.findMany({
            where: { businessId },
            orderBy: { name: 'asc' }
        });
        res.json(categories);
    }
    catch (error) {
        console.error('Categories GET error:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});
// Create category
router.post('/', async (req, res) => {
    try {
        const { businessId } = req.user;
        const { name } = req.body;
        if (!name)
            return res.status(400).json({ error: 'Category name is required' });
        const category = await prisma.category.create({
            data: {
                businessId,
                name
            }
        });
        res.json(category);
    }
    catch (error) {
        console.error('Categories POST error:', error);
        res.status(500).json({ error: 'Failed to create category' });
    }
});
// Update category
router.put('/:id', async (req, res) => {
    try {
        const { businessId } = req.user;
        const { name } = req.body;
        const category = await prisma.category.update({
            where: { id: req.params.id, businessId },
            data: { name }
        });
        res.json(category);
    }
    catch (error) {
        console.error('Categories PUT error:', error);
        res.status(500).json({ error: 'Failed to update category' });
    }
});
// Delete category
router.delete('/:id', async (req, res) => {
    try {
        const { businessId } = req.user;
        await prisma.category.delete({
            where: { id: req.params.id, businessId }
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Categories DELETE error:', error);
        res.status(500).json({ error: 'Failed to delete category' });
    }
});
export default router;
