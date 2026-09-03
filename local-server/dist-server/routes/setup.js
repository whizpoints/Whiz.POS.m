// @ts-nocheck
import { Router } from 'express';
import db from '../db.js';
const router = Router();
router.post('/sync', async (req, res) => {
    const { outletId, cloudToken, business, users } = req.body;
    if (!outletId || !cloudToken) {
        return res.status(400).json({ error: 'Missing outletId or cloudToken' });
    }
    try {
        console.log(`[Setup] Fetching backup data for Outlet ${outletId}...`);
        // In production, the backend would use the cloudToken to fetch the full SQL dump
        // or JSON array from https://api.whizpoint.app/api/outlets/{outletId}/backup
        // For this implementation, the frontend passes down the critical auth data 
        // it received from the cloud login to bootstrap the local DB.
        // 1. Clear local SQLite database (since it's a fresh setup)
        await db.deleteFrom('User').execute();
        await db.deleteFrom('Business').execute();
        // 2. Seed Local SQLite Database
        const businessData = {
            id: business?.id || 'local_bus_1',
            name: business?.name || 'Local Outlet',
            email: business?.email || 'admin@whizpoint.com',
            setupComplete: 1, // boolean becomes 1 in sqlite/kysely without transformer
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        const localBusiness = await db.insertInto('Business')
            .values(businessData)
            .returningAll()
            .executeTakeFirstOrThrow();
        if (users && Array.isArray(users)) {
            for (const u of users) {
                await db.insertInto('User').values({
                    id: u.id,
                    email: u.email,
                    name: u.name,
                    password: u.password,
                    pin: u.password && u.password.length === 4 && /^\d+$/.test(u.password) ? u.password : null,
                    role: u.role || 'ADMIN',
                    businessId: localBusiness.id,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }).execute();
            }
        }
        else {
            // Fallback admin if no users provided in payload
            await db.insertInto('User').values({
                id: 'local_admin_1', // must provide id if schema doesn't autogenerate string uuid natively
                email: 'admin@whizpoint.com',
                name: 'Local Admin',
                password: 'hashed_password_placeholder', // Usually synced from cloud
                pin: '1234', // Default PIN if none provided
                role: 'ADMIN',
                businessId: localBusiness.id,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }).execute();
        }
        // Mark as complete locally
        console.log(`[Setup] Successfully downloaded and restored backup for Outlet ${outletId}`);
        res.json({ success: true, message: 'Outlet backup restored successfully.' });
    }
    catch (error) {
        console.error('[Setup] Sync failed:', error);
        res.status(500).json({ error: error.message || 'Failed to sync backup' });
    }
});
export default router;
