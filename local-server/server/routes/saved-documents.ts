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

// Get all saved documents
router.get('/', async (req: any, res: any) => {
  try {
    const businessId = await getLocalBusinessId(req.user);
    const docs = await db.selectFrom('SavedDocument')
      .selectAll()
      .where('businessId', '=', businessId)
      .orderBy('createdAt', 'desc')
      .execute()
      .catch(() => []);

    const parsedDocs = docs.map((d: any) => {
      let items = [];
      let metadata = {};
      try { items = typeof d.items === 'string' ? JSON.parse(d.items || '[]') : (d.items || []); } catch (e) {}
      try { metadata = typeof d.metadata === 'string' ? JSON.parse(d.metadata || '{}') : (d.metadata || {}); } catch (e) {}
      return {
        ...d,
        items,
        metadata
      };
    });
    res.json(parsedDocs);
  } catch (error) {
    console.error('[Local Server] Saved documents fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export Document (Create Snapshot)
router.post('/export', async (req: any, res: any) => {
  try {
    const businessId = await getLocalBusinessId(req.user);
    const doc = req.body;

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let codeStr = '';
    for (let i = 0; i < 6; i++) codeStr += chars.charAt(Math.floor(Math.random() * chars.length));
    const snapshotId = `EXP-${codeStr}`;

    const newDoc = {
      id: snapshotId,
      businessId,
      type: doc.type || 'INVOICE',
      date: doc.date ? new Date(doc.date).toISOString() : new Date().toISOString(),
      dueDate: doc.dueDate ? new Date(doc.dueDate).toISOString() : null,
      customerName: doc.customerName || doc.clientCompany || doc.clientName || 'Unknown',
      customerEmail: doc.customerEmail || doc.clientEmail || null,
      customerPhone: doc.customerPhone || null,
      customerAddress: doc.customerAddress || doc.clientAddress || null,
      items: JSON.stringify(doc.items || []),
      subtotal: Number(doc.subtotal) || 0,
      tax: Number(doc.tax) || Number(doc.taxAmount) || 0,
      total: Number(doc.total) || 0,
      notes: doc.notes || null,
      status: 'EXPORTED_SNAPSHOT',
      metadata: JSON.stringify({
        ...doc,
        isSnapshot: true,
        verificationCode: codeStr
      }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.insertInto('SavedDocument').values(newDoc).execute();
    res.json({ success: true, verificationCode: codeStr });
  } catch (error) {
    console.error('[Local Server] Export Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create/Update document
router.post('/', async (req: any, res: any) => {
  try {
    const businessId = await getLocalBusinessId(req.user);
    const doc = req.body;
    const docId = doc.id || `DOC-${Date.now()}`;

    const docData = {
      businessId,
      type: doc.type || 'INVOICE',
      date: doc.date ? new Date(doc.date).toISOString() : new Date().toISOString(),
      dueDate: doc.dueDate ? new Date(doc.dueDate).toISOString() : null,
      customerName: doc.customerName || doc.clientCompany || doc.clientName || 'Unknown',
      customerEmail: doc.customerEmail || null,
      customerPhone: doc.customerPhone || null,
      customerAddress: doc.customerAddress || null,
      items: JSON.stringify(doc.items || []),
      subtotal: Number(doc.subtotal) || 0,
      tax: Number(doc.tax) || 0,
      total: Number(doc.total) || 0,
      notes: doc.notes || null,
      status: doc.status || 'DRAFT',
      metadata: JSON.stringify(doc.metadata || {}),
      updatedAt: new Date().toISOString()
    };

    const existing = await db.selectFrom('SavedDocument').selectAll().where('id', '=', docId).executeTakeFirst();
    let savedDoc;
    if (existing) {
      await db.updateTable('SavedDocument').set(docData).where('id', '=', docId).execute();
      savedDoc = { id: docId, ...docData };
    } else {
      savedDoc = { id: docId, ...docData, createdAt: new Date().toISOString() };
      await db.insertInto('SavedDocument').values(savedDoc).execute();
    }

    res.json(savedDoc);
  } catch (error) {
    console.error('[Local Server] Save document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete document
router.delete('/:id', async (req: any, res: any) => {
  try {
    const businessId = await getLocalBusinessId(req.user);
    const { id } = req.params;
    await db.deleteFrom('SavedDocument')
      .where('id', '=', id)
      .where('businessId', '=', businessId)
      .execute();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
