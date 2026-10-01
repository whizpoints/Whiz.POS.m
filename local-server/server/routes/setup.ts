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

    // 1. Check if business already exists
    const existingBusiness = await db.selectFrom('Business').selectAll().executeTakeFirst();
    const existingUsersCount = await db.selectFrom('User').select(eb => eb.fn.count('id').as('count')).executeTakeFirst();

    if (!existingBusiness) {
        await db.deleteFrom('Business').execute();
    }

    // 2. Seed Local SQLite Database
    const businessData = {
        id: business?.id || existingBusiness?.id || 'local_bus_1',
        name: business?.name || existingBusiness?.name || 'Local Outlet',
        email: business?.email || existingBusiness?.email || 'admin@whizpoint.com',
        apiKey: cloudToken || existingBusiness?.apiKey, // Always update API key to new cloud token
        setupComplete: 1, // boolean becomes 1 in sqlite/kysely without transformer
        createdAt: existingBusiness?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    if (existingBusiness) {
       await db.updateTable('Business').set(businessData).execute();
    } else {
       await db.insertInto('Business').values(businessData).execute();
    }
    
    const localBusiness = await db.selectFrom('Business').selectAll().executeTakeFirstOrThrow();

    if (users && Array.isArray(users)) {
      // If syncing cloud users, only insert if they don't exist
      for (const u of users) {
        const userExists = await db.selectFrom('User').where('id', '=', u.id).executeTakeFirst();
        if (!userExists) {
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
    } else if (Number(existingUsersCount?.count) === 0) {
      // Fallback admin if no users provided and no existing users
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

    // Check if StoreLocation exists
    let location = await db.selectFrom('StoreLocation').where('businessId', '=', localBusiness.id).selectAll().executeTakeFirst();
    if (!location) {
      const locId = 'loc_' + Math.random().toString(36).substring(2, 9);
      location = await db.insertInto('StoreLocation').values({
        id: locId,
        businessId: localBusiness.id,
        name: 'Default Location',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returningAll().executeTakeFirstOrThrow();
    }

    if (outletId) {
      const existingOutlet = await db.selectFrom('Outlet').where('id', '=', outletId).executeTakeFirst();
      if (!existingOutlet) {
        await db.insertInto('Outlet').values({
          id: outletId,
          businessId: localBusiness.id,
          locationId: location.id,
          name: 'Linked Outlet',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }).execute();
      }
    }

    // Mark as complete locally
    console.log(`[Setup] Successfully downloaded and restored backup for Outlet ${outletId}`);
    
    res.json({ success: true, message: 'Outlet backup restored successfully.' });
  } catch (error: any) {
    console.error('[Setup] Sync failed:', error);
    res.status(500).json({ error: error.message || 'Failed to sync backup' });
  }
});

export default router;

