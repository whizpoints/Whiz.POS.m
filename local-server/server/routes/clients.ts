// @ts-nocheck
import { Router } from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const getLocalBusinessId = async (reqUser: any) => {
  const defaultBiz = await db.selectFrom('Business').select('id').executeTakeFirst();
  return defaultBiz?.id || reqUser?.businessId || reqUser?.userId || reqUser?.id;
};

// Get all clients
router.get('/', async (req: any, res: any) => {
  try {
    const businessId = await getLocalBusinessId(req.user);
    const clients = await db.selectFrom('Client')
      .selectAll()
      .where('businessId', '=', businessId)
      .orderBy('name', 'asc')
      .execute()
      .catch(() => []);
    res.json(clients);
  } catch (error) {
    console.error('[Local Server] Clients fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create/Update client
router.post('/', async (req: any, res: any) => {
  try {
    const businessId = await getLocalBusinessId(req.user);
    const { id, name, phone, email, address } = req.body;
    let client;
    const clientId = id || String(Date.now());

    const clientData = {
      name: name || 'Unnamed Client',
      phone: phone || null,
      email: email || null,
      address: address || null,
      updatedAt: new Date().toISOString()
    };

    const existing = await db.selectFrom('Client').selectAll().where('id', '=', clientId).executeTakeFirst();
    if (existing) {
      await db.updateTable('Client').set(clientData).where('id', '=', clientId).execute();
      client = { id: clientId, businessId, ...clientData };
    } else {
      client = { id: clientId, businessId, ...clientData, createdAt: new Date().toISOString() };
      await db.insertInto('Client').values(client).execute();
    }

    res.json(client);
  } catch (error) {
    console.error('[Local Server] Client save error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete client
router.delete('/:id', async (req: any, res: any) => {
  try {
    const businessId = await getLocalBusinessId(req.user);
    const { id } = req.params;
    await db.deleteFrom('Client')
      .where('id', '=', id)
      .where('businessId', '=', businessId)
      .execute();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
