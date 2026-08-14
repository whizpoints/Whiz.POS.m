import express from 'express';
import prisma from '../prisma.js';
const router = express.Router();
// const prisma = new PrismaClient();
// Get all outlets for a location
router.get('/:locationId', async (req, res) => {
    try {
        const { locationId } = req.params;
        const outlets = await prisma.outlet.findMany({
            where: { locationId },
            orderBy: { createdAt: 'asc' }
        });
        res.json(outlets);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch outlets' });
    }
});
// Create a new outlet
router.post('/', async (req, res) => {
    try {
        const { businessId, locationId, name } = req.body;
        if (!businessId || !locationId || !name) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const outlet = await prisma.outlet.create({
            data: { businessId, locationId, name }
        });
        res.json(outlet);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create outlet' });
    }
});
// Delete an outlet
router.delete('/:id', async (req, res) => {
    try {
        await prisma.outlet.delete({
            where: { id: req.params.id }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete outlet' });
    }
});
export default router;
