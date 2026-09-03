// @ts-nocheck
import { Router } from 'express';
import db from '../db.js';
import { randomUUID } from 'crypto';
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
        let terminal = await db.selectFrom('Terminal')
            .selectAll()
            .where('macAddress', '=', macAddress)
            .executeTakeFirst();
        if (terminal) {
            terminal = await db.updateTable('Terminal')
                // @ts-ignore
                .set({ name, status: 'PENDING' })
                .where('macAddress', '=', macAddress)
                .returningAll()
                .executeTakeFirstOrThrow();
        }
        else {
            terminal = await db.insertInto('Terminal')
                // @ts-ignore
                .values({ id: randomUUID(), macAddress, name, status: 'PENDING' })
                .returningAll()
                .executeTakeFirstOrThrow();
        }
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
        const terminalRequest = await db.selectFrom('Terminal').selectAll().where('id', '=', id).executeTakeFirst();
        if (!terminalRequest)
            return res.status(404).json({ error: 'Terminal not found' });
        // Find primary business and location
        const business = await db.selectFrom('Business').selectAll().executeTakeFirst();
        const location = await db.selectFrom('StoreLocation').selectAll().executeTakeFirst();
        if (!business || !location) {
            return res.status(400).json({ error: 'Business or Location not setup yet' });
        }
        const apiKey = crypto.randomBytes(32).toString('hex');
        // Find if outlet already exists for this terminal name
        let outlet = await db.selectFrom('Outlet')
            .selectAll()
            .where('name', '=', terminalRequest.name)
            .where('businessId', '=', business.id)
            .executeTakeFirst();
        if (!outlet) {
            outlet = await db.insertInto('Outlet')
                // @ts-ignore
                .values({
                id: randomUUID(),
                name: terminalRequest.name,
                businessId: business.id,
                locationId: location.id
            }).returningAll().executeTakeFirstOrThrow();
        }
        const updatedTerminal = await db.updateTable('Terminal')
            // @ts-ignore
            .set({ status: 'APPROVED', apiKey, outletId: outlet.id })
            .where('id', '=', id)
            .returningAll()
            .executeTakeFirstOrThrow();
        res.json({ success: true, terminal: updatedTerminal, outlet });
    }
    catch (error) {
        console.error('Approve error:', error);
        res.status(500).json({ error: 'Failed to approve terminal' });
    }
});
// Admin calls this to get all terminals
router.get('/', async (req, res) => {
    try {
        const terminals = await db.selectFrom('Terminal')
            .selectAll()
            .orderBy('createdAt', 'desc')
            .execute();
        res.json(terminals);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch terminals' });
    }
});
// Admin calls this from Web UI to reject terminal
router.post('/:id/reject', async (req, res) => {
    const { id } = req.params;
    try {
        const terminal = await db.updateTable('Terminal')
            // @ts-ignore
            .set({ status: 'REJECTED' })
            .where('id', '=', id)
            .returningAll()
            .executeTakeFirstOrThrow();
        res.json({ success: true, terminal });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to reject terminal' });
    }
});
// POS polls this to check approval status
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const terminal = await db.selectFrom('Terminal').selectAll().where('id', '=', id).executeTakeFirst();
        if (!terminal)
            return res.status(404).json({ error: 'Terminal not found' });
        res.json(terminal);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch terminal status' });
    }
});
// Admin calls this from Web UI to completely delete a terminal
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const terminal = await db.selectFrom('Terminal').selectAll().where('id', '=', id).executeTakeFirst();
        if (terminal) {
            // Find and delete the associated outlet
            const outlet = await db.selectFrom('Outlet')
                .selectAll()
                .where('name', '=', terminal.name)
                .where('businessId', '=', terminal.businessId || '') // Provide default to satisfy TS if missing
                .executeTakeFirst();
            if (outlet) {
                await db.deleteFrom('Outlet').where('id', '=', outlet.id).execute();
            }
            await db.deleteFrom('Terminal').where('id', '=', id).execute();
        }
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete terminal' });
    }
});
export default router;
