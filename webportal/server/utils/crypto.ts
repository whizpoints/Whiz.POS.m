import crypto from 'crypto';

let cachedCertificate: string | null = null;

export async function generateSecurityCredential(initiatorPassword: string): Promise<string> {
    if (!cachedCertificate) {
        try {
            console.log('Fetching Safaricom Production Certificate dynamically...');
            const response = await fetch('https://developer.safaricom.co.ke/certificates/ProductionCertificate.cer');
            if (response.ok) {
                cachedCertificate = await response.text();
            } else {
                console.error('Failed to fetch certificate. Status:', response.status);
            }
        } catch (err) {
            console.error('Error fetching Safaricom certificate:', err);
        }
    }

    if (!cachedCertificate) {
        console.warn('publicCertificate could not be loaded. STK Push Transaction Status checks may fail.');
        return initiatorPassword;
    }

    try {
        const buffer = Buffer.from(initiatorPassword);
        const encrypted = crypto.publicEncrypt(
            {
                key: cachedCertificate,
                padding: crypto.constants.RSA_PKCS1_PADDING,
            },
            buffer
        );
        return encrypted.toString('base64');
    } catch (err) {
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
