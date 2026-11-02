import path from 'path';
import fs from 'fs';
import os from 'os';

/**
 * Returns the writable root directory for persistent data, uploads, and databases.
 * In production/Electron: uses C:\ProgramData\whizpos-server (or ~/.whizpos-server).
 * In development: uses process.env.WHIZPOS_DATA_DIR or fallback to ProgramData / ~/.whizpos-server.
 */
export function getDataDir(): string {
  if (process.env.WHIZPOS_DATA_DIR) {
    if (!fs.existsSync(process.env.WHIZPOS_DATA_DIR)) {
      try {
        fs.mkdirSync(process.env.WHIZPOS_DATA_DIR, { recursive: true });
      } catch {}
    }
    return process.env.WHIZPOS_DATA_DIR;
  }

  if (process.platform === 'win32') {
    const programData = process.env.PROGRAMDATA || 'C:\\ProgramData';
    const targetDir = path.join(programData, 'whizpos-server');
    if (!fs.existsSync(targetDir)) {
      try {
        fs.mkdirSync(targetDir, { recursive: true });
        return targetDir;
      } catch {
        const homeDir = path.join(os.homedir(), '.whizpos-server');
        if (!fs.existsSync(homeDir)) {
          try { fs.mkdirSync(homeDir, { recursive: true }); } catch {}
        }
        return homeDir;
      }
    }
    return targetDir;
  }

  const defaultDir = path.join(os.homedir(), '.whizpos-server');
  if (!fs.existsSync(defaultDir)) {
    try { fs.mkdirSync(defaultDir, { recursive: true }); } catch {}
  }
  return defaultDir;
}

/**
 * Returns the writable directory for uploaded files (logos, receipts, attachments).
 * Guaranteed to be on a real writable filesystem (never inside app.asar).
 */
export function getUploadsDir(): string {
  if (process.env.UPLOADS_DIR) {
    if (!fs.existsSync(process.env.UPLOADS_DIR)) {
      try { fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true }); } catch {}
    }
    return process.env.UPLOADS_DIR;
  }

  const dataDir = getDataDir();
  const uploads = path.join(dataDir, 'uploads');
  if (!fs.existsSync(uploads)) {
    try {
      fs.mkdirSync(uploads, { recursive: true });
    } catch (err) {
      console.error('[Paths] Failed to create uploads directory:', err);
    }
  }
  return uploads;
}

/**
 * Returns the path to server-config.json
 */
export function getServerConfigPath(): string {
  const dataDir = getDataDir();
  return path.join(dataDir, 'server-config.json');
}
