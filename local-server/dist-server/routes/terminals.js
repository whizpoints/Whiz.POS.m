import { Router } from 'express';
import prisma from '../prisma.js';
import crypto from 'crypto';
const router = Router();
// const prisma = new PrismaClient();
// POS Client calls this to request connection
router.post('/register', async (req, res) => {
    const { macAddress, name } = req.body;
    if (!macAddress || !name) {
        return res.status(400).json({ error: 'Missing macAddress or name' });
    }
    try {
        // Upsert terminal request
        const terminal = await prisma.terminal.upsert({
            where: { macAddress },
            update: { name, status: 'PENDING' },
            create: { macAddress, name, status: 'PENDING' }
        });
        console.log(`[LAN Discovery] Terminal registration request received from ${name} (${macAddress})`);
        res.json({ success: true, message: 'Registration requested. Waiting for admin approval.', terminalId: terminal.id });
    }
    catch (error) {
        console.error('[LAN Discovery] Registration failed:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Admin calls this from Web UI to approve terminal
router.post('/:id/approve', async (req, res) => {
    const { id } = req.params;
    try {
        const apiKey = crypto.randomBytes(32).toString('hex');
        const terminal = await prisma.terminal.update({
            where: { id },
            data: { status: 'APPROVED', apiKey }
        });
        res.json({ success: true, terminal });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to approve terminal' });
    }
});
// Admin calls this to get all terminals
router.get('/', async (req, res) => {
    try {
        const terminals = await prisma.terminal.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(terminals);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch terminals' });
    }
});
export default router;
