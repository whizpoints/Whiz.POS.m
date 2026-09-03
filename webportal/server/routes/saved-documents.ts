import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const authenticate = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing authorization header' });
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

router.use(authenticate);

// Get all saved documents
router.get('/', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const docs = await prisma.savedDocument.findMany({
      where: { businessId, NOT: { id: { startsWith: 'EXP-' } } },
      orderBy: { createdAt: 'desc' }
    });
    // Parse JSON fields
    const parsedDocs = docs.map((d: any) => ({
        ...d,
        items: JSON.parse(d.items || '[]'),
        metadata: JSON.parse(d.metadata || '{}')
    }));
    res.json(parsedDocs);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Export Document (Create Snapshot)
router.post('/export', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const doc = req.body;
    
    // Generate a secure, unique 6-letter verification code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let codeStr = '';
    for (let i = 0; i < 6; i++) codeStr += chars.charAt(Math.floor(Math.random() * chars.length));
    
    const snapshotId = `EXP-${codeStr}`;
    
    await prisma.savedDocument.create({
      data: {
        id: snapshotId,
        businessId,
        type: doc.type || 'INVOICE',
        date: doc.date ? new Date(doc.date) : new Date(),
        dueDate: doc.dueDate ? new Date(doc.dueDate) : null,
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
        })
      }
    });
    
    res.json({ success: true, verificationCode: codeStr });
  } catch (error) {
    console.error('Export Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create/Update document
router.post('/', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const doc = req.body;
    let savedDoc;
    
    const docData = {
        businessId,
        type: doc.type,
        date: new Date(doc.date),
        dueDate: doc.dueDate ? new Date(doc.dueDate) : null,
        customerName: doc.customerName || 'Unknown',
        customerEmail: doc.customerEmail,
        customerPhone: doc.customerPhone,
        customerAddress: doc.customerAddress,
        items: JSON.stringify(doc.items || []),
        subtotal: doc.subtotal,
        tax: doc.tax,
        total: doc.total,
        notes: doc.notes,
        status: doc.status || 'DRAFT',
        metadata: JSON.stringify(doc.metadata || {})
    };

    const existing = await prisma.savedDocument.findFirst({ where: { id: doc.id, businessId } });
    if (existing) {
        savedDoc = await prisma.savedDocument.update({
            where: { id: doc.id },
            data: docData
        });
    } else {
        savedDoc = await prisma.savedDocument.create({
            data: { id: doc.id, ...docData }
        });
    }
    res.json(savedDoc);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete document
router.delete('/:id', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { id } = req.params;
    await prisma.savedDocument.deleteMany({
      where: { id, businessId }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
