import path from "path";
import fs from "fs";
import crypto from 'crypto';
let cachedFileCertificate = null;
function normalizePemCert(raw) {
    if (!raw)
        return null;
    if (raw.includes('-----BEGIN CERTIFICATE-----'))
        return raw.trim();
    try {
        const cleaned = raw.replace(/\s+/g, '');
        const wrapped = '-----BEGIN CERTIFICATE-----\n' +
            cleaned.match(/.{1,64}/g)?.join('\n') +
            '\n-----END CERTIFICATE-----';
        return wrapped;
    }
    catch {
        return null;
    }
}
function loadFileCertificate() {
    if (cachedFileCertificate)
        return cachedFileCertificate;
    try {
        const certPath = path.join(process.cwd(), 'server', 'utils', 'ProductionCertificate.cer');
        if (!fs.existsSync(certPath))
            return null;
        const raw = fs.readFileSync(certPath, 'utf8');
        const normalized = normalizePemCert(raw);
        if (!normalized) {
            const buffer = fs.readFileSync(certPath);
            const b64 = buffer.toString('base64');
            const pem = '-----BEGIN CERTIFICATE-----\n' + b64.match(/.{1,64}/g)?.join('\n') + '\n-----END CERTIFICATE-----';
            cachedFileCertificate = pem;
        }
        else {
            cachedFileCertificate = normalized;
        }
        return cachedFileCertificate;
    }
    catch (err) {
        console.error('[Crypto] Could not read ProductionCertificate.cer:', err);
        return null;
    }
}
export async function generateSecurityCredential(initiatorPassword, customCertBase64) {
    let certPem = null;
    if (customCertBase64) {
        certPem = normalizePemCert(customCertBase64);
    }
    if (!certPem) {
        certPem = loadFileCertificate();
    }
    if (!certPem) {
        console.warn('[Crypto] No valid Safaricom certificate found. STK Push Transaction Status checks may fail.');
        return initiatorPassword;
    }
    try {
        const buffer = Buffer.from(initiatorPassword);
        const encrypted = crypto.publicEncrypt({
            key: certPem,
            padding: crypto.constants.RSA_PKCS1_PADDING,
        }, buffer);
        return encrypted.toString('base64');
    }
    catch (err) {
        console.error('Failed to generate Safaricom SecurityCredential:', err);
        return initiatorPassword;
    }
}
const ALGORITHM = 'aes-256-cbc';
// Helper to get a stable 32-byte key from JWT_SECRET
const getKey = () => {
    const secret = process.env.JWT_SECRET || 'default_insecure_fallback_secret_for_local';
    return crypto.createHash('sha256').update(secret).digest();
};
export const encrypt = (text) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
};
export const decrypt = (encryptedText) => {
    try {
        const parts = encryptedText.split(':');
        if (parts.length !== 2)
            return encryptedText; // Probably not encrypted or old format
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedTextBuffer = Buffer.from(parts[1], 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
        let decrypted = decipher.update(encryptedTextBuffer, undefined, 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    catch (error) {
        console.error('Decryption error, returning original string', error);
        return encryptedText;
    }
};
