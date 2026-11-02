// @ts-nocheck
import { Router } from 'express';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import prisma from '../db.js';
import jwt from 'jsonwebtoken';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const cryptoBackup = require('../backup-crypto.cjs');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const BACKUPS_DIR = process.env.WEBPORTAL_BACKUP_DIR || path.join(__dirname, '../backups');
if (!fsSync.existsSync(BACKUPS_DIR)) {
  fsSync.mkdirSync(BACKUPS_DIR, { recursive: true });
}

const authenticateAdmin = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    if (!decoded.isSuperAdmin && decoded.role !== 'ADMIN' && decoded.role !== 'MANAGER') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    req.user = decoded;
    next();
  } catch (err: any) {
    return res.status(401).json({ error: 'Invalid token: ' + err.message });
  }
};

router.use(authenticateAdmin);

/**
 * Create an encrypted backup on the web portal
 */
router.post('/create', async (req: any, res: any) => {
  try {
    const businessId = req.user.businessId;
    const isSuperAdmin = req.user.isSuperAdmin;
    const { passphrase, download } = req.body || {};

    const timestamp = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').slice(0, 19);

    // Fetch data for the business (or all businesses if super admin)
    const businessWhere = (!isSuperAdmin && businessId) ? { id: businessId } : {};
    const businesses = await prisma.business.findMany({
      where: businessWhere,
      include: {
        users: { select: { id: true, name: true, email: true, role: true, pin: true } },
        outlets: true,
        products: {
          include: {
            inventory: true
          }
        },
        categories: true,
        customers: true,
        receipts: {
          take: 5000,
          orderBy: { createdAt: 'desc' },
          include: { items: true }
        }
      }
    });

    const businessName = businesses[0]?.name?.replace(/[^a-z0-9]/gi, '_') || 'WhizCloud';

    const payload = {
      metadata: {
        source: 'WEB_PORTAL',
        scope: isSuperAdmin ? 'ALL_TENANTS' : 'SINGLE_TENANT',
        businessCount: businesses.length,
        createdAt: new Date().toISOString()
      },
      files: {
        'portal-dataset.json': JSON.stringify(businesses)
      }
    };

    const encryptedBuffer = cryptoBackup.packBackup(payload, passphrase);
    const fileName = `${timestamp}_cloudbackup_${businessName}.whizbak`;
    const filePath = path.join(BACKUPS_DIR, fileName);

    await fs.writeFile(filePath, encryptedBuffer);
    await cryptoBackup.pruneBackups(BACKUPS_DIR, 48);

    if (download) {
      return res.download(filePath, fileName);
    }

    return res.json({
      success: true,
      message: 'Encrypted cloud backup created successfully',
      fileName,
      size: encryptedBuffer.length,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[Webportal Backup] Create error:', err);
    return res.status(500).json({ error: 'Failed to create encrypted backup: ' + err.message });
  }
});

/**
 * List backups
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
            mtimeMs: stats.mtimeMs
          });
        } catch (e) {}
      }
    }

    backups.sort((a, b) => b.mtimeMs - a.mtimeMs);
    return res.json({ success: true, backups });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to list backups' });
  }
});

/**
 * Download backup
 */
router.get('/download/:fileName', async (req: any, res: any) => {
  try {
    const sanitized = path.basename(req.params.fileName);
    const filePath = path.join(BACKUPS_DIR, sanitized);

    if (!fsSync.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    return res.download(filePath, sanitized);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to download backup' });
  }
});

export default router;
