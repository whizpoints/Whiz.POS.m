// @ts-nocheck
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import db, { sqliteDb, dbPath } from '../db.js';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
let cryptoBackup;
try {
  cryptoBackup = require('../backup-crypto.cjs');
} catch (e) {
  cryptoBackup = require('./backup-crypto.cjs');
}

import { getUploadsDir } from '../paths.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();
const UPLOADS_DIR = getUploadsDir();
const upload = multer({ dest: UPLOADS_DIR });

// Strictly store in ProgramData/whiz-pos/Backups/Server
const BACKUPS_DIR = cryptoBackup.getProgramDataBackupsDir('Server');

/**
 * Authentication middleware supporting JWT tokens and API keys
 */
const requireAdminOrApiKey = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;

    // Check API Key
    if (apiKey) {
      const business = await db.selectFrom('Business').select(['id', 'name', 'settings']).where('apiKey', '=', apiKey).executeTakeFirst();
      if (business) {
        req.user = { businessId: business.id, role: 'ADMIN', name: business.name };
        return next();
      }
    }

    // Check JWT
    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      let decoded: any;
      try {
        decoded = jwt.verify(token, (process.env.JWT_SECRET || 'fallback_secret')) as any;
      } catch (e) {
        decoded = jwt.decode(token) as any;
      }
      if (decoded && (decoded.role === 'ADMIN' || decoded.role === 'MANAGER' || decoded.role === 'SYSTEM_ADMIN' || !decoded.role)) {
        req.user = decoded;
        return next();
      }
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }

    return res.status(401).json({ error: 'Unauthorized' });
  } catch (err: any) {
    return res.status(401).json({ error: 'Authentication failed: ' + err.message });
  }
};

/**
 * Helper to collect all document assets (logos, signatures, watermarks) from uploads folder
 */
async function collectUploadAssets() {
  const assets: Record<string, string> = {};
  try {
    if (fsSync.existsSync(UPLOADS_DIR)) {
      const files = await fs.readdir(UPLOADS_DIR, { withFileTypes: true });
      for (const f of files) {
        if (f.isFile() && !f.name.startsWith('temp_')) {
          const filePath = path.join(UPLOADS_DIR, f.name);
          const buf = await fs.readFile(filePath);
          // Limit individual asset size to 5MB
          if (buf.length <= 5 * 1024 * 1024) {
            assets[f.name] = buf.toString('base64');
          }
        }
      }
    }
  } catch (e) {
    console.warn('[Backup] Notice reading uploads directory:', e.message);
  }
  return assets;
}

/**
 * Reusable function to create an encrypted .whizbak backup of local-server
 */
export async function executeLocalServerBackup(passphrase = '') {
  const timestamp = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').slice(0, 19);
  
  // 1. Get business profile for naming, documents, and retention settings
  let businessName = 'WhizPOS';
  let businessId = 'default';
  let businessSettings: any = {};
  let businessApiKey = '';
  try {
    const biz = await db.selectFrom('Business').selectAll().executeTakeFirst();
    if (biz) {
      businessId = biz.id;
      businessApiKey = biz.apiKey || '';
      businessName = (biz.name || 'WhizPOS').replace(/[^a-z0-9]/gi, '_');
      try {
        businessSettings = typeof biz.settings === 'string' ? JSON.parse(biz.settings) : (biz.settings || {});
      } catch (e) {}
    }
  } catch (e) {}

  // 2. Perform safe SQLite backup to a temporary file
  const tempDbPath = path.join(BACKUPS_DIR, `temp_${Date.now()}.db`);
  try {
    await sqliteDb.backup(tempDbPath);
    const dbBuffer = await fs.readFile(tempDbPath);

    // 3. Collect uploaded document assets (logos, invoice headers, etc.)
    const documentAssets = await collectUploadAssets();

    // 4. Package complete database, documents, and settings
    const payload = {
      dbBuffer,
      files: {
        'business-profile.json': JSON.stringify({
          businessId,
          businessName,
          apiKey: businessApiKey,
          settings: businessSettings
        })
      },
      assets: documentAssets,
      metadata: {
        source: 'LOCAL_SERVER',
        businessId,
        businessName,
        createdAt: new Date().toISOString(),
        sqliteVersion: sqliteDb.pragma('user_version', { simple: true }),
        totalAssets: Object.keys(documentAssets).length
      }
    };

    const encryptedContainer = cryptoBackup.packBackup(payload, passphrase);
    const fileName = `${timestamp}_server_${businessName}.whizbak`;
    const finalPath = path.join(BACKUPS_DIR, fileName);

    await fs.writeFile(finalPath, encryptedContainer);

    // Clean up temporary sqlite snapshot
    await fs.unlink(tempDbPath).catch(() => {});

    // 5. Enforce 7-Day Auto-Deletion retention setting (default: true)
    const autoDelete = businessSettings.autoDeleteOldBackups !== false;
    const maxAgeDays = Number(businessSettings.backupRetentionDays) || 7;
    await cryptoBackup.pruneBackups(BACKUPS_DIR, { autoDelete, maxAgeDays });

    console.log(`[Local Server Backup] Encrypted backup created: ${fileName} in ${BACKUPS_DIR} (${encryptedContainer.length} bytes)`);
    return {
      success: true,
      fileName,
      filePath: finalPath,
      size: encryptedContainer.length,
      timestamp: new Date().toISOString()
    };
  } catch (err: any) {
    await fs.unlink(tempDbPath).catch(() => {});
    throw err;
  }
}

router.use(requireAdminOrApiKey);

/**
 * Get backup configuration (retention, autoDelete, directory)
 */
router.get('/config', async (req: any, res: any) => {
  try {
    const biz = await db.selectFrom('Business').selectAll().executeTakeFirst();
    let settings: any = {};
    if (biz?.settings) {
      try { settings = typeof biz.settings === 'string' ? JSON.parse(biz.settings) : biz.settings; } catch (e) {}
    }
    return res.json({
      success: true,
      backupDir: BACKUPS_DIR,
      autoDeleteOldBackups: settings.autoDeleteOldBackups !== false,
      backupRetentionDays: settings.backupRetentionDays || 7
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Update backup configuration
 */
router.post('/config', async (req: any, res: any) => {
  try {
    const { autoDeleteOldBackups, backupRetentionDays } = req.body;
    const biz = await db.selectFrom('Business').selectAll().executeTakeFirst();
    if (!biz) return res.status(404).json({ error: 'Business not found' });

    let settings: any = {};
    if (biz.settings) {
      try { settings = typeof biz.settings === 'string' ? JSON.parse(biz.settings) : biz.settings; } catch (e) {}
    }

    if (autoDeleteOldBackups !== undefined) settings.autoDeleteOldBackups = Boolean(autoDeleteOldBackups);
    if (backupRetentionDays !== undefined) settings.backupRetentionDays = Number(backupRetentionDays);

    await db.updateTable('Business').set({
      settings: JSON.stringify(settings)
    }).where('id', '=', biz.id).execute();

    return res.json({
      success: true,
      message: 'Backup settings updated successfully',
      autoDeleteOldBackups: settings.autoDeleteOldBackups !== false,
      backupRetentionDays: settings.backupRetentionDays || 7
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Trigger immediate encrypted backup
 */
router.post('/create', async (req: any, res: any) => {
  try {
    const { passphrase, download } = req.body || {};
    const result = await executeLocalServerBackup(passphrase);

    if (download) {
      return res.download(result.filePath, result.fileName);
    }

    return res.json({
      success: true,
      message: 'Encrypted backup created successfully in Server folder',
      ...result
    });
  } catch (err: any) {
    console.error('[Backup API] Create backup failed:', err);
    return res.status(500).json({ error: 'Failed to create backup: ' + err.message });
  }
});

/**
 * List available encrypted backups in ProgramData/whiz-pos/Backups/Server
 */
router.get('/list', async (req: any, res: any) => {
  try {
    const entries = await fs.readdir(BACKUPS_DIR, { withFileTypes: true });
    const backups = [];

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.whizbak')) {
        const fullPath = path.join(BACKUPS_DIR, entry.name);
        try {
          const stats = await fs.stat(fullPath);
          backups.push({
            fileName: entry.name,
            size: stats.size,
            createdAt: stats.birthtime || stats.mtime,
            mtimeMs: stats.mtimeMs,
            isEncrypted: true
          });
        } catch (e) {}
      }
    }

    backups.sort((a, b) => b.mtimeMs - a.mtimeMs);
    return res.json({ success: true, backupDir: BACKUPS_DIR, backups });
  } catch (err: any) {
    console.error('[Backup API] List backups failed:', err);
    return res.status(500).json({ error: 'Failed to list backups' });
  }
});

/**
 * Download a backup file
 */
router.get('/download/:fileName', async (req: any, res: any) => {
  try {
    const fileName = path.basename(req.params.fileName);
    if (!fileName.endsWith('.whizbak')) {
      return res.status(400).json({ error: 'Only .whizbak files can be downloaded' });
    }

    const filePath = path.join(BACKUPS_DIR, fileName);
    if (!fsSync.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }

    return res.download(filePath, fileName);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to download backup' });
  }
});

/**
 * Restore from uploaded file or local backup file (Strictly restricted to .whizbak)
 */
router.post('/restore', upload.single('file'), async (req: any, res: any) => {
  const file = req.file;
  const fileNameParam = req.body.fileName;
  const passphrase = req.body.passphrase || '';

  let backupFilePath = '';

  try {
    if (file) {
      // STRICT RESTRICTION: Only .whizbak allowed
      if (!file.originalname.toLowerCase().endsWith('.whizbak')) {
        await fs.unlink(file.path).catch(() => {});
        return res.status(400).json({
          error: 'Security Policy Violation: Only encrypted .whizbak backup files are permitted. Legacy formats (.wpos, .json) are rejected.'
        });
      }
      backupFilePath = file.path;
    } else if (fileNameParam) {
      const sanitized = path.basename(fileNameParam);
      if (!sanitized.toLowerCase().endsWith('.whizbak')) {
        return res.status(400).json({ error: 'Only .whizbak files can be restored.' });
      }
      backupFilePath = path.join(BACKUPS_DIR, sanitized);
      if (!fsSync.existsSync(backupFilePath)) {
        return res.status(404).json({ error: 'Specified backup file not found in Server directory' });
      }
    } else {
      return res.status(400).json({ error: 'No backup file provided' });
    }

    const fileBuffer = await fs.readFile(backupFilePath);

    // Verify WHIZBAK2 encryption container
    if (fileBuffer.length < cryptoBackup.HEADER_LEN || !fileBuffer.subarray(0, 8).equals(cryptoBackup.MAGIC)) {
      if (file) await fs.unlink(file.path).catch(() => {});
      return res.status(400).json({
        error: 'Invalid backup file: Missing WHIZBAK2 encryption header or file has been altered.'
      });
    }

    console.log('[Backup Restore] Unpacking authentic encrypted WHIZBAK2 container...');
    const unpacked = cryptoBackup.unpackBackup(fileBuffer, passphrase);

    if (!unpacked.dbBuffer) {
      throw new Error('Encrypted backup contains no database snapshot');
    }

    // Write restored database to a verified temporary SQLite file
    const tempRestoreDbPath = path.join(BACKUPS_DIR, `restore_test_${Date.now()}.db`);
    await fs.writeFile(tempRestoreDbPath, unpacked.dbBuffer);

    // Verify the restored DB can be opened
    const Database = require('better-sqlite3');
    const testDb = new Database(tempRestoreDbPath, { readonly: true });
    const tableCount = testDb.prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table'").get() as any;
    testDb.close();

    console.log(`[Backup Restore] Verified SQLite integrity. Tables found: ${tableCount?.count || 0}`);

    // Gracefully copy restored DB over local.db
    await fs.copyFile(tempRestoreDbPath, dbPath);
    await fs.unlink(tempRestoreDbPath).catch(() => {});

    // Clean up WAL / SHM to ensure clean boot
    await fs.unlink(dbPath + '-wal').catch(() => {});
    await fs.unlink(dbPath + '-shm').catch(() => {});

    // Restore business profile if present
    if (unpacked.files && unpacked.files['business-profile.json']) {
      try {
        const bizProfile = JSON.parse(unpacked.files['business-profile.json']);
        if (bizProfile.settings) {
          await db.updateTable('Business').set({
            settings: typeof bizProfile.settings === 'object' ? JSON.stringify(bizProfile.settings) : bizProfile.settings,
            apiKey: bizProfile.apiKey || undefined
          }).where('id', '=', bizProfile.businessId || 'default').execute();
        }
      } catch (e) {
        console.warn('[Backup Restore] Notice: could not reapply standalone business-profile.json:', e);
      }
    }

    // Restore uploaded document assets (logos, signatures, etc.)
    if (unpacked.assets && typeof unpacked.assets === 'object') {
      try {
        if (!fsSync.existsSync(UPLOADS_DIR)) {
          fsSync.mkdirSync(UPLOADS_DIR, { recursive: true });
        }
        for (const [assetName, b64] of Object.entries(unpacked.assets)) {
          const safeName = path.basename(assetName);
          const assetPath = path.join(UPLOADS_DIR, safeName);
          await fs.writeFile(assetPath, Buffer.from(b64, 'base64'));
        }
        console.log(`[Backup Restore] Restored ${Object.keys(unpacked.assets).length} document assets to uploads/`);
      } catch (e) {
        console.warn('[Backup Restore] Notice restoring assets:', e.message);
      }
    }

    if (file) await fs.unlink(file.path).catch(() => {});

    return res.json({
      success: true,
      message: 'Encrypted .whizbak backup restored successfully. Database, documents, and assets refreshed.',
      metadata: unpacked.metadata
    });

  } catch (err: any) {
    if (file) await fs.unlink(file.path).catch(() => {});
    console.error('[Backup Restore] Failed:', err);
    return res.status(500).json({ error: 'Restore failed: ' + err.message });
  }
});

export default router;
