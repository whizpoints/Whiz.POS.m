// @ts-nocheck
import { Router } from 'express';
import db from '../db.js';
import { randomUUID } from 'crypto';
const router = Router();
// const prisma = new PrismaClient();
// Get M-Pesa config
router.get('/mpesa', async (req, res) => {
    try {
        const businessId = req.query.businessId || 'default-business-id';
        const locationId = req.query.locationId;
        let query = db.selectFrom('MpesaConfig').selectAll().where('businessId', '=', businessId);
        if (locationId)
            query = query.where('locationId', '=', locationId);
        const config = await query.executeTakeFirst();
        res.json(config || null);
    }
    catch (error) {
        console.error('Error fetching M-Pesa config:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update M-Pesa config
router.post('/mpesa', async (req, res) => {
    try {
        const businessId = req.query.businessId || 'default-business-id';
        const { consumerKey, consumerSecret, passkey, shortcode, environment, merchantType, tillNumber, paybillNumber, accountReference, stkEnabled, c2bEnabled } = req.body;
        const updateData = {
            consumerKey,
            consumerSecret,
            passkey,
            shortcode,
            environment,
            merchantType,
            tillNumber,
            paybillNumber,
            accountReference,
            stkEnabled: stkEnabled ?? true,
            c2bEnabled: c2bEnabled ?? true
        };
        const locationId = req.query.locationId;
        let query = db.selectFrom('MpesaConfig').selectAll().where('businessId', '=', businessId);
        if (locationId)
            query = query.where('locationId', '=', locationId);
        let config = await query.executeTakeFirst();
        if (config) {
            config = await db.updateTable('MpesaConfig')
                .set(updateData)
                .where('id', '=', config.id)
                .returningAll()
                .executeTakeFirstOrThrow();
        }
        else {
            config = await db.insertInto('MpesaConfig')
                .values({
                id: randomUUID(),
                businessId,
                locationId: locationId || null,
                ...updateData
            })
                .returningAll()
                .executeTakeFirstOrThrow();
        }
        res.json({ success: true, config });
    }
    catch (error) {
        console.error('Error updating M-Pesa config:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get Cloud Config
router.get('/cloud', async (req, res) => {
    try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const { fileURLToPath } = await import('url');
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const configPath = path.join(__dirname, '..', '..', '..', 'server-config.json');
        let config = {};
        try {
            const data = await fs.readFile(configPath, 'utf-8');
            config = JSON.parse(data);
        }
        catch (e) { }
        res.json({
            cloudUrl: config.backOfficeUrl || 'https://api.whizpoint.app',
            cloudToken: config.cloudToken || config.backOfficeApiKey || ''
        });
    }
    catch (e) {
        res.status(500).json({ error: 'Failed to read cloud config' });
    }
});
// Update Cloud Config (Legacy)
router.post('/cloud', async (req, res) => {
    try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const { fileURLToPath } = await import('url');
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const configPath = path.join(__dirname, '..', '..', '..', 'server-config.json');
        let config = {};
        try {
            const data = await fs.readFile(configPath, 'utf-8');
            config = JSON.parse(data);
        }
        catch (e) { }
        config.backOfficeUrl = req.body.cloudUrl;
        config.cloudToken = req.body.cloudToken;
        config.backOfficeApiKey = req.body.cloudToken;
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: 'Failed to save cloud config' });
    }
});
// Modern Save Endpoint (Linked via browser)
router.post('/save', async (req, res) => {
    try {
        const { backOfficeUrl, apiKey, cloudBusinessId, syncMode, outletId, serverId, cloudBusinessName, cloudLocationName } = req.body;
        // Update Local Business ID and cascade to prevent data orphaning/wiping!
        const existingBusiness = await db.selectFrom('Business').selectAll().executeTakeFirst();
        let newSettingsStr = '{}';
        if (existingBusiness) {
            let currentSettings = {};
            try {
                if (existingBusiness.settings && typeof existingBusiness.settings === 'string') {
                    currentSettings = JSON.parse(existingBusiness.settings);
                }
                else if (existingBusiness.settings && typeof existingBusiness.settings === 'object') {
                    currentSettings = existingBusiness.settings;
                }
            }
            catch (e) { }
            currentSettings = {
                ...currentSettings,
                backOfficeUrl,
                backOfficeApiKey: apiKey,
                cloudLocationId: outletId,
                serverId,
                cloudBusinessName,
                cloudLocationName
            };
            newSettingsStr = JSON.stringify(currentSettings);
        }
        else {
            newSettingsStr = JSON.stringify({
                backOfficeUrl,
                backOfficeApiKey: apiKey,
                cloudLocationId: outletId,
                serverId,
                cloudBusinessName,
                cloudLocationName
            });
        }
        if (!existingBusiness && cloudBusinessId) {
            await db.insertInto('Business').values({
                id: cloudBusinessId,
                name: 'Cloud Outlet',
                email: 'admin@whizpoint.com',
                apiKey: apiKey,
                settings: newSettingsStr,
                setupComplete: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }).execute();
        }
        else if (existingBusiness && cloudBusinessId && existingBusiness.id !== cloudBusinessId) {
            const oldId = existingBusiness.id;
            await db.updateTable('Business').set({
                email: `old_${oldId}_${existingBusiness.email}`,
                apiKey: `old_${oldId}_${existingBusiness.apiKey || ''}`
            }).where('id', '=', oldId).execute();
            await db.insertInto('Business').values({
                ...existingBusiness,
                id: cloudBusinessId,
                apiKey: apiKey,
                settings: newSettingsStr
            }).execute();
            const tablesWithBusinessId = ['Category', 'MpesaConfig', 'User', 'StoreLocation', 'Outlet', 'StockMovement', 'Product', 'Customer', 'MpesaTransaction', 'Receipt', 'Supplier', 'Server', 'InventoryScope', 'Terminal', 'SyncLog'];
            for (const table of tablesWithBusinessId) {
                try {
                    await db.updateTable(table).set({ businessId: cloudBusinessId }).where('businessId', '=', oldId).execute();
                }
                catch (err) {
                    console.error(`Failed to cascade businessId on ${table}`, err);
                }
            }
            await db.deleteFrom('Business').where('id', '=', oldId).execute();
        }
        else if (existingBusiness) {
            await db.updateTable('Business').set({ apiKey, settings: newSettingsStr }).where('id', '=', existingBusiness.id).execute();
        }
        let newToken = null;
        if (cloudBusinessId) {
            const user = await db.selectFrom('User').selectAll().where('businessId', '=', cloudBusinessId).executeTakeFirst();
            if (user) {
                const jwt = (await import('jsonwebtoken')).default;
                newToken = jwt.sign({ userId: user.id, businessId: user.businessId, role: user.role }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
            }
        }
        res.json({ success: true, newToken });
    }
    catch (e) {
        console.error('Failed to save config:', e);
        res.status(500).json({ error: e.message || 'Failed to save configuration' });
    }
});
export default router;
