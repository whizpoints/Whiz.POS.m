// Suppress annoying Content Security Policy warnings in development console
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

import { app, BrowserWindow, ipcMain, utilityProcess } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import Bonjour from 'bonjour-service';
import os from 'os';
import { dialog } from 'electron';
import * as fs from 'fs';

process.on('uncaughtException', (error) => {
  const logPath = path.join(app.getPath('userData'), 'crash.log');
  fs.writeFileSync(logPath, error?.stack || error?.message || String(error));
  dialog.showErrorBox('Uncaught Exception', error?.stack || error?.message || String(error));
});

process.on('unhandledRejection', (reason: any) => {
  const logPath = path.join(app.getPath('userData'), 'crash.log');
  fs.writeFileSync(logPath, reason?.stack || reason?.message || String(reason));
  dialog.showErrorBox('Unhandled Rejection', reason?.stack || reason?.message || String(reason));
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let serverProcess: any = null;
const bonjour = new Bonjour();
const PORT = 5050;

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

function startBackendServer() {
  const isDev = !app.isPackaged;
  
  if (isDev) {
    // In dev, we can run the server via tsx
    serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      shell: true,
      windowsHide: true,
      env: { ...process.env, PORT: '5050', DATABASE_URL: 'file:./local.db' }
    });
  } else {
    // In prod, setup database in AppData
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'local.db');
    
    if (!fs.existsSync(dbPath)) {
      try {
        const templatePath = path.join(process.resourcesPath, 'template.db');
        fs.copyFileSync(templatePath, dbPath);
        console.log('Copied template.db to AppData:', dbPath);
      } catch (err) {
        console.error('Failed to copy template.db to userData:', err);
      }
    }

    process.env.PORT = '5050';
    process.env.DATABASE_URL = `file:${dbPath.replace(/\\/g, '/')}`;

    import('../dist-server/index.js').catch(err => {
      dialog.showErrorBox('Backend Crash', err?.stack || String(err));
    });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    // In dev, Vite runs on 5175 (to avoid collision with POS app on 5173/5174)
    mainWindow.loadURL('http://localhost:5175');
    mainWindow.webContents.openDevTools();
  } else {
    // In prod, serve the static files via the express server
    const tryLoad = (retries = 30) => {
      mainWindow?.loadURL(`http://localhost:${PORT}`).catch(() => {
        if (retries > 0) setTimeout(() => tryLoad(retries - 1), 500);
      });
    };
    tryLoad();
    mainWindow.webContents.openDevTools();
  }

  // Always launch on whole screen not restore
  mainWindow.maximize();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Start the Express backend
  startBackendServer();

  // Publish the mDNS service for POS Terminals to auto-discover
  try {
    const ipAddress = getLocalIpAddress();
    bonjour.publish({
      name: 'WhizPOS Local Server',
      type: 'http',
      port: PORT,
      host: ipAddress,
      txt: { version: '1.0.0', type: 'whizpos-admin' }
    });
    console.log(`[mDNS] Published service WhizPOS Local Server on ${ipAddress}:${PORT}`);
  } catch (err) {
    console.error('Failed to publish mDNS service:', err);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  bonjour.unpublishAll();
  bonjour.destroy();
});
