const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode');
const crypto = require('crypto');
const os = require('os');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');
const sqliteDb = require('./sqlite-db.cjs');
const { initDB, migrateLegacyData, readJsonFileFallback, writeJsonFileFallback, backupDB, closeDB } = sqliteDb;
const cryptoBackup = require('./backup-crypto.cjs');
const { generateReceipt, generateClosingReport, generateBusinessSetup, generateCustomerBill, generateCashierSlip, generateShiftAuditStrip, generateCashierSummarySlip } = require(path.join(__dirname, 'print-jobs.cjs'));
const kraService = require('./kra-etims.cjs');
const { MongoClient } = require('mongodb');
const { dialog } = require('electron'); // For file dialogs

const store = new Store();

/**
 * Main Electron Process Script.
 * Handles application lifecycle, window management, IPC communication, and a local API server for mobile printing.
 */

// Define paths for storing user data and assets.
// Switch to a more secure/stable directory on Windows (e.g., C:\ProgramData) to prevent crashes on first launch or user-specific permissions issues.
let baseDataPath; console.log('ACTUAL USER DATA:', app.getPath('userData'));
if (process.platform === 'win32') {
    // Safely get commonAppData or fallback to environment variable / hardcoded C:\ProgramData
    let commonAppData;
    try {
        commonAppData = app.getPath('commonAppData');
    } catch (e) {
        commonAppData = process.env.PROGRAMDATA || 'C:\\ProgramData';
    }
    baseDataPath = path.join(commonAppData, 'whiz-pos');

    // Override userData globally so internal modules use this path too
    try {
        app.setPath('userData', baseDataPath);
    } catch (e) {
        // Ignore if we can't set it
    }
} else {
    baseDataPath = app.getPath('userData');
}

// Custom Logger Setup
let logBasePath = baseDataPath;
const logFilePath = path.join(logBasePath, 'logs.txt');

function logToFile(message) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;
    fs.mkdir(logBasePath, { recursive: true })
        .then(() => fs.appendFile(logFilePath, logLine))
        .catch(err => process.stderr.write('Failed to write to log file: ' + err.message + '\n'));
}

// Override console methods to capture logs
const originalLog = console.log;
const originalError = console.error;

console.log = (...args) => {
    const message = args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' ');
    logToFile(`INFO: ${message}`);
    originalLog.apply(console, args);
};

console.error = (...args) => {
    const message = args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' ');
    logToFile(`ERROR: ${message}`);
    originalError.apply(console, args);
};

const userDataPath = path.join(baseDataPath, 'data');
const productImagesPath = path.join(baseDataPath, 'assets', 'product_images');

/**
 * Optimizes data on startup.
 * - Dedupes users
 * - Cleans expired sessions
 * - Ensures data integrity
 */
async function optimizeData() {
    try {
        console.log('[Data Optimization] Starting...');

        // 1. Optimize Users (Dedupe by ID or Name)
        const users = await readJsonFile('users.json');
        if (users.length > 0) {
            const uniqueUsers = [];
            const seenIds = new Set();
            const seenNames = new Set();

            users.forEach(u => {
                if (!u.id || !u.name) return; // Skip invalid
                // Prefer keeping the one with most recent updatedAt?
                // Simple dedupe: First wins, but we should probably sort by updatedAt desc first if we want latest.
                // Assuming append-only history might exist, but we read the whole file which is the current state.

                if (!seenIds.has(u.id) && !seenNames.has(u.name.toLowerCase())) {
                    seenIds.add(u.id);
                    seenNames.add(u.name.toLowerCase());
                    uniqueUsers.push(u);
                }
            });

            if (uniqueUsers.length !== users.length) {
                console.log(`[Data Optimization] Removed ${users.length - uniqueUsers.length} duplicate/invalid users.`);
                await writeJsonFile('users.json', uniqueUsers);
            }
        }

        // 2. Clean Sessions
        const sessions = await readJsonFile('sessions.json');
        if (Array.isArray(sessions) && sessions.length > 0) {
            const now = new Date();
            const validSessions = sessions.filter(s => {
                if (!s.createdAt) return false;
                const diffDays = (now - new Date(s.createdAt)) / (1000 * 60 * 60 * 24);
                return diffDays < 7;
            });

            if (validSessions.length !== sessions.length) {
                console.log(`[Data Optimization] Pruned ${sessions.length - validSessions.length} expired sessions.`);
                await writeJsonFile('sessions.json', validSessions);
            }
        }

        console.log('[Data Optimization] Complete.');
    } catch (e) {
        console.error('[Data Optimization] Failed:', e);
    }
}

/**
 * Ensures that the necessary application directories exist.
 * Creates 'data' and 'assets/product_images' directories in the user data path.
 */
async function ensureAppDirs() {
  try {
    if (process.platform === 'win32') {
        await fs.mkdir(logBasePath, { recursive: true });
    }
    await fs.mkdir(userDataPath, { recursive: true });
    await fs.mkdir(productImagesPath, { recursive: true });
  } catch (error) {
    console.error('Failed to create application directories:', error);
    // Explicitly fallback if permissions to C:\ProgramData\whiz-pos fail
    if (process.platform === 'win32') {
        console.warn('Falling back to user AppData due to permission error.');
        // This is tricky to handle globally post-init, but for resilience, logging it.
    }
  }
}

/**
 * Helper to safely read from SQLite wrapper
 */
async function readJsonFile(filename) {
    try {
        const data = await readJsonFileFallback(filename);
        if (!data) return [];
        return data;
    } catch (e) {
        return [];
    }
}

/**
 * Helper to safely write to SQLite wrapper
 */
async function writeJsonFile(filename, data) {
    await writeJsonFileFallback(filename, data);
}

/**
 * Ensures that the initial data exists in the SQLite database.
 */
async function ensureDataFilesExist() {
  const dataFiles = {
    'business-setup.json': { isSetup: false },
    'server-config.json': { apiKey: null }, // Persist API Key
    'users.json': [],
    'products.json': [],
    'transactions.json': [],
    'expenses.json': [],
    'salaries.json': [], // New file for salaries
    'credit-customers.json': [],
    'mobile-receipts.json': [], // New file for queuing mobile receipts
    'credit-payments.json': [], // New file for credit payments
    'inventory-logs.json': [], // New file for inventory logs
    'daily-summaries.json': {}, // New file for archived daily reports
    'sessions.json': [],
    'suppliers.json': []
  };

  for (const [fileName, content] of Object.entries(dataFiles)) {
      try {
          const currentData = await readJsonFileFallback(fileName);
          if ((Array.isArray(currentData) && currentData.length === 0) || (!Array.isArray(currentData) && Object.keys(currentData || {}).length === 0)) {
              if (content !== null) {
                  await writeJsonFileFallback(fileName, content);
              }
          }
      } catch (e) {
          console.error(`Error ensuring data for ${fileName}:`, e);
      }
  }
}

/**
 * Loads a URL into a BrowserWindow with retry logic.
 * Useful for development when the Vite server might not be ready immediately.
 *
 * @param {BrowserWindow} win - The window to load the URL into.
 * @param {string} url - The URL to load.
 */
const loadUrlWithRetries = (win, url) => {
  win.loadURL(url).catch(() => {
    console.log('Vite server not ready, retrying in 2 seconds...');
    setTimeout(() => {
      loadUrlWithRetries(win, url);
    }, 2000);
  });
};

/**
 * Creates the main application window.
 * Configures size, preferences, and loads the application content.
 */
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Don't show until maximized
    icon: path.join(__dirname, 'assets', 'logo.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // contextIsolation is true by default and is a security best practice.
    },
  });

  // Remove the default menu bar
  mainWindow.setMenu(null);
  mainWindow.maximize();
  mainWindow.show();

  // Force external links to open in the OS default browser rather than an Electron popup
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });

  // In development, load from the Vite dev server
  if (!app.isPackaged) {
    const url = process.argv[2] || 'http://localhost:5174';
    loadUrlWithRetries(mainWindow, url);
    // Open the DevTools.
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the static build using loadFile to avoid Windows file:// protocol issues
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

// Enable remote debugging for Playwright
app.commandLine.appendSwitch('remote-debugging-port', '9222');

// Global API Key variable
let apiKey = null;
let server = null;
global.connectedDevicesMap = new Map();

// --- NEW BACKEND IMPLEMENTATION: Session & User Management ---

class SessionManager {
    constructor() {
        this.sessions = new Map(); // Token -> { user, deviceId, expiresAt }
        this.loadSessions();
    }

    async loadSessions() {
        const sessions = await readJsonFile('sessions.json');
        if (Array.isArray(sessions)) {
            sessions.forEach(s => {
                // Restore if valid (e.g., less than 7 days old)
                const createdAt = new Date(s.createdAt);
                const now = new Date();
                const diffDays = (now - createdAt) / (1000 * 60 * 60 * 24);
                if (diffDays < 7) {
                    this.sessions.set(s.token, { ...s, lastActive: new Date(s.lastActive) });
                }
            });
            console.log(`Restored ${this.sessions.size} sessions.`);
        }
    }

    async saveSessions() {
        const sessionsArray = Array.from(this.sessions.entries()).map(([token, data]) => ({ token, ...data }));
        await writeJsonFile('sessions.json', sessionsArray);
    }

    createSession(user, deviceId) {
        const token = crypto.randomUUID();
        // Session valid for 24 hours, but we can make it indefinite if needed
        // Requirement: "unique session token per device"
        this.sessions.set(token, {
            user: { ...user }, // Store copy of user data
            deviceId,
            createdAt: new Date(),
            lastActive: new Date()
        });
        this.saveSessions();
        return token;
    }

    validateSession(token) {
        if (!this.sessions.has(token)) return null;
        const session = this.sessions.get(token);
        session.lastActive = new Date(); // Update activity
        // Optimize: Don't save on every read, maybe debounce or periodic save?
        // For strict persistence, let's just save.
        // this.saveSessions();
        return session.user;
    }

    invalidateSession(token) {
        this.sessions.delete(token);
        this.saveSessions();
    }

    invalidateSessionsForUser(userId) {
        // Optional: If we wanted to force logout everywhere.
        // But prompt says: "Logging in on one device must not log out users on another"
        // So we do NOT implement this for normal login.
        // But maybe for 'Disable User'? Yes.
        for (const [token, session] of this.sessions.entries()) {
            // Strict ID check
            if (session.user.id === userId || session.user.userId === userId) {
                this.sessions.delete(token);
            }
        }
        this.saveSessions();
    }
}

const sessionManager = new SessionManager();

// --- User Management Logic (Strict) ---

const UserManager = {
    async authenticate(userId, pin) {
        const users = await readJsonFile('users.json');
        const user = users.find(u => (u.id === userId || u.userId === userId));

        if (!user) return { success: false, error: 'User not found' };
        if (user.isActive === false) return { success: false, error: 'User is disabled' };

        // Strict PIN check
        if (String(user.pin) === String(pin) || String(user.password) === String(pin)) {
            // Success
            return { success: true, user };
        }
        return { success: false, error: 'Invalid PIN' };
    },

    async addUser(userData) {
        try {
            console.log(`[UserManager] Adding user: ${userData.name}`);
            const users = await readJsonFile('users.json');

            // Check for duplicates
            if (users.some(u => u.name.toLowerCase() === userData.name.toLowerCase())) {
                throw new Error('User with this name already exists');
            }

            const newUser = {
                id: userData.id || `USER${Date.now()}`,
                userId: userData.id || `USER${Date.now()}`, // Ensure compatibility
                ...userData,
                isActive: true, // Default to active
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            users.push(newUser);
            await writeJsonFile('users.json', users);
            console.log(`[UserManager] User added successfully: ${newUser.id}`);
            return newUser;
        } catch (e) {
            console.error(`[UserManager] Add failed: ${e.message}`);
            throw e;
        }
    },

    async updateUser(userId, updates) {
        try {
            console.log(`[UserManager] Updating user: ${userId}`);
            const users = await readJsonFile('users.json');
            const index = users.findIndex(u => (u.id === userId || u.userId === userId));

            if (index === -1) throw new Error('User not found');

            const updatedUser = {
                ...users[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            users[index] = updatedUser;

            await writeJsonFile('users.json', users);
            console.log(`[UserManager] User updated successfully: ${userId}`);

            // If user is disabled, kill their sessions
            if (updates.isActive === false) {
                console.log(`[UserManager] Invalidating sessions for disabled user: ${userId}`);
                sessionManager.invalidateSessionsForUser(userId);
            }

            return updatedUser;
        } catch (e) {
            console.error(`[UserManager] Update failed: ${e.message}`);
            throw e;
        }
    },

    async deleteUser(userId) {
        const users = await readJsonFile('users.json');
        const filteredUsers = users.filter(u => (u.id !== userId && u.userId !== userId));

        if (users.length === filteredUsers.length) throw new Error('User not found');

        await writeJsonFile('users.json', filteredUsers);

        // Kill sessions
        sessionManager.invalidateSessionsForUser(userId);

        return true;
    }
};

/**
 * Initialize API Key from storage or create if missing
 */
async function initApiKey() {
    try {
        const configPath = path.join(userDataPath, 'server-config.json');
        let config = {};
        try {
            const data = await fs.readFile(configPath, 'utf-8');
            config = JSON.parse(data);
        } catch (e) {
            // Config might not exist yet
        }

        if (config.apiKey) {
            apiKey = config.apiKey;
        } else {
            apiKey = crypto.randomBytes(32).toString('hex');
            config.apiKey = apiKey;
            await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        }
        console.log('Server API Key initialized');
    } catch (e) {
        console.error('Failed to init API Key', e);
        apiKey = crypto.randomBytes(32).toString('hex'); // Fallback to memory
    }
}

// Sync Daemon (runs every 30s)
let syncInterval = null;
const SYNC_INTERVAL_MS = 30000;
let isSyncing = false;

function notifyServerDiscovered(serverInfo) {
  const win = BrowserWindow.getAllWindows()[0];
  if (win && !win.isDestroyed()) {
    win.webContents.send('server-discovered', serverInfo);
  }
}

async function probeServerUrl(url, timeoutMs = 800) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${url}/api/health`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch (e) {
    return false;
  }
}

async function discoverActiveServer() {
  const discovered = [];
  const checkedUrls = new Set();

  // 1. Check local loopback and local IPv4 network interfaces on port 5050
  const localCandidates = ['http://127.0.0.1:5050', 'http://localhost:5050'];
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal && net.address) {
        localCandidates.push(`http://${net.address}:5050`);
      }
    }
  }

  for (const candidate of localCandidates) {
    if (checkedUrls.has(candidate)) continue;
    checkedUrls.add(candidate);
    const isAlive = await probeServerUrl(candidate, 600);
    if (isAlive) {
      console.log(`[Auto-Discovery] Detected active local server at ${candidate}`);
      const entry = { name: 'Whiz POS Local Server', url: candidate };
      discovered.push(entry);
      notifyServerDiscovered(entry);
      // Prioritize LAN IP (e.g. 192.168.x.x) over loopback
      if (!candidate.includes('127.0.0.1') && !candidate.includes('localhost')) {
        return discovered;
      }
    }
  }

  // 2. Concurrently search via mDNS Bonjour for server on the LAN
  try {
    const Bonjour = require('bonjour-service').default;
    const bonjour = new Bonjour();
    await new Promise((resolve) => {
      const browser = bonjour.find({ type: 'whizpos-admin' }, (service) => {
        const ip = service.addresses?.find(a => a.includes('.')) || service.host;
        const port = service.port || 5050;
        const url = `http://${ip}:${port}`;
        if (!checkedUrls.has(url)) {
          checkedUrls.add(url);
          console.log(`[mDNS] Discovered Local Admin Server: ${service.name} at ${url}`);
          const entry = { name: service.name || 'Whiz POS Admin Server', url, ip, port };
          discovered.push(entry);
          notifyServerDiscovered(entry);
        }
      });

      setTimeout(() => {
        try {
          browser.stop();
          bonjour.destroy();
        } catch (e) {}
        resolve();
      }, 1500);
    });
  } catch (err) {
    console.warn('[mDNS] Discovery failed:', err.message);
  }

  return discovered.length > 0 ? discovered : null;
}

// Background auto-discovery interval to detect server IP changes seamlessly
setInterval(async () => {
  try {
    await discoverActiveServer();
  } catch (e) {}
}, 25000);

ipcMain.handle('discover-local-server', async () => {
  return await discoverActiveServer();
});

ipcMain.handle('check-mpesa-payment', async (event, { amount, expectedName }) => {
  try {
    const config = (await readJsonFileFallback('server-config.json')) || {};
    const bizSetup = (await readJsonFileFallback('business-setup.json')) || {};
    const backendUrl = (bizSetup.backOfficeUrl || bizSetup.cloudUrl || config.backOfficeUrl || 'https://backoffice.whizpoint.app').replace(/\/+$/, '');
    
    let businessId = bizSetup.cloudBusinessId || bizSetup.businessId || config.cloudBusinessId || '';
    if (!businessId && config?.apiKey) {
      try {
        const payload = JSON.parse(Buffer.from(config.apiKey.split('.')[1], 'base64').toString());
        businessId = payload.businessId;
      } catch (e) {}
    }
    if (!businessId) return null;

    const res = await fetch(`${backendUrl}/api/mpesa/payments/search?businessId=${businessId}`, {
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) return null;
    
    const txns = await res.json();
    if (!Array.isArray(txns)) return null;
    
    // Find a transaction matching the exact amount within the last 5 minutes
    const fiveMinsAgo = new Date(Date.now() - 5 * 60000);
    const match = txns.find(t => 
      Math.abs(Number(t.amount) - Number(amount)) < 0.01 && 
      new Date(t.timestamp) > fiveMinsAgo &&
      t.status === 'COMPLETED'
    );

    return match || null;
  } catch (error) {
    console.error('M-Pesa check error:', error);
    return null;
  }
});

const mpesaDaraja = require('./mpesa-daraja.cjs');

ipcMain.handle('send-mpesa-stk', async (event, { amount, phone, config }) => {
    try {
        const result = await mpesaDaraja.sendStkPush({
            amount, phone,
            passkey: config.passkey,
            shortcode: config.shortcode,
            consumerKey: config.consumerKey,
            consumerSecret: config.consumerSecret
        });
        return result;
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('query-mpesa-stk', async (event, { checkoutRequestId, config }) => {
    try {
        const result = await mpesaDaraja.queryStkPush({
            checkoutRequestId,
            passkey: config.passkey,
            shortcode: config.shortcode,
            consumerKey: config.consumerKey,
            consumerSecret: config.consumerSecret
        });
        return result;
    } catch (err) {
        return { success: false, error: err.message };
    }
});

async function runCloudSync() {
    try {
        const configPath = path.join(userDataPath, 'server-config.json');
        let config = {};
        try {
            const data = await fs.readFile(configPath, 'utf-8');
            config = JSON.parse(data);
        } catch (e) {
            // Config might not exist yet
        }

        if (config.apiKey) {
            apiKey = config.apiKey;
        } else {
            apiKey = crypto.randomBytes(32).toString('hex');
            config.apiKey = apiKey;
            await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        }
        console.log('Server API Key initialized');
    } catch (e) {
        console.error('Failed to init API Key', e);
        apiKey = crypto.randomBytes(32).toString('hex'); // Fallback to memory
    }
}


/**
 * Gets the local IPv4 address of the machine.
 * Used for generating the connection URL for the mobile app.
 *
 * @returns {string} The local IP address.
 */
function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

/**
 * Starts the local Express API server.
 * This server allows the Mobile App to send print jobs to the Desktop App.
 */
function startApiServer() {
    const apiApp = express();

    // Increase body limit to support large sync payloads
    apiApp.use(express.json({ limit: '50mb' }));
    apiApp.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Enable CORS for all routes, allowing specific headers for mobile sync
    apiApp.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-KEY', 'X-DEVICE-NAME'],
    }));

    // Serve product images statically
    apiApp.use('/assets', express.static(productImagesPath));

    // Middleware to track connected devices
    apiApp.use((req, res, next) => {
        const deviceName = req.headers['x-device-name'] || req.headers['user-agent'] || 'Unknown Device';
        const ip = req.ip.replace('::ffff:', ''); // Clean IPv6 prefix

        // Update device last seen
        if (global.connectedDevicesMap) {
            global.connectedDevicesMap.set(ip, {
                ip,
                name: deviceName,
                lastSeen: new Date().toISOString()
            });
        }

        next();
    });

    // Modified Auth Middleware to support Session Tokens AND API Keys
    const authMiddleware = (req, res, next) => {
        const authHeader = req.headers['authorization'];
        const xApiKey = req.headers['x-api-key'];

        // 1. Check Session Token (Bearer)
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            // Check if it's the static API Key (Legacy/Mobile simple auth)
            if (token === apiKey) {
                return next();
            }
            // Check Session Manager
            const user = sessionManager.validateSession(token);
            if (user) {
                req.user = user; // Attach user to request
                return next();
            }
        }

        // 2. Check X-API-KEY (Legacy/Mobile)
        if (xApiKey && xApiKey === apiKey) {
            return next();
        }

        return res.status(401).json({ error: 'Unauthorized' });
    };

    // --- NEW AUTH ENDPOINTS ---

    // POST /api/auth/login
    apiApp.post('/api/auth/login', async (req, res) => {
        const { userId, pin, deviceId } = req.body;

        if (!userId || !pin) return res.status(400).json({ error: 'Missing credentials' });

        try {
            const result = await UserManager.authenticate(userId, pin);

            if (!result.success) {
                return res.status(401).json({ error: result.error });
            }

            const token = sessionManager.createSession(result.user, deviceId || 'unknown-device');
            res.json({
                success: true,
                token,
                user: result.user
            });
        } catch (e) {
            console.error('Login Error:', e);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // POST /api/auth/logout
    apiApp.post('/api/auth/logout', (req, res) => {
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            sessionManager.invalidateSession(token);
        }
        res.json({ success: true });
    });

    // POST /api/auth/verify
    apiApp.post('/api/auth/verify', (req, res) => {
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const user = sessionManager.validateSession(token);
            if (user) {
                return res.json({ success: true, user });
            }
        }
        res.status(401).json({ success: false, error: 'Invalid or expired session' });
    });


    // Public Status Endpoint for Connectivity Check
    // IMPORTANT: Defined before other routes to ensure availability
    apiApp.get('/api/status', (req, res) => {
        console.log(`[API] Status check received from ${req.ip}`);
        res.json({ status: 'ok', message: 'Whiz POS Server Online' });
    });

    apiApp.get('/', (req, res) => {
        console.log(`[API] Root accessed from ${req.ip}`);
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Whiz POS Server</title>
                <style>
                    body { background: #0f172a; color: #fff; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                    .container { text-align: center; padding: 2rem; border: 1px solid rgba(255,255,255,0.1); border-radius: 1rem; background: rgba(255,255,255,0.05); }
                    h1 { color: #38bdf8; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Whiz POS Server</h1>
                    <p>Status: Online</p>
                    <p><small>Checking connections...</small></p>
                </div>
            </body>
            </html>
        `);
    });

    apiApp.get('/api/config', (req, res) => {
      // apiKey is now managed by initApiKey, but fallback if still null
      if (!apiKey) apiKey = crypto.randomBytes(32).toString('hex');

      const ipAddress = getLocalIpAddress();
      const address = server ? server.address() : null;
      const port = (address && typeof address === 'object' && address.port) ? address.port : 5173;
      res.json({ apiKey, apiUrl: `http://${ipAddress}:${port}` });
    });

    // GET /api/products - Legacy endpoint
    apiApp.get('/api/products', authMiddleware, async (req, res) => {
        const products = await readJsonFile('products.json');
        res.json(products);
    });

    // GET /api/users - For Mobile Login
    apiApp.get('/api/users', authMiddleware, async (req, res) => {
        const users = await readJsonFile('users.json');
        res.json(users);
    });

    // GET /api/sync - Full state for Mobile Pull
    apiApp.get('/api/sync', authMiddleware, async (req, res) => {
        try {
            const [products, users, expenses, salaries, creditCustomers, businessSetup, transactions] = await Promise.all([
                readJsonFile('products.json'),
                readJsonFile('users.json'),
                readJsonFile('expenses.json'),
                readJsonFile('salaries.json'),
                readJsonFile('credit-customers.json'),
                readJsonFile('business-setup.json').then(d => Array.isArray(d) ? d[0] : d), // Handle potential array wrapper
                readJsonFile('transactions.json')
            ]);

            // Filter transactions? Mobile might not need ALL history.
            // But for now, sending last 1000 might be safer to avoid huge payloads.
            // posStore handles partial updates.
            const limitedTransactions = Array.isArray(transactions) ? transactions.slice(0, 1000) : [];

            // Rewrite image URLs to be accessible via HTTP
            const ipAddress = getLocalIpAddress();
            const address = server ? server.address() : null;
            const port = (address && typeof address === 'object' && address.port) ? address.port : 5173;
            const baseUrl = `http://${ipAddress}:${port}`;

            const productsWithUrls = products.map(p => {
                if (p.localImage && !p.image.startsWith('http')) {
                    // Assuming localImage is absolute path, we need to extract filename
                    const filename = path.basename(p.localImage);
                    return { ...p, image: `${baseUrl}/assets/${filename}` };
                }
                return p;
            });

            res.json({
                products: productsWithUrls,
                users,
                expenses,
                salaries,
                creditCustomers,
                businessSetup,
                transactions: limitedTransactions
            });
        } catch (error) {
            console.error('Sync GET error:', error);
            res.status(500).json({ error: 'Sync failed' });
        }
    });

    // POST /api/sync - Handle Push Operations
    apiApp.post('/api/sync', authMiddleware, async (req, res) => {
        const operations = req.body;
        // Support wrapping operations in an object { operations: [] } or just array
        const ops = Array.isArray(operations) ? operations : operations.operations;

        if (!Array.isArray(ops)) {
            return res.status(400).json({ error: 'Invalid payload' });
        }

        try {
            // Process operations sequentially
            for (const op of ops) {
                const { type, data } = op;

                if (type === 'new-transaction' || type === 'transaction') { // Handle both type names
                    const transactions = await readJsonFile('transactions.json');
                    // Check for duplicate transaction ID
                    if (!transactions.some(t => t.id === data.id)) {
                        transactions.unshift(data);
                        await writeJsonFile('transactions.json', transactions);
                    }

                } else if (type === 'add-credit-customer') {
                    const customers = await readJsonFile('credit-customers.json');
                    customers.push(data);
                    await writeJsonFile('credit-customers.json', customers);

                } else if (type === 'update-credit-customer') {
                    const customers = await readJsonFile('credit-customers.json');
                    const idx = customers.findIndex(c => c.id === data.id);
                    if (idx !== -1) {
                        customers[idx] = { ...customers[idx], ...data.updates };
                        await writeJsonFile('credit-customers.json', customers);
                    }

                } else if (type === 'add-expense') {
                    const expenses = await readJsonFile('expenses.json');
                    // Ensure cashier field is set if present (Back-Office logic parity)
                    if (data.cashier && !data.recordedBy) {
                        data.recordedBy = data.cashier;
                    }
                    expenses.unshift(data);
                    await writeJsonFile('expenses.json', expenses);

                } else if (type === 'add-salary') {
                    const salaries = await readJsonFile('salaries.json');
                    salaries.unshift(data);
                    await writeJsonFile('salaries.json', salaries);

                } else if (type === 'delete-salary') {
                    const salaries = await readJsonFile('salaries.json');
                    const newSalaries = salaries.filter(s => s.id !== data.id);
                    await writeJsonFile('salaries.json', newSalaries);

                } else if (type === 'add-product') {
                    const products = await readJsonFile('products.json');
                    // Check for duplicate
                    const exists = products.find(p => p.productId === data.id || p.productId === data.productId);
                    if (!exists) {
                        const newProduct = { ...data, productId: data.id || data.productId };
                        delete newProduct.id;
                        products.push(newProduct);
                        await writeJsonFile('products.json', products);
                    }

                } else if (type === 'update-product') {
                    const products = await readJsonFile('products.json');
                    const prodId = data.id || data.productId;
                    const idx = products.findIndex(p => p.productId === prodId);
                    if (idx !== -1) {
                        const updates = data.updates || data; // Handle both wrapper and direct updates
                        delete updates.id;
                        products[idx] = { ...products[idx], ...updates };
                        await writeJsonFile('products.json', products);
                    }

                } else if (type === 'delete-product') {
                    const products = await readJsonFile('products.json');
                    const prodId = data.id || data.productId;
                    const newProducts = products.filter(p => p.productId !== prodId);
                    await writeJsonFile('products.json', newProducts);

                } else if (type === 'add-user') {
                    // Use Strict User Manager
                    try {
                        await UserManager.addUser(data);
                    } catch (e) {
                        console.error("Sync Add User Failed", e);
                    }

                } else if (type === 'update-user') {
                     // Use Strict User Manager
                    try {
                        const userId = data.id || data.userId;
                        const updates = data.updates || data;
                        delete updates.id;
                        await UserManager.updateUser(userId, updates);
                    } catch (e) {
                         console.error("Sync Update User Failed", e);
                    }

                } else if (type === 'delete-user') {
                     // Use Strict User Manager
                    try {
                        const userId = data.id || data.userId;
                        await UserManager.deleteUser(userId);
                    } catch (e) {
                         console.error("Sync Delete User Failed", e);
                    }

                } else if (type === 'delete-transaction') {
                    const transactions = await readJsonFile('transactions.json');
                    const newTransactions = transactions.filter(t => t.id !== data.id);
                    await writeJsonFile('transactions.json', newTransactions);
                }
            }

            // Notify Renderer to update state and push to Cloud
            const mainWindow = BrowserWindow.getAllWindows()[0];
            if (mainWindow) {
                mainWindow.webContents.send('mobile-data-sync', ops);
            }

            res.json({ success: true });
        } catch (error) {
            console.error('Sync POST error:', error);
            res.status(500).json({ error: 'Sync processing failed' });
        }
    });

    apiApp.post('/api/transactions', authMiddleware, async (req, res) => {
        const newTransaction = req.body;
        try {
            const transactions = await readJsonFile('transactions.json');
            if (!transactions.some(t => t.id === newTransaction.id)) {
                transactions.unshift(newTransaction);
                await writeJsonFile('transactions.json', transactions);
            }
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: 'Failed to save transaction' });
        }
    });

    apiApp.post('/api/print-receipt', authMiddleware, async (req, res) => {
        const { transaction, businessSetup } = req.body;

        try {
            // Instead of auto-printing, save to mobile-receipts.json
            const receipts = await readJsonFile('mobile-receipts.json');
            const newReceipt = {
                ...transaction,
                _printId: Date.now().toString(), // Unique ID for the print job
                _receivedAt: new Date().toISOString()
            };
            receipts.push(newReceipt);
            await writeJsonFile('mobile-receipts.json', receipts);

            const mainWindow = BrowserWindow.getAllWindows()[0];
            if (mainWindow) {
                // Notify Renderer of new receipt
                mainWindow.webContents.send('new-mobile-receipt', newReceipt);
            }
            res.json({ success: true });
        } catch (e) {
            console.error("Failed to queue mobile receipt", e);
            res.status(500).json({ error: 'Failed to queue receipt' });
        }
    });

    // --- KRA eTIMS Express API Endpoints (Local & Remote) ---
    apiApp.post('/api/kra/invoice', async (req, res) => {
        try {
            const transaction = req.body;
            if (!transaction) return res.status(400).json({ error: 'Missing transaction body' });
            const products = await readJsonFileFallback('products.json');
            const businessSetup = await readJsonFileFallback('business-setup.json');
            const result = await kraService.submitInvoice(transaction, products, businessSetup);
            res.json(result);
        } catch (err) {
            console.error('[KRA API] Invoice submission failed:', err);
            res.status(500).json({ error: err.message });
        }
    });

    apiApp.post('/api/kra/ping', async (req, res) => {
        try {
            const businessSetup = await readJsonFileFallback('business-setup.json');
            const result = await kraService.ping(businessSetup);
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    apiApp.post('/api/kra/init-device', async (req, res) => {
        try {
            const businessSetup = await readJsonFileFallback('business-setup.json');
            const result = await kraService.initDevice(businessSetup);
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    apiApp.get('/api/kra/stats', async (req, res) => {
        try {
            const stats = await kraService.getStats();
            res.json(stats);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    apiApp.post('/api/kra/sync-queue', async (req, res) => {
        try {
            const businessSetup = await readJsonFileFallback('business-setup.json');
            const result = await kraService.syncQueue(businessSetup);
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    server = apiApp.listen(5173, '0.0.0.0', () => {
        console.log('API server started on port 5173');
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error('CRITICAL: Port 5173 is already in use. The API server could not start. Please close other instances of Whiz POS.');
            // We can't exit the whole app as the user might want to use it offline, but we should alert
            // For now, logging to console which might be seen in DevTools
        } else {
            console.error('API Server error:', err);
        }
    });
}

app.whenReady().then(async () => {
  await ensureAppDirs();
  try {
      initDB(userDataPath);
      await migrateLegacyData(userDataPath);
  } catch (error) {
      console.error('Fatal: Failed to initialize SQLite database or run migrations:', error);
      dialog.showErrorBox('Database Error', 'Failed to initialize database or migrate legacy data. Check logs for more details. Application will now close to prevent data corruption.');
      app.quit();
      return;
  }
  await ensureDataFilesExist();
  await optimizeData(); // Data Optimization on Startup
  await initApiKey(); // Init and persist API Key
  startApiServer();

  // Register a custom protocol to serve images from the assets directory
  protocol.registerFileProtocol('local-asset', (request, callback) => {
    const url = request.url.substr(14); // Remove 'local-asset://'
    const filePath = path.join(productImagesPath, url);
    callback({ path: path.normalize(filePath) });
  });

  createWindow();

  // --- NEW IPC HANDLERS FOR AUTH & USERS ---

  ipcMain.handle('auth-login', async (event, userId, pin, deviceId) => {
      try {
          const result = await UserManager.authenticate(userId, pin);
          if (result.success) {
              const token = sessionManager.createSession(result.user, deviceId || 'desktop-main');
              return { success: true, token, user: result.user };
          }
          return { success: false, error: result.error };
      } catch (e) {
          return { success: false, error: e.message };
      }
  });

  ipcMain.handle('auth-logout', async (event, token) => {
      sessionManager.invalidateSession(token);
      return { success: true };
  });

  ipcMain.handle('auth-verify', async (event, token) => {
      const user = sessionManager.validateSession(token);
      return { success: !!user, user };
  });

  ipcMain.handle('user-add', async (event, userData) => {
      try {
          await UserManager.addUser(userData);
          return { success: true };
      } catch (e) {
          return { success: false, error: e.message };
      }
  });

  ipcMain.handle('user-update', async (event, userId, updates) => {
      try {
          await UserManager.updateUser(userId, updates);
          return { success: true };
      } catch (e) {
          return { success: false, error: e.message };
      }
  });

  ipcMain.handle('user-delete', async (event, userId) => {
      try {
          await UserManager.deleteUser(userId);
          return { success: true };
      } catch (e) {
          return { success: false, error: e.message };
      }
  });


  /**
   * IPC Handler: 'save-image'
   * Saves an image from a temporary path to the application's persistent storage.
   *
   * @param {Electron.IpcMainInvokeEvent} event
   * @param {string} tempPath - The path to the temporary image file.
   * @returns {Promise<{success: boolean, path?: string, fileName?: string, error?: string}>}
   */
  ipcMain.handle('save-image', async (event, tempPath) => {
    if (!tempPath || typeof tempPath !== 'string') {
      console.error('Invalid or missing tempPath for save-image');
      return { success: false, error: 'Invalid or missing file path' };
    }
    try {
      // Decode URL if it was passed as a file:// URL
      let sourcePath = tempPath;
      if (sourcePath.startsWith('file://')) {
          sourcePath = decodeURIComponent(sourcePath.replace('file://', ''));
          // On Windows, remove leading slash if present (e.g., /C:/...)
          if (process.platform === 'win32' && sourcePath.startsWith('/') && sourcePath.includes(':')) {
              sourcePath = sourcePath.substring(1);
          }
      }

      // If the path is just a filename (no directory separators), assume it's already in the product images folder
      // This happens if the user tries to "re-save" an image that is already local-asset://...
      if (!sourcePath.includes(path.sep) && !sourcePath.includes('/')) {
         const existingPath = path.join(productImagesPath, sourcePath);
         try {
             await fs.access(existingPath);
             return { success: true, path: existingPath, fileName: sourcePath };
         } catch (e) {
             // Not found, proceed to fail
         }
      }

      // Verify source file exists
      try {
          await fs.access(sourcePath);
      } catch (e) {
          console.error(`Source image not found at: ${sourcePath}`);
          return { success: false, error: `Source image not found: ${sourcePath}` };
      }

      const fileName = `${Date.now()}-${path.basename(sourcePath)}`;
      const permanentPath = path.join(productImagesPath, fileName);
      await fs.copyFile(sourcePath, permanentPath);
      return { success: true, path: permanentPath, fileName: fileName };
    } catch (error) {
      console.error('Failed to save image:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * IPC Handler: 'save-data'
   */
  ipcMain.handle('save-data', async (event, fileName, data) => {
    try {
      await writeJsonFileFallback(fileName, data);
      return { success: true };
    } catch (error) {
      console.error(`Failed to save data to ${fileName}:`, error);
      return { success: false, error: error.message };
    }
  });

  /**
   * IPC Handler: 'read-data'
   */
  ipcMain.handle('read-data', async (event, fileName) => {
    try {
        const data = await readJsonFileFallback(fileName);
        return { success: true, data: data || [] };
    } catch (error) {
        console.error(`Failed to read data from ${fileName}:`, error);
        return { success: false, error: error.message };
    }
  });

  ipcMain.handle('merge-data', async (event, fileName, data) => {
      try {
          await sqliteDb.mergeJsonFileFallback(fileName, data);
          return { success: true };
      } catch (error) {
          console.error(`Failed to merge data to ${fileName}:`, error);
          return { success: false, error: error.message };
      }
  });

  ipcMain.handle('apply-stock-movements', async (event, movements) => {
      try {
          const applied = sqliteDb.applyStockMovements(movements);
          return { success: true, applied };
      } catch (error) {
          console.error('Failed to apply stock movements:', error);
          return { success: false, error: error.message };
      }
  });

  ipcMain.handle('add-pending-sync', async (event, syncOperation) => {
      try {
          const id = sqliteDb.addPendingSync(syncOperation);
          return { success: true, id };
      } catch (error) {
          console.error('Failed to add pending sync:', error);
          return { success: false, error: error.message };
      }
  });

  ipcMain.handle('get-pending-syncs', async (event) => {
      try {
          const syncs = sqliteDb.getPendingSyncs();
          return { success: true, data: syncs };
      } catch (error) {
          console.error('Failed to get pending syncs:', error);
          return { success: false, error: error.message };
      }
  });

  ipcMain.handle('remove-pending-syncs', async (event, ids) => {
      try {
          sqliteDb.removePendingSyncs(ids);
          return { success: true };
      } catch (error) {
          console.error('Failed to remove pending syncs:', error);
          return { success: false, error: error.message };
      }
  });

  // --- Printer Management Handlers ---

  ipcMain.handle('get-printers', async () => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      return await mainWindow.webContents.getPrintersAsync();
    }
    return [];
  });

  ipcMain.handle('save-printer-settings', async (event, settings) => {
    store.set('printerSettings', settings);
    return { success: true };
  });

  ipcMain.handle('get-printer-settings', async () => {
    return store.get('printerSettings', { defaultPrinter: '' });
  });

  ipcMain.handle('toggle-fullscreen', () => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
        mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
  });

  ipcMain.handle('get-connected-devices', () => {
      // Return array of connected devices (active in last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      if (!global.connectedDevicesMap) return [];

      const devices = [];
      for (const [ip, device] of global.connectedDevicesMap.entries()) {
          if (new Date(device.lastSeen) > oneHourAgo) {
              devices.push(device);
          }
      }
      return devices;
  });

  // --- Logs ---
  ipcMain.handle('get-logs', async () => {
      try {
          const content = await fs.readFile(logFilePath, 'utf-8');
          // Filter last 48 hours
          const lines = content.split('\n');
          const now = new Date();
          const filteredLines = lines.filter(line => {
              const match = line.match(/^\[(.*?)\]/);
              if (match && match[1]) {
                  const logTime = new Date(match[1]);
                  const hoursDiff = (now - logTime) / (1000 * 60 * 60);
                  return hoursDiff <= 48;
              }
              return false; // Filter out malformed lines or empty lines
          });
          return filteredLines.join('\n');
      } catch (e) {
          return ''; // Return empty if file missing or error
      }
  });

  // --- Developer & Direct DB Sync ---

  // --- Reusable Encrypted POS Backup Generator ---
  async function executePosEncryptedBackup(targetPath = null) {
      // Strictly store in ProgramData/whiz-pos/Backups/POS
      const posBackupsDir = cryptoBackup.getProgramDataBackupsDir('POS');

      let businessName = 'WhizPOS';
      let businessSetup = {};
      try {
          const config = await readJsonFileFallback('business-setup.json');
          if (config) {
              businessSetup = config;
              if (config.businessName) {
                  businessName = config.businessName.replace(/[^a-z0-9]/gi, '_');
              }
          }
      } catch (e) {}

      let serverConfig = {};
      try {
          serverConfig = await readJsonFileFallback('server-config.json');
      } catch (e) {}

      // Collect all local JSON document files from userDataPath
      const docFiles = {};
      try {
          const uEntries = await fs.readdir(userDataPath, { withFileTypes: true });
          for (const ent of uEntries) {
              if (ent.isFile() && ent.name.endsWith('.json')) {
                  try {
                      const content = await fs.readFile(path.join(userDataPath, ent.name), 'utf-8');
                      docFiles[ent.name] = content;
                  } catch (e) {}
              }
          }
      } catch (e) {}

      // Ensure critical config files are present
      docFiles['server-config.json'] = JSON.stringify(serverConfig);
      docFiles['business-setup.json'] = JSON.stringify(businessSetup);

      // Collect asset files (logos, receipts, etc.)
      const docAssets = {};
      try {
          const assetsDir = path.join(userDataPath, 'assets');
          if (fsSync.existsSync(assetsDir)) {
              const aEntries = await fs.readdir(assetsDir, { withFileTypes: true });
              for (const aEnt of aEntries) {
                  if (aEnt.isFile()) {
                      const aBuf = await fs.readFile(path.join(assetsDir, aEnt.name));
                      if (aBuf.length <= 5 * 1024 * 1024) {
                          docAssets[aEnt.name] = aBuf.toString('base64');
                      }
                  }
              }
          }
      } catch (e) {}

      const timestamp = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').slice(0, 19);
      const tempDbPath = path.join(posBackupsDir, `temp_snap_${Date.now()}.db`);

      try {
          // 1. Checkpoint WAL and capture SQLite database cleanly (all tables, sales, products, documents)
          await backupDB(tempDbPath);
          const dbBuffer = await fs.readFile(tempDbPath);

          // 2. Package database, all documents, assets, and settings
          const payload = {
              dbBuffer,
              files: docFiles,
              assets: docAssets,
              metadata: {
                  source: 'POS_DESKTOP',
                  businessName,
                  createdAt: new Date().toISOString(),
                  totalDocuments: Object.keys(docFiles).length,
                  totalAssets: Object.keys(docAssets).length
              }
          };

          const encryptedBuffer = cryptoBackup.packBackup(payload);
          const defaultFileName = `${timestamp}_pos_${businessName}.whizbak`;
          const finalPath = targetPath || path.join(posBackupsDir, defaultFileName);

          await fs.writeFile(finalPath, encryptedBuffer);

          // Clean up temp snapshot
          await fs.unlink(tempDbPath).catch(() => {});

          // 3. 7-Day Auto-Deletion retention setting (default: true)
          const autoDelete = (businessSetup.autoDeleteOldBackups !== false) && (serverConfig.autoDeleteOldBackups !== false);
          const maxAgeDays = Number(businessSetup.backupRetentionDays) || Number(serverConfig.backupRetentionDays) || 7;
          await cryptoBackup.pruneBackups(posBackupsDir, { autoDelete, maxAgeDays });

          console.log(`[POS Backup] Encrypted backup created: ${finalPath} (${encryptedBuffer.length} bytes)`);
          return { success: true, filePath: finalPath, fileName: path.basename(finalPath), size: encryptedBuffer.length };
      } catch (err) {
          await fs.unlink(tempDbPath).catch(() => {});
          throw err;
      }
  }

  // --- Automated High-Frequency Encrypted Backup Daemon (Every 15 minutes) ---
  setTimeout(async () => {
      try {
          console.log('[Daemon] Initial POS startup encrypted backup running in ProgramData/whiz-pos/Backups/POS...');
          await executePosEncryptedBackup();
      } catch (e) {
          console.warn('[Daemon] Initial POS backup skipped:', e.message);
      }
  }, 10000); // 10 seconds after boot

  setInterval(async () => {
      try {
          await executePosEncryptedBackup();
      } catch (error) {
          console.error('[Daemon] Automated POS backup failed:', error.message);
      }
  }, 15 * 60 * 1000); // 15 minutes

  // --- Cloud Sync Daemon ---
  setInterval(async () => {
    try {
      // 1. Get Cloud Credentials
      const config = await readJsonFileFallback('server-config.json');
      if (!config || !config.cloudToken) return; // Cloud sync not configured

      // 2. Fetch local transactions
      const transactions = await readJsonFileFallback('transactions.json');
      if (!Array.isArray(transactions) || transactions.length === 0) return;

      // 3. Find unsynced ones (assuming we add a _synced flag locally, or just sync all that lack it)
      const unsynced = transactions.filter(t => !t._cloudSynced);
      if (unsynced.length === 0) return;

      console.log(`[Cloud Sync] Attempting to sync ${unsynced.length} sales to cloud...`);

      // 4. Transform for backend
      const receiptsPayload = unsynced.map(t => ({
        receiptNumber: t.id || t.transactionId,
        totalAmount: t.totalAmount || t.total,
        paymentMethod: t.paymentMethod,
        customerPhone: t.customerPhone,
        customerName: t.customerName,
        customerEmail: t.customerEmail,
        status: 'COMPLETED'
      }));

      // 5. Post to Monolithic Web Portal
      const cloudUrl = process.env.VITE_CLOUD_URL || 'https://whizpoint.app'; // Fallback
      
      const response = await fetch(`${cloudUrl}/api/sync/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.cloudToken}`
        },
        body: JSON.stringify({ receipts: receiptsPayload })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`[Cloud Sync] Successfully synced ${result.syncedCount} sales.`);

      // 6. Mark as synced locally
      const updatedTransactions = transactions.map(t => {
        if (!t._cloudSynced) {
          return { ...t, _cloudSynced: true };
        }
        return t;
      });

      await writeJsonFileFallback('transactions.json', updatedTransactions);

    } catch (e) {
      console.error('[Cloud Sync] Failed:', e.message);
    }
  }, 30 * 1000); // Every 30 seconds for immediate testing

  ipcMain.handle('backup-data', async () => {
    try {
        const posBackupsDir = cryptoBackup.getProgramDataBackupsDir('POS');
        let businessName = 'WhizPOS';
        try {
            const config = await readJsonFileFallback('business-setup.json');
            if (config && config.businessName) {
                businessName = config.businessName.replace(/[^a-z0-9]/gi, '_');
            }
        } catch (e) {}

        const timestamp = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').slice(0, 16);
        const defaultFileName = `${timestamp}_pos_${businessName}.whizbak`;
        const defaultPath = path.join(posBackupsDir, defaultFileName);

        const { canceled, filePath } = await dialog.showSaveDialog({
            title: 'Save Encrypted Whiz POS Backup',
            defaultPath,
            filters: [
                { name: 'Whiz POS Encrypted Backup (*.whizbak)', extensions: ['whizbak'] }
            ]
        });

        if (canceled || !filePath) return { success: false, error: 'Cancelled' };

        const result = await executePosEncryptedBackup(filePath);
        return { success: true, filePath: result.filePath, size: result.size };
    } catch (e) {
        console.error("Backup failed", e);
        return { success: false, error: e.message };
    }
  });

  ipcMain.handle('restore-data', async () => {
      try {
          const posBackupsDir = cryptoBackup.getProgramDataBackupsDir('POS');
          const { canceled, filePaths } = await dialog.showOpenDialog({
              title: 'Select Encrypted Whiz POS Backup (.whizbak)',
              defaultPath: posBackupsDir,
              properties: ['openFile'],
              filters: [
                  { name: 'Whiz POS Encrypted Backup (*.whizbak)', extensions: ['whizbak'] }
              ]
          });

          if (canceled || filePaths.length === 0) return { success: false, error: 'Cancelled' };

          const backupPath = filePaths[0];

          // STRICT RESTRICTION: Only .whizbak allowed
          if (!backupPath.toLowerCase().endsWith('.whizbak')) {
              throw new Error("Security Restriction: Only authentic .whizbak encrypted backup files are allowed.");
          }

          const fileBuffer = await fs.readFile(backupPath);

          // Verify encrypted WHIZBAK2 container
          if (fileBuffer.length < cryptoBackup.HEADER_LEN || !fileBuffer.subarray(0, 8).equals(cryptoBackup.MAGIC)) {
              throw new Error("Invalid or corrupted backup file: Missing WHIZBAK2 encryption header.");
          }

          console.log('[Restore] Unpacking authentic encrypted WHIZBAK2 container...');
          const unpacked = cryptoBackup.unpackBackup(fileBuffer);

          if (!unpacked.dbBuffer) {
              throw new Error('Encrypted backup contains no valid database snapshot');
          }

          // Safely close connection before replacing files
          closeDB();

          const dbPath = path.join(userDataPath, 'whizpos.db');
          const walPath = dbPath + '-wal';
          const shmPath = dbPath + '-shm';

          // Write database
          await fs.writeFile(dbPath, unpacked.dbBuffer);

          // Remove previous WAL & SHM to ensure clean boot from restored file
          try { await fs.unlink(walPath); } catch(e) {}
          try { await fs.unlink(shmPath); } catch(e) {}

          // Restore configuration & document files
          if (unpacked.files) {
              for (const [filename, content] of Object.entries(unpacked.files)) {
                  try {
                      await writeJsonFileFallback(filename, typeof content === 'string' ? JSON.parse(content) : content);
                  } catch (e) {
                      console.warn(`[Restore] Notice restoring ${filename}:`, e.message);
                  }
              }
          }

          // Restore assets (logos, signatures, etc.)
          if (unpacked.assets && typeof unpacked.assets === 'object') {
              try {
                  const assetsDir = path.join(userDataPath, 'assets');
                  await fs.mkdir(assetsDir, { recursive: true });
                  for (const [assetName, b64] of Object.entries(unpacked.assets)) {
                      const safeName = path.basename(assetName);
                      await fs.writeFile(path.join(assetsDir, safeName), Buffer.from(b64, 'base64'));
                  }
              } catch (e) {
                  console.warn('[Restore] Notice restoring assets:', e.message);
              }
          }

          // Re-initialize DB
          initDB(userDataPath);
          console.log('[Restore] Encrypted backup restored and verified successfully from:', backupPath);
          return { success: true, metadata: unpacked.metadata };
      } catch (e) {
          console.error("Restore failed", e);
          return { success: false, error: e.message };
      }
  });

  ipcMain.handle('get-backup-settings', async () => {
      const posBackupsDir = cryptoBackup.getProgramDataBackupsDir('POS');
      let autoDeleteOldBackups = true;
      let backupRetentionDays = 7;
      try {
          const cfg = await readJsonFileFallback('business-setup.json');
          if (cfg) {
              if (cfg.autoDeleteOldBackups !== undefined) autoDeleteOldBackups = Boolean(cfg.autoDeleteOldBackups);
              if (cfg.backupRetentionDays !== undefined) backupRetentionDays = Number(cfg.backupRetentionDays);
          }
      } catch (e) {}
      return { autoDeleteOldBackups, backupRetentionDays, backupDir: posBackupsDir };
  });

  ipcMain.handle('save-backup-settings', async (event, settings) => {
      try {
          let cfg = (await readJsonFileFallback('business-setup.json')) || {};
          if (settings.autoDeleteOldBackups !== undefined) cfg.autoDeleteOldBackups = Boolean(settings.autoDeleteOldBackups);
          if (settings.backupRetentionDays !== undefined) cfg.backupRetentionDays = Number(settings.backupRetentionDays);
          await writeJsonFileFallback('business-setup.json', cfg);
          return { success: true, settings: { autoDeleteOldBackups: cfg.autoDeleteOldBackups, backupRetentionDays: cfg.backupRetentionDays } };
      } catch (e) {
          return { success: false, error: e.message };
      }
  });

  ipcMain.handle('get-developer-config', async () => {
      try {
          const configPath = path.join(userDataPath, 'server-config.json');
          const data = await fs.readFile(configPath, 'utf-8');
          const config = JSON.parse(data);
          return {
              developerPin: config.developerPin || null,
              mongoUri: config.mongoUri || '',
              backOfficeUrl: config.backOfficeUrl || '',
              backOfficeApiKey: config.backOfficeApiKey || ''
          };
      } catch (e) {
          return { developerPin: null, mongoUri: '', backOfficeUrl: '', backOfficeApiKey: '' };
      }
  });

  ipcMain.handle('save-developer-config', async (event, newConfig) => {
      try {
          const configPath = path.join(userDataPath, 'server-config.json');
          let currentConfig = {};
          try {
              const data = await fs.readFile(configPath, 'utf-8');
              currentConfig = JSON.parse(data);
          } catch (e) {}

          const updatedConfig = { ...currentConfig, ...newConfig };
          await fs.writeFile(configPath, JSON.stringify(updatedConfig, null, 2));
          return { success: true };
      } catch (e) {
          console.error("Failed to save developer config", e);
          return { success: false, error: e.message };
      }
  });

  ipcMain.handle('direct-db-delete', async (event, mongoUri, ops) => {
      if (!mongoUri) return { success: false, error: 'MongoDB URI is missing' };
      if (!ops || !Array.isArray(ops) || ops.length === 0) return { success: true };

      let client;
      try {
          client = new MongoClient(mongoUri);
          await client.connect();
          const db = client.db();

          // Group by type/collection
          const collectionMap = {
              'delete-user': { collection: 'users', idField: 'userId' },
              'delete-product': { collection: 'products', idField: 'productId' },
              'delete-expense': { collection: 'expenses', idField: 'expenseId' },
              'delete-salary': { collection: 'salaries', idField: 'salaryId' },
              'delete-transaction': { collection: 'transactions', idField: 'transactionId' },
              'delete-credit-customer': { collection: 'customers', idField: 'customerId' },
              'delete-supplier': { collection: 'suppliers', idField: 'supplierId' }
          };

          for (const op of ops) {
              const config = collectionMap[op.type];
              if (config) {
                  const id = op.data.id || op.data.userId || op.data.productId || op.data.expenseId || op.data.salaryId || op.data.transactionId || op.data.customerId;
                  if (id) {
                      await db.collection(config.collection).deleteOne({ [config.idField]: id });
                  }
              }
          }

          return { success: true };
      } catch (e) {
          console.error("Direct DB Delete Failed", e);
          return { success: false, error: e.message };
      } finally {
          if (client) await client.close();
      }
  });

  // --- Printing Logic ---
  /**
   * Creates a hidden BrowserWindow to render HTML content and triggers the print dialog.
   *
   * @param {string} htmlContent - The HTML string to print.
   * @param {Object} options - Electron print options.
   */
  const printHtml = async (htmlContent, options = {}) => {
    const printWindow = new BrowserWindow({ show: false, webPreferences: { contextIsolation: false, nodeIntegration: true } });

    // Check for saved printer preferences
    const printerSettings = store.get('printerSettings', {});
    if (printerSettings.defaultPrinter) {
        options.deviceName = printerSettings.defaultPrinter;
        options.silent = true; // Skip dialog if a printer is explicitly set
    }

    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

    printWindow.webContents.on('did-finish-load', () => {
        // Force margins to 0 for better fit on thermal printers
        // Unless specific margins were passed in options, we override them to 0
        const printOptions = {
             margins: { marginType: 'custom', top: 0, bottom: 0, left: 0, right: 0 },
             ...options
        };

        printWindow.webContents.print(printOptions, (success, errorType) => {
            if (!success) console.error('Print failed:', errorType);
            else console.log('Print job sent successfully');
            printWindow.close();
        });
    });
  };

  /**
   * IPC Listener: 'print-receipt'
   * Generates and prints a transaction receipt.
   */
  ipcMain.on('print-receipt', async (event, transaction, businessSetup, isReprint = false) => {
      let finalTransaction = { ...transaction };

      // Core KRA eTIMS feature: intercept new sales if not already signed with real KRA receipt
      const alreadyHasRealKra = finalTransaction.kraDetails &&
                                finalTransaction.kraDetails.receiptNumber &&
                                !finalTransaction.kraDetails.receiptNumber.includes('OFFLINE') &&
                                !finalTransaction.kraDetails.receiptNumber.includes('SBX');

      if (!isReprint && !alreadyHasRealKra && !finalTransaction.kraInvoiceNo) {
          try {
              const products = await readJsonFileFallback('products.json');
              const kraResult = await kraService.submitInvoice(finalTransaction, products, businessSetup);
              
              if (kraResult && kraResult.kraInvoiceNo) {
                  finalTransaction.kraInvoiceNo = kraResult.kraInvoiceNo;
                  finalTransaction.kraQrCode = kraResult.qrCode;
                  finalTransaction.kraSignature = kraResult.signature;
                  finalTransaction.kraDetails = {
                      invoiceNumber: kraResult.scuInvcNo || finalTransaction.id,
                      receiptNumber: kraResult.kraInvoiceNo,
                      qrCode: kraResult.qrCode,
                      controlCode: kraResult.signature,
                      date: new Date().toLocaleString(),
                      offline: kraResult.offline || false,
                      offlineReason: kraResult.offlineReason || null
                  };

                  // We must update the transaction in the DB so it persists
                  const transactions = await readJsonFileFallback('transactions.json');
                  const idx = transactions.findIndex(t => (t.id || t.transactionId) === (finalTransaction.id || finalTransaction.transactionId));
                  if (idx !== -1) {
                      transactions[idx] = finalTransaction;
                      await writeJsonFileFallback('transactions.json', transactions);
                  }
              }
          } catch (e) {
              console.error('[KRA Middleware] Failed to attach KRA details:', e);
          }
      }

      const htmlContent = await generateReceipt(finalTransaction, businessSetup, isReprint, false);
      printHtml(htmlContent);

      // If duplicate receipt printing is enabled, print cashier copy after short delay
      const isDuplicateEnabled = Boolean(
          businessSetup?.printDuplicateReceipts ||
          businessSetup?.duplicateReceipt ||
          businessSetup?.printDuplicate
      );

      if (isDuplicateEnabled) {
          setTimeout(async () => {
              try {
                  const cashierHtml = await generateReceipt(finalTransaction, businessSetup, isReprint, true);
                  printHtml(cashierHtml);
              } catch (err) {
                  console.error('[Print] Failed to print duplicate cashier copy:', err);
              }
          }, 1100);
      }
  });

  // --- KRA eTIMS IPC Handlers ---
  ipcMain.handle('kra-ping', async (event, businessSetup) => {
      return await kraService.ping(businessSetup);
  });

  ipcMain.handle('kra-init-device', async (event, businessSetup) => {
      return await kraService.initDevice(businessSetup);
  });

  ipcMain.handle('kra-sync-queue', async (event, businessSetup) => {
      return await kraService.syncQueue(businessSetup);
  });

  ipcMain.handle('kra-submit-invoice', async (event, transaction, products, businessSetup) => {
      return await kraService.submitInvoice(transaction, products, businessSetup);
  });

  ipcMain.handle('kra-get-stats', async () => {
      return await kraService.getStats();
  });

  /**
   * IPC Listener: 'print-receipt-from-api'
   * Generates and prints a receipt requested via the local API (e.g., from Mobile App).
   */
  ipcMain.on('print-receipt-from-api', async (event, transaction, businessSetup) => {
      const htmlContent = await generateReceipt(transaction, businessSetup, true);
      printHtml(htmlContent);
  });

  /**
   * IPC Listener: 'print-business-setup'
   * Generates and prints the initial business setup invoice.
   */
  ipcMain.on('print-business-setup', async (event, businessSetup, adminUser) => {
      const htmlContent = await generateBusinessSetup(businessSetup, adminUser);
      printHtml(htmlContent, { copies: 2 });
  });

  /**
   * IPC Listener: 'print-closing-report'
   * Generates and prints the daily closing report.
   * Now supports 'detailed' flag.
   */
  ipcMain.on('print-closing-report', async (event, reportData, businessSetup, detailed = true) => {
      const htmlContent = await generateClosingReport(reportData, businessSetup, detailed);
      printHtml(htmlContent);
  });

  /**
   * IPC Listener: 'print-customer-bill'
   * Hospitality Bill Mode: Prints proforma bill for customer.
   */
  ipcMain.on('print-customer-bill', async (event, bill, businessSetup) => {
      try {
          const htmlContent = await generateCustomerBill(bill, businessSetup);
          printHtml(htmlContent);

          // Automatically print cashier copy slip for open bills / tabs
          setTimeout(async () => {
              try {
                  const cashierHtml = await generateCashierSlip(bill, businessSetup);
                  printHtml(cashierHtml);
              } catch (err) {
                  console.error('[Print] Failed to print duplicate cashier slip copy:', err);
              }
          }, 1100);
      } catch (err) {
          console.error('[Print] Failed to print customer bill:', err);
      }
  });

  /**
   * IPC Listener: 'print-cashier-slip'
   * Hospitality Bill Mode: Prints compact duplicate slip for cashier.
   */
  ipcMain.on('print-cashier-slip', async (event, bill, businessSetup) => {
      try {
          const htmlContent = await generateCashierSlip(bill, businessSetup);
          printHtml(htmlContent);
      } catch (err) {
          console.error('[Print] Failed to print cashier slip:', err);
      }
  });

  /**
   * IPC Listener: 'print-shift-audit-strip'
   * Hospitality / Daily Closing: Continuous itemized shift audit strip.
   */
  ipcMain.on('print-shift-audit-strip', async (event, reportData, sales, openBills, businessSetup) => {
      try {
          const htmlContent = await generateShiftAuditStrip(reportData, sales, openBills, businessSetup);
          printHtml(htmlContent);
      } catch (err) {
          console.error('[Print] Failed to print shift audit strip:', err);
      }
  });

  /**
   * IPC Listener: 'print-cashier-summary'
   * Prints the individual cashier end-of-day sales slip in thermal receipt format.
   */
  ipcMain.on('print-cashier-summary', async (event, cashierName, cashierStats, unpaidBills, businessSetup, selectedDate) => {
      try {
          const htmlContent = await generateCashierSummarySlip(cashierName, cashierStats, unpaidBills, businessSetup, selectedDate);
          printHtml(htmlContent);
      } catch (err) {
          console.error('[Print] Failed to print cashier summary slip:', err);
      }
  });

  ipcMain.handle('generate-pdf', async (event, { htmlContent, paperSize, defaultFileName, author, applicationName }) => {
      try {
          const pdfWindow = new BrowserWindow({ show: false, webPreferences: { contextIsolation: false, nodeIntegration: true, webSecurity: false } });
          
          const baseUrl = `file:///${path.join(__dirname, 'dist').replace(/\\/g, '/')}/`;
          await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`, {
              baseURLForDataURL: baseUrl
          });
          
          // Wait briefly for CSS and fonts to apply before printing
          await new Promise(resolve => setTimeout(resolve, 500));

          let pdfBuffer = await pdfWindow.webContents.printToPDF({
              pageSize: paperSize === 'a4' ? 'A4' : 'A5',
              printBackground: true,
              margins: { marginType: 'none' }
          });
          
          pdfWindow.close();
          
          // Modify Metadata using pdf-lib
          try {
              const { PDFDocument } = require('pdf-lib');
              const pdfDoc = await PDFDocument.load(pdfBuffer);
              pdfDoc.setTitle(applicationName || 'Whizpoint Solutions Document');
              pdfDoc.setAuthor(author || 'Whizpoint Solutions');
              pdfDoc.setSubject('Invoice / Document');
              pdfDoc.setKeywords(['Invoice', 'Receipt', 'Whizpoint', 'Document']);
              pdfDoc.setProducer(applicationName || 'Whizpoint Solutions');
              pdfDoc.setCreator(applicationName || 'Whizpoint Solutions');
              pdfDoc.setCreationDate(new Date());
              pdfDoc.setModificationDate(new Date());
              
              const modifiedPdfBytes = await pdfDoc.save();
              pdfBuffer = Buffer.from(modifiedPdfBytes);
          } catch (pdfLibError) {
              console.warn('pdf-lib is not installed or failed. Saving without custom metadata.', pdfLibError);
          }
          
          const { filePath } = await dialog.showSaveDialog({
              defaultPath: defaultFileName || 'document.pdf',
              filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
          });
          
          if (filePath) {
              await fs.writeFile(filePath, pdfBuffer);
              return { success: true, filePath };
          } else {
              return { success: false, canceled: true };
          }
      } catch (error) {
          console.error('Failed to generate PDF:', error);
          return { success: false, error: error.message };
      }
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // --- Auto Updater ---

  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...');
  });
  autoUpdater.on('update-available', (info) => {
     console.log('Update available.', info);
     const mainWindow = BrowserWindow.getAllWindows()[0];
     if (mainWindow) mainWindow.webContents.send('update-available', info);
  });
  autoUpdater.on('update-not-available', (info) => {
    console.log('Update not available.', info);
  });
  autoUpdater.on('error', (err) => {
    console.log('Error in auto-updater. ' + err);
  });
  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    console.log(log_message);
  });
  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded');
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) mainWindow.webContents.send('update-downloaded', info);
  });

  ipcMain.on('check-for-update', () => {
    autoUpdater.checkForUpdatesAndNotify();
  });

  // Check for updates immediately on startup
  autoUpdater.checkForUpdatesAndNotify();

  // Background check loop (every hour)
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 1000 * 60 * 60);

  ipcMain.on('download-update', () => {
    // electron-updater downloads automatically if autoDownload is true (default)
    // but if we set it to false, we can call downloadUpdate() here.
    // For now, checkForUpdatesAndNotify handles it.
  });
});

/**
 * IPC Handler: 'get-api-config'
 * Retrieves or generates the API Key and connection details for the local API server.
 * Returns a QR code data URL for easy mobile connection.
 *
 * @returns {Promise<{apiKey: string, apiUrl: string, qrCodeDataUrl: string}>}
 */
ipcMain.handle('get-api-config', async () => {
    if (!apiKey) {
        // Should have been init'd, but just in case
        await initApiKey();
    }
    const ipAddress = getLocalIpAddress();
    const address = server ? server.address() : null;
    const port = (address && typeof address === 'object' && address.port) ? address.port : 5173;
    const config = {
        apiKey,
        apiUrl: `http://${ipAddress}:${port}`
    };
    const qrCodeDataUrl = await qrcode.toDataURL(JSON.stringify(config));
    return { ...config, qrCodeDataUrl };
});

ipcMain.handle('complete-atomic-sale', async (event, saleData, paymentData) => {
    try {
        if (!sqliteDb.db) throw new Error("Database not initialized");
        
        // Use the native relational atomic sale method from sqlite-db.cjs
        const txId = sqliteDb.completeAtomicSale(saleData, saleData.items || []);
        
        // Also insert payment data if provided
        if (paymentData) {
            const stmtPayment = sqliteDb.db.prepare(`INSERT OR REPLACE INTO payments (id, saleId, paymentMethod, amount, reference, status, source, rawCallback, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            stmtPayment.run(
                paymentData.id || 'PAY_' + Date.now(),
                txId,
                paymentData.paymentMethod || 'cash',
                paymentData.amount || 0,
                paymentData.reference || null,
                paymentData.status || 'COMPLETED',
                paymentData.source || 'POS',
                paymentData.rawCallback ? JSON.stringify(paymentData.rawCallback) : null,
                paymentData.timestamp || new Date().toISOString()
            );
        }

        return { success: true, transactionId: txId };
    } catch (error) {
        console.error('Atomic sale failed:', error);
        return { success: false, error: error.message };
    }
});

// Background KRA eTIMS queue sync loop (every 3 minutes)
setInterval(async () => {
    try {
        const businessSetup = await readJsonFileFallback('business-setup.json');
        if (businessSetup && (businessSetup.kraPin || businessSetup.etimsPin)) {
            await kraService.syncQueue(businessSetup);
        }
    } catch (e) {
        console.warn('[Daemon] Periodic KRA queue sync check skipped:', e.message);
    }
}, 3 * 60 * 1000);

ipcMain.handle('reset-all-data', async () => {
    try {
        console.log('[System Reset] Performing full POS data wipe...');
        if (sqliteDb && typeof sqliteDb.closeDB === 'function') {
            try { sqliteDb.closeDB(); } catch (e) {}
        }
        const fsSync = require('fs');
        if (fsSync.existsSync(userDataPath)) {
            const files = fsSync.readdirSync(userDataPath);
            for (const f of files) {
                try {
                    const filePath = path.join(userDataPath, f);
                    if (fsSync.statSync(filePath).isFile()) {
                        fsSync.unlinkSync(filePath);
                    }
                } catch (e) {}
            }
        }
        if (store && typeof store.clear === 'function') {
            store.clear();
        }
        console.log('[System Reset] Data wipe successful.');
        return { success: true };
    } catch (err) {
        console.error('[System Reset] Error resetting data:', err);
        return { success: false, error: err.message };
    }
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    if(server) server.close();
    app.quit();
  }
});
