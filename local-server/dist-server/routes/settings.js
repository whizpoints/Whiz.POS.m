import { Router } from 'express';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
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
// Update Cloud Config
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
export default router;
