import path from "path";
import fs from "fs";
import crypto from 'crypto';

let cachedFileCertificate: string | null = null;

/**
 * Load and validate a PEM certificate string.
 * Returns null if the string is not a valid PEM cert.
 */
function normalizePemCert(raw: string): string | null {
  if (!raw) return null;
  
  // If it's already a valid PEM string, return as-is
  if (raw.includes('-----BEGIN CERTIFICATE-----')) return raw.trim();
  
  // Try to interpret as raw base64 (DER format) and wrap in PEM headers
  try {
    const cleaned = raw.replace(/\s+/g, '');
    const wrapped = '-----BEGIN CERTIFICATE-----\n' + 
      cleaned.match(/.{1,64}/g)?.join('\n') + 
      '\n-----END CERTIFICATE-----';
    return wrapped;
  } catch {
    return null;
  }
}

/**
 * Load the file-level Safaricom certificate (shared fallback).
 */
function loadFileCertificate(): string | null {
  if (cachedFileCertificate) return cachedFileCertificate;
  try {
    const certPath = path.join(process.cwd(), 'server', 'utils', 'ProductionCertificate.cer');
    const raw = fs.readFileSync(certPath, 'utf8');
    const normalized = normalizePemCert(raw);
    if (!normalized) {
      // Try reading as binary
      const buffer = fs.readFileSync(certPath);
      const b64 = buffer.toString('base64');
      const pem = '-----BEGIN CERTIFICATE-----\n' + b64.match(/.{1,64}/g)?.join('\n') + '\n-----END CERTIFICATE-----';
      cachedFileCertificate = pem;
    } else {
      cachedFileCertificate = normalized;
    }
    console.log('[Crypto] Loaded Safaricom certificate from disk. Length:', cachedFileCertificate?.length);
    return cachedFileCertificate;
  } catch (err) {
    console.error('[Crypto] Could not read ProductionCertificate.cer:', err);
    return null;
  }
}

/**
 * Generate a Safaricom SecurityCredential by RSA-encrypting the initiator password
 * with the Safaricom public certificate.
 * 
 * @param initiatorPassword - The PLAINTEXT initiator password (not yet encrypted)
 * @param businessCertBase64 - Optional: per-business cert stored in DB as base64 string
 */
export async function generateSecurityCredential(initiatorPassword: string, businessCertBase64?: string | null): Promise<string> {
  let certPem: string | null = null;

  // 1. Try per-business cert from DB first
  if (businessCertBase64) {
    certPem = normalizePemCert(businessCertBase64);
    if (certPem) {
      console.log('[Crypto] Using per-business certificate from DB');
    } else {
      console.warn('[Crypto] Per-business cert from DB could not be parsed — falling back to file cert');
    }
  }

  // 2. Fall back to shared file-level cert
  if (!certPem) {
    certPem = loadFileCertificate();
  }

  if (!certPem) {
    const msg = '[Crypto] ⚠️  No valid Safaricom certificate found. Cannot generate SecurityCredential. Upload a certificate or place ProductionCertificate.cer in server/utils/.';
    console.error(msg);
    throw new Error(msg);
  }

  try {
    const buffer = Buffer.from(initiatorPassword);
    const encrypted = crypto.publicEncrypt(
      {
        key: certPem,
        padding: crypto.constants.RSA_PKCS1_PADDING,
      },
      buffer
    );
    return encrypted.toString('base64');
  } catch (err) {
    console.error('[Crypto] Failed to RSA-encrypt SecurityCredential. Cert may be invalid or wrong type:', err);
    throw new Error(`Failed to generate SecurityCredential: ${(err as Error).message}`);
  }
}

const ALGORITHM = 'aes-256-cbc';

// Helper to get a stable 32-byte key from JWT_SECRET
const getKey = () => {
  const secret = process.env.JWT_SECRET || 'default_insecure_fallback_secret_for_local';
  return crypto.createHash('sha256').update(secret).digest();
};

export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
};

export const decrypt = (encryptedText: string): string => {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) return encryptedText; // Probably not encrypted or old format

    const iv = Buffer.from(parts[0], 'hex');
    const encryptedTextBuffer = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    let decrypted = decipher.update(encryptedTextBuffer, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error, returning original string', error);
    return encryptedText;
  }
};
