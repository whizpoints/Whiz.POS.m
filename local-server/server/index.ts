process.on('unhandledRejection', (err) => console.error('[Process] Unhandled Rejection:', err));
process.on('uncaughtException', (err) => console.error('[Process] Uncaught Exception:', err));
import crypto from 'crypto';
// @ts-nocheck
import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientIO } from 'socket.io-client';

import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


import authRoutes from './routes/auth.js';
import db from './db.js';
import syncRoutes from './routes/sync.js';
import syncDeltaRoutes from './routes/syncDelta.js';
import dashboardRoutes from './routes/dashboard.js';
import businessRoutes from './routes/business.js';
import inventoryRoutes from './routes/inventory.js';
import categoriesRoutes from './routes/categories.js';
import customersRoutes from './routes/customers.js';
import mpesaRoutes from './routes/mpesa.js';
import terminalRoutes from './routes/terminal.js';
import terminalsRoutes from './routes/terminals.js';
import emailRoutes from './routes/email.js';
import adminRoutes from './routes/admin.js';
import settingsRoutes from './routes/settings.js';
import reconciliationRoutes from './routes/reconciliation.js';
import outletsRoutes from './routes/outlets.js';
import ledgerRoutes from './routes/ledger.js';
import setupRoutes from './routes/setup.js';
import documentsRoutes from './routes/documents.js';
import staffRoutes from './routes/staff.js';
import backupRoutes, { executeLocalServerBackup } from './routes/backup.js';
import kraRoutes from './routes/kra.js';

import { wafMiddleware } from './middleware/waf.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// 1. Local Socket.io Server (for POS Desktop Apps)
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('[Local Socket] POS Client connected:', socket.id);
  
  socket.on('join_business', (businessId) => {
    console.log(`[Local Socket] POS Client ${socket.id} joined room: business_${businessId}`);
    socket.join(`business_${businessId}`);
    socket.join(businessId);
  });

  socket.on('stock_deducted', (data) => {
    // Broadcast stock updates to other local POS terminals
    socket.broadcast.emit('stock_updated', data);
  });
  
  socket.on('disconnect', () => {
    console.log('[Local Socket] POS Client disconnected:', socket.id);
  });
});
app.set('io', io);

// 2. Cloud Socket.io Client (Connects to Web Portal)
const isProd = process.env.NODE_ENV === 'production';
const CLOUD_URL = process.env.CLOUD_API_URL || (isProd ? 'https://pos.whizpoint.app' : 'https://api.whizpoint.app');
let cloudSocket;
try {
  cloudSocket = ClientIO(CLOUD_URL, {
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 5000,
  });

  cloudSocket.on('connect', async () => {
    console.log('[Cloud Socket] Connected to Cloud Server');
    try {
      // Find business ID to join room
      const location = await db.selectFrom('StoreLocation').selectAll().executeTakeFirst();
      if (location && location.businessId) {
        cloudSocket.emit('join_business', location.businessId);
      }
    } catch (err) {}
  });

  cloudSocket.on('downward_sync_event', (data) => {
    console.log('[Cloud Socket] Received downward sync event:', data);
    // Notify local POS apps immediately
    io.emit('cloud_sync_received', data);
  });

  cloudSocket.on('mpesa_payment_received', async (data) => {
    console.log('[Cloud Socket] Received M-Pesa payment event:', data);
    try {
      if (data && data.transactionId) {
        const existing = await db.selectFrom('MpesaTransaction')
          .selectAll()
          .where('transactionId', '=', data.transactionId)
          .executeTakeFirst();
        if (!existing) {
          await db.insertInto('MpesaTransaction').values({
            id: data.id || crypto.randomUUID(),
            businessId: data.businessId,
            locationId: data.locationId || null,
            outletId: data.outletId || null,
            transactionId: data.transactionId,
            amount: Number(data.amount) || 0,
            phoneNumber: String(data.phoneNumber || ''),
            customerName: data.customerName || null,
            status: 'UNLINKED',
            isEnriched: data.isEnriched ? 1 : 0,
            timestamp: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }).execute();
        }
      }
    } catch (err) {
      console.error('[Cloud Socket] Failed to record M-Pesa transaction locally:', err);
    }
    // Broadcast immediately to local POS terminals
    io.emit('mpesa_payment_received', data);
  });

  cloudSocket.on('disconnect', () => {
    console.log('[Cloud Socket] Disconnected from Cloud Server');
  });
} catch(e) {
  console.error('[Cloud Socket] Initialization failed', e);
}

const PORT = process.env.PORT || 5050;

// Enable CORS for all origins dynamically (needed for Electron desktop POS clients with credentials)
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-api-key',
    'X-API-KEY',
    'x-outlet-id',
    'X-Outlet-Id',
    'x-business-id',
    'X-Business-Id',
    'x-terminal-id',
    'X-Terminal-Id',
    'x-location-id',
    'X-Location-Id',
    'x-device-id',
    'X-Device-Id',
    'Accept',
    'Origin',
    'X-Requested-With'
  ]
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Apply Security WAF & Rate-Limiter Middleware
app.use(wafMiddleware);

// (Static files are served later below)


// Serve local uploads
import { getUploadsDir } from './paths.js';
const uploadsDir = getUploadsDir();
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sync/delta', syncDeltaRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/mpesa', mpesaRoutes);
app.use('/api/callbacks/payments', mpesaRoutes); // Daraja complains about 'mpesa' in callback URLs
app.use('/api/terminal', terminalRoutes);
app.use('/api/terminals', terminalsRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reconciliation', reconciliationRoutes);
app.use('/api/outlets', outletsRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/users', staffRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/kra', kraRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Serve React Frontend (Monolith Architecture)
// Determine __dirname equivalent in ES Modules



import fs from 'fs';
const clientBuildPath = path.join(__dirname, '../dist');

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  
  try {
    let filePath = path.join(clientBuildPath, req.path === '/' ? 'index.html' : req.path);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(clientBuildPath, 'index.html');
    }
    
    const ext = path.extname(filePath);
    const mimeTypes: any = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.mjs': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.txt': 'text/plain'
    };
    
    const content = fs.readFileSync(filePath);
    res.set('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.send(content);
  } catch (err) {
    console.error('Static serve error:', err);
    res.status(500).send('Error loading frontend UI');
  }
});

// -----------------------------------------
// Background Cloud Sync Engine
// -----------------------------------------
setInterval(async () => {
  try {
    const isProd = process.env.NODE_ENV === 'production';
    const CLOUD_API = process.env.CLOUD_API_URL || (isProd ? 'https://pos.whizpoint.app' : 'https://api.whizpoint.app');
    const business = await db.selectFrom('Business').selectAll().executeTakeFirst();
    const location = await db.selectFrom('StoreLocation').selectAll().executeTakeFirst();
    if (!business || !business.apiKey || !location) return;
    const apiKey = business.apiKey;

    // --- NEW: PUSH DELTA TO CLOUD ---
    try {
      const lastPushLog = await db.selectFrom('SyncLog')
          .selectAll()
          .where('type', '=', 'PUSH_DELTA')
          .orderBy('createdAt', 'desc')
          .executeTakeFirst();
      
      const pushSinceStr = lastPushLog ? new Date(lastPushLog.createdAt).toISOString() : "1970-01-01T00:00:00.000Z";
      
      const [localUsers, localProducts, localCustomers, localSuppliers, localStockMovements, rawReceipts, localOutlets, localTerminals] = await Promise.all([
         db.selectFrom('User').selectAll().where('updatedAt', '>', pushSinceStr).execute(),
         db.selectFrom('Product').selectAll().where('updatedAt', '>', pushSinceStr).execute(),
         db.selectFrom('Customer').selectAll().where('updatedAt', '>', pushSinceStr).execute(),
         db.selectFrom('Supplier').selectAll().where('updatedAt', '>', pushSinceStr).execute(),
         db.selectFrom('StockMovement').selectAll().where('updatedAt', '>', pushSinceStr).execute(),
         db.selectFrom('Receipt').selectAll().where('updatedAt', '>', pushSinceStr).execute(),
          db.selectFrom('Outlet').selectAll().where('updatedAt', '>', pushSinceStr).execute(),
          db.selectFrom('Terminal').selectAll().where('updatedAt', '>', pushSinceStr).execute(),
      ]);

      const localTransactions = [];
      for (const r of rawReceipts) {
          const items = await db.selectFrom('ReceiptItem').selectAll().where('receiptId', '=', r.id).execute();
          localTransactions.push({ ...r, items });
      }

      if (localUsers.length > 0 || localProducts.length > 0 || localCustomers.length > 0 || localStockMovements.length > 0 || localTransactions.length > 0 || pushSinceStr === "1970-01-01T00:00:00.000Z") {
          console.log(`[Sync Engine] Pushing ${localProducts.length} products, ${localUsers.length} users, ${localStockMovements.length} inventory logs, ${localTransactions.length} transactions to Cloud`);
          
          const businessSetup = business.settings ? (typeof business.settings === 'string' ? JSON.parse(business.settings) : business.settings) : {};
          businessSetup.businessName = business.name;
          businessSetup.locationId = businessSetup.cloudLocationId || location.id;

          const pushRes = await fetch(`${CLOUD_API}/api/sync/delta`, {
              method: 'POST',
              headers: {
                  'x-api-key': apiKey,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                  users: localUsers,
                  products: localProducts,
                  customers: localCustomers,
                  suppliers: localSuppliers,
                  transactions: localTransactions,
                  outlets: localOutlets,
                  terminals: localTerminals,
                  inventoryLogs: localStockMovements.map(sm => ({ ...sm, variance: sm.quantity })), // Map local quantity to cloud variance
                  businessSetup
              })
          });

          if (pushRes.ok) {
              await db.insertInto('SyncLog')
// @ts-ignore
.values({
                  id: crypto.randomUUID(),
                  businessId: business.id,
                  terminal: 'LocalServer',
                  status: 'SUCCESS',
                  type: 'PUSH_DELTA',
                  createdAt: new Date().toISOString()
              }).execute();
              console.log(`[Sync Engine] PUSH_DELTA successful.`);
          }
      }
    } catch (e) {
      console.error('[Sync Engine] PUSH_DELTA failed:', e.message);
    }

    // --- NEW: PULL DELTA FROM CLOUD ---
    try {
      const lastPullLog = await db.selectFrom('SyncLog')
          .selectAll()
          .where('type', '=', 'PULL_DELTA')
          .orderBy('createdAt', 'desc')
          .executeTakeFirst();
      
      const pullSinceStr = lastPullLog ? new Date(lastPullLog.createdAt).toISOString() : "1970-01-01T00:00:00.000Z";
      
      const pullRes = await fetch(`${CLOUD_API}/api/sync/delta?since=${encodeURIComponent(pullSinceStr)}&locationId=${(business.settings ? (typeof business.settings === 'string' ? JSON.parse(business.settings) : business.settings) : {}).cloudLocationId || location.id}`, {
          headers: {
              'x-api-key': apiKey,
              'Authorization': `Bearer ${apiKey}`
          }
      });

      if (pullRes.ok) {
          const pullData = await pullRes.json();
          if (pullData.success && pullData.data) {
              const payload = { ...pullData.data, isFromCloud: true };
              
              if (payload.businessSetup) {
                  delete payload.businessSetup.lanAdminIp;
                  delete payload.businessSetup.apiUrl;
                  delete payload.businessSetup.apiKey; // prevent overwriting local apiKey
              }

              const localPostRes = await fetch(`http://127.0.0.1:${PORT}/api/sync/delta`, {
                  method: 'POST',
                  headers: {
                      'x-api-key': apiKey,
                      'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(payload)
              });

              if (localPostRes.ok) {
                  await db.insertInto('SyncLog')
// @ts-ignore
.values({
                      id: crypto.randomUUID(),
                      businessId: business.id,
                      terminal: 'LocalServer',
                      status: 'SUCCESS',
                      type: 'PULL_DELTA',
                      createdAt: pullData.timestamp || new Date().toISOString()
                  }).execute();
                  console.log(`[Sync Engine] PULL_DELTA successful.`);
              }
          }
      }
    } catch (e) {
      console.error('[Sync Engine] PULL_DELTA failed:', e.message);
    }
  } catch (err) {
    // console.error('[Sync Engine] Background sync failed:', err.message);
  }
}, 15000); // Run every 15 seconds

// -----------------------------------------
// Automated High-Frequency Encrypted Backup Daemon
// -----------------------------------------
const BACKUP_INTERVAL_MS = 15 * 60 * 1000; // Run every 15 minutes
setTimeout(async () => {
  try {
    console.log('[Backup Daemon] Running initial server startup backup...');
    await executeLocalServerBackup();
  } catch (e: any) {
    console.warn('[Backup Daemon] Initial startup backup skipped:', e.message);
  }
}, 10000); // 10 seconds after boot

setInterval(async () => {
  try {
    await executeLocalServerBackup();
  } catch (e: any) {
    console.error('[Backup Daemon] Automated 15-minute backup failed:', e.message);
  }
}, BACKUP_INTERVAL_MS);

server.listen(Number(PORT), '0.0.0.0', () => {
  if (Number(PORT) === 3000) {
    console.log(`🚀 Cloud Web App (Back Office) running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  } else {
    console.log(`🖥️  Local Admin Server running in ${process.env.NODE_ENV} mode on port ${PORT} (0.0.0.0)`);
    
    // Broadcast mDNS service for Terminal discovery
    try {
      import('bonjour-service').then(({ default: Bonjour }) => {
        const bonjour = new Bonjour();
        bonjour.publish({ 
          name: 'Whiz POS Admin Server', 
          type: 'whizpos-admin', 
          port: Number(PORT) 
        });
        console.log(`📡 Broadcasting mDNS service 'whizpos-admin' on port ${PORT}`);
      }).catch(err => console.error('Failed to load bonjour-service:', err));
    } catch (err) {
      console.error('Error publishing mDNS:', err);
    }
  }
});



