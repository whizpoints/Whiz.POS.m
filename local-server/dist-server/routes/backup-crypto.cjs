const crypto = require('crypto');
const zlib = require('zlib');
const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const os = require('os');

const MAGIC = Buffer.from('WHIZBAK2'); // 8 bytes magic header
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;
const HEADER_LEN = MAGIC.length + SALT_LEN + IV_LEN + TAG_LEN; // 8 + 16 + 12 + 16 = 52 bytes
const PBKDF2_ITERATIONS = 100000;
const KEY_LEN = 32; // 256 bits for AES-256-GCM

const DEFAULT_SECRET = process.env.WHIZPOS_BACKUP_SECRET || 'WhizPOS-Secure-Vault-2026-Encrypted-Backup-Master#987!';

/**
 * Returns the secure ProgramData backups directory
 * Windows: C:\ProgramData\whiz-pos\Backups\[POS|Server]
 * Other: ~/.whiz-pos/Backups/[POS|Server]
 */
function getProgramDataBackupsDir(subfolder = '') {
  let base;
  if (process.platform === 'win32') {
    const pdata = process.env.PROGRAMDATA || 'C:\\ProgramData';
    base = path.join(pdata, 'whiz-pos', 'Backups');
  } else {
    base = path.join(os.homedir(), '.whiz-pos', 'Backups');
  }
  const target = subfolder ? path.join(base, subfolder) : base;
  if (!fsSync.existsSync(target)) {
    fsSync.mkdirSync(target, { recursive: true });
  }
  return target;
}

/**
 * Derives a 256-bit AES key from a passphrase and salt using PBKDF2-SHA256
 */
function deriveKey(passphrase, salt) {
  const secret = (passphrase && passphrase.trim().length > 0) ? passphrase : DEFAULT_SECRET;
  return crypto.pbkdf2Sync(secret, salt, PBKDF2_ITERATIONS, KEY_LEN, 'sha256');
}

/**
 * Compresses and encrypts a buffer using AES-256-GCM
 * Returns a binary Buffer starting with WHIZBAK2 magic header.
 */
function encryptData(plainBuffer, passphrase = '') {
  if (!Buffer.isBuffer(plainBuffer)) {
    plainBuffer = Buffer.from(plainBuffer);
  }

  // 1. Compress first to maximize entropy and reduce size
  const compressed = zlib.gzipSync(plainBuffer, { level: 9 });

  // 2. Generate cryptographically strong random salt and IV
  const salt = crypto.randomBytes(SALT_LEN);
  const iv = crypto.randomBytes(IV_LEN);

  // 3. Derive key
  const key = deriveKey(passphrase, salt);

  // 4. Encrypt with AES-256-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(compressed), cipher.final()]);
  const tag = cipher.getAuthTag();

  // 5. Build final container: [MAGIC (8) | SALT (16) | IV (12) | TAG (16) | CIPHERTEXT]
  return Buffer.concat([MAGIC, salt, iv, tag, ciphertext]);
}

/**
 * Decrypts and decompresses a WHIZBAK2 binary container.
 * Strictly verifies the WHIZBAK2 magic header and GCM authentication tag.
 * Throws an error if magic fails or if data has been tampered with.
 */
function decryptData(encryptedBuffer, passphrase = '') {
  if (!Buffer.isBuffer(encryptedBuffer)) {
    encryptedBuffer = Buffer.from(encryptedBuffer);
  }

  if (encryptedBuffer.length < HEADER_LEN) {
    throw new Error('Invalid backup file: file is too small or corrupted.');
  }

  // 1. Verify Magic
  const magic = encryptedBuffer.subarray(0, MAGIC.length);
  if (!magic.equals(MAGIC)) {
    throw new Error('Invalid backup format: Not a valid .whizbak file or missing WHIZBAK2 magic header.');
  }

  // 2. Extract components
  let offset = MAGIC.length;
  const salt = encryptedBuffer.subarray(offset, offset + SALT_LEN);
  offset += SALT_LEN;
  const iv = encryptedBuffer.subarray(offset, offset + IV_LEN);
  offset += IV_LEN;
  const tag = encryptedBuffer.subarray(offset, offset + TAG_LEN);
  offset += TAG_LEN;
  const ciphertext = encryptedBuffer.subarray(offset);

  // 3. Derive key
  const key = deriveKey(passphrase, salt);

  // 4. Decrypt and verify tag (AES-256-GCM will throw if tag doesn't match!)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  let decompressed;
  try {
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    decompressed = zlib.gunzipSync(decrypted);
  } catch (err) {
    throw new Error('Backup integrity verification failed: file is corrupted, tampered with, or invalid decryption key.');
  }

  return decompressed;
}

/**
 * Packages SQLite DB binary + document files + configuration files + metadata into an encrypted .whizbak buffer
 */
function packBackup({ dbBuffer = null, files = {}, assets = {}, metadata = {} }, passphrase = '') {
  const container = {
    magic: 'WHIZPOS_ENCRYPTED_BACKUP',
    version: 2,
    createdAt: new Date().toISOString(),
    metadata: {
      timestamp: Date.now(),
      ...metadata
    },
    files: files || {},
    assets: assets || {},
    dbBase64: dbBuffer ? dbBuffer.toString('base64') : null
  };

  const jsonString = JSON.stringify(container);
  return encryptData(Buffer.from(jsonString, 'utf-8'), passphrase);
}

/**
 * Decrypts and unpacks a .whizbak container. Strictly restricts to valid .whizbak payloads.
 */
function unpackBackup(encryptedBuffer, passphrase = '') {
  const decryptedBuffer = decryptData(encryptedBuffer, passphrase);
  const container = JSON.parse(decryptedBuffer.toString('utf-8'));

  if (!container || container.magic !== 'WHIZPOS_ENCRYPTED_BACKUP') {
    throw new Error('Unrecognized backup payload format. Only authentic .whizbak files are allowed.');
  }

  return {
    metadata: container.metadata || {},
    createdAt: container.createdAt,
    version: container.version,
    files: container.files || {},
    assets: container.assets || {},
    dbBuffer: container.dbBase64 ? Buffer.from(container.dbBase64, 'base64') : null
  };
}

/**
 * Prunes backups based on age (default: 7 days) and user setting (autoDeleteOldBackups).
 * If autoDelete is false, no backups are deleted.
 */
async function pruneBackups(dirPath, options = {}) {
  const opts = (typeof options === 'number') 
    ? { maxToKeep: options, autoDelete: true, maxAgeDays: 7 } 
    : { autoDelete: true, maxAgeDays: 7, ...options };

  const { autoDelete, maxAgeDays = 7, maxToKeep = null } = opts;

  if (autoDelete === false) {
    console.log(`[Backup Retention] Auto-delete disabled in settings; preserving all backups in: ${dirPath}`);
    return;
  }

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const backupFiles = [];
    const now = Date.now();
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.whizbak')) {
        const fullPath = path.join(dirPath, entry.name);
        try {
          const stats = await fs.stat(fullPath);
          backupFiles.push({ path: fullPath, name: entry.name, mtime: stats.mtimeMs, size: stats.size });
        } catch (e) {}
      }
    }

    // 1. Delete backups older than maxAgeDays (default: 7 days)
    for (const file of backupFiles) {
      const ageMs = now - file.mtime;
      if (ageMs > maxAgeMs) {
        try {
          await fs.unlink(file.path);
          console.log(`[Backup Retention] Auto-deleted backup older than ${maxAgeDays} days: ${file.name}`);
        } catch (e) {}
      }
    }

    // 2. If maxToKeep is specified, enforce it on remaining
    if (maxToKeep && maxToKeep > 0) {
      const remaining = backupFiles.filter(f => (now - f.mtime) <= maxAgeMs);
      remaining.sort((a, b) => b.mtime - a.mtime);
      if (remaining.length > maxToKeep) {
        const excess = remaining.slice(maxToKeep);
        for (const item of excess) {
          try {
            await fs.unlink(item.path);
            console.log(`[Backup Retention] Pruned backup exceeding max count (${maxToKeep}): ${item.name}`);
          } catch (e) {}
        }
      }
    }
  } catch (err) {
    console.warn('[Backup Retention] Failed to scan backup directory:', err.message);
  }
}

module.exports = {
  MAGIC,
  HEADER_LEN,
  getProgramDataBackupsDir,
  encryptData,
  decryptData,
  packBackup,
  unpackBackup,
  pruneBackups
};
