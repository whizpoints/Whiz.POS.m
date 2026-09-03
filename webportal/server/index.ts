import express from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import syncRoutes from './routes/sync.js';
import syncDeltaRoutes from './routes/syncDelta.js';
import dashboardRoutes from './routes/dashboard.js';
import businessRoutes from './routes/business.js';
import emailRoutes from './routes/email.js';
import inventoryRoutes from './routes/inventory.js';
import customersRoutes from './routes/customers.js';
import mpesaRoutes from './routes/mpesa.js';
import terminalRoutes from './routes/terminal.js';
import adminRoutes from './routes/admin.js';
import settingsRoutes from './routes/settings.js';
import reconciliationRoutes from './routes/reconciliation.js';
import outletsRoutes from './routes/outlets.js';
import ledgerRoutes from './routes/ledger.js';
import setupRoutes from './routes/setup.js';
import documentsRoutes from './routes/documents.js';
import clientsRoutes from './routes/clients.js';
import savedDocsRoutes from './routes/saved-documents.js';
import downloadsRoutes from './routes/downloads.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

// Enable CORS for all origins dynamically (needed for Electron desktop POS clients with credentials)
app.use(cors({
  origin: '*',
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'X-API-KEY']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// (Static files are served later below)

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sync/delta', syncDeltaRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/mpesa', mpesaRoutes);
app.use('/api/callbacks/payments', mpesaRoutes); // Daraja complains about 'mpesa' in callback URLs
app.use('/api/terminal', terminalRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reconciliation', reconciliationRoutes);
app.use('/api/outlets', outletsRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/saved-documents', savedDocsRoutes);
app.use('/api/downloads', downloadsRoutes);

// Health check



// Document Verification Route
app.get('/api/verify/:code', async (req, res) => {
  const { code } = req.params;
  const upperCode = code.toUpperCase();
  
  if (!code || code.length < 5) {
    return res.status(404).send('Invalid verification code');
  }

  let docData = null;
  
  try {
    
    
    const getVerificationCode = (str) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
      }
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let codeStr = '';
      let num = Math.abs(hash);
      for (let i = 0; i < 6; i++) {
        codeStr += chars[num % 26];
        num = Math.floor(num / 26);
      }
      return codeStr;
    };

    
    // 0. Check Immutable Export Snapshot FIRST (O(1) fast lookup)
    const snapshot = await prisma.savedDocument.findUnique({ where: { id: `EXP-${upperCode}` }, include: { business: true } });
    if (snapshot) {
       docData = {
          business: snapshot.business, type: snapshot.type, date: snapshot.date, total: snapshot.total,
          customerName: snapshot.customerName, items: JSON.parse(snapshot.items || '[]')
       };
    }

    const allDocs = await prisma.savedDocument.findMany({ include: { business: true } });

    
    // 1. Check New 6-Letter Codes
    for (const d of allDocs) {
       let docNum = '';
         let clientName = '';
         try { 
            const meta = JSON.parse(d.metadata || '{}');
            docNum = meta.docNumber || ''; 
            clientName = meta.clientName || '';
         } catch(e){}
         const str = docNum + clientName;
       if (getVerificationCode(str) === upperCode) {
          docData = {
            business: d.business, type: d.type, date: d.date, total: d.total, 
            customerName: d.customerName, items: JSON.parse(d.items || '[]')
          };
          break;
       }
    }

    // 2. Check Receipts
    if (!docData) {
       const allReceipts = await prisma.receipt.findMany({ include: { business: true, items: true } });
       for (const r of allReceipts) {
          const str = r.receiptNumber + (r.customerPhone || '');
          if (getVerificationCode(str) === upperCode) {
             docData = {
                business: r.business, type: 'RECEIPT', date: r.createdAt, total: r.totalAmount, 
                customerName: r.customerPhone || 'Walk-in', 
                items: r.items.map(i => ({ description: i.productName, quantity: i.quantity, total: i.totalPrice }))
             };
             break;
          }
       }
    }

    // 3. Fallback Old 6-Digit Codes
    
  } catch (err) {
    console.error('Verification error:', err);
  }
  
  if (!docData) {
    return res.status(404).json({ success: false, message: 'Invalid Document' });
  }
  return res.json({ success: true, data: docData });
});



  app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Serve React Frontend (Monolith Architecture)
// Determine __dirname equivalent in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const clientBuildPath = path.join(__dirname, '../dist');
app.use(express.static(clientBuildPath));

// Wildcard route to handle React Router client-side navigation
app.use((req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// -----------------------------------------
// Background Cloud Sync Engine
// -----------------------------------------
setInterval(async () => {
  try {
    // 1. Fetch pending receipts/stock movements from SQLite
    // 2. Send to https://api.whizpoint.app/api/sync/up
    // 3. Mark as synced locally
    // console.log('[Sync Engine] Background sync completed.');

    
  } catch (err) {

    console.error('[Sync Engine] Background sync failed:', err);
  }
}, 60000); // Run every 60 seconds

app.listen(PORT, () => {
  if (PORT == 3000) {
    console.log(`🚀 Cloud Web App (Back Office) running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    console.log(`🚀 Cloud Web App (Back Office) Dev Url: https://api.whizpoint.app`);
  } else {
    console.log(`🖥️  Local Admin Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  }
});

