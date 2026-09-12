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
import backupRoutes from './routes/backup.js';

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
const CLOUD_URL = process.env.CLOUD_API_URL || 'https://api.whizpoint.app';
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

  cloudSocket.on('disconnect', () => {
    console.log('[Cloud Socket] Disconnected from Cloud Server');
  });
} catch(e) {
  console.error('[Cloud Socket] Initialization failed', e);
}

const PORT = process.env.PORT || 5050;

// Enable CORS for all origins dynamically (needed for Electron desktop POS clients with credentials)
app.use(cors({
  origin: '*',
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'X-API-KEY']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Apply Security WAF & Rate-Limiter Middleware
app.use(wafMiddleware);

// (Static files are served later below)


// Serve local uploads
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
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
    const CLOUD_API = process.env.CLOUD_API_URL || 'https://api.whizpoint.app';
    const location = await db.selectFrom('StoreLocation').selectAll().executeTakeFirst();
    if (!location || !location.apiKey) return;

    // 1. Fetch pending receipts from SQLite
    const pendingReceipts = await db.selectFrom('Receipt')
      .selectAll()
      .where('synced', '=', 0) // Assume synced column is integer 0 or 1
      .execute();
      
    if (pendingReceipts.length === 0) return;
    
    // Fetch items for pending receipts
    for (const receipt of pendingReceipts) {
      receipt.items = await db.selectFrom('ReceiptItem').selectAll().where('receiptId', '=', receipt.id).execute();
    }

    // 2. Send to Cloud REST API
    const res = await fetch(`${CLOUD_API}/api/sync/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${location.apiKey}` // Or x-api-key based on auth logic
      },
      body: JSON.stringify({ receipts: pendingReceipts })
    });
    
    if (res.ok) {
      // 3. Mark as synced locally
      for (const receipt of pendingReceipts) {
        await db.updateTable('Receipt').set({ synced: 1 }).where('id', '=', receipt.id).execute();
      }
      console.log(`[Sync Engine] Successfully synced ${pendingReceipts.length} receipts to cloud.`);
      
      if (cloudSocket && cloudSocket.connected) {
         cloudSocket.emit('local_transaction_synced', { businessId: location.businessId, count: pendingReceipts.length });
      }
    }
  } catch (err) {
    // console.error('[Sync Engine] Background sync failed:', err.message);
  }
}, 60000); // Run every 60 seconds // Run every 60 seconds

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

