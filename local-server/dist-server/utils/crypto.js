import crypto from 'crypto';
let cachedCertificate = null;
export async function generateSecurityCredential(initiatorPassword) {
    if (!cachedCertificate) {
        try {
            console.log('Fetching Safaricom Production Certificate dynamically...');
            const response = await fetch('https://developer.safaricom.co.ke/certificates/ProductionCertificate.cer');
            if (response.ok) {
                cachedCertificate = await response.text();
            }
            else {
                console.error('Failed to fetch certificate. Status:', response.status);
            }
        }
        catch (err) {
            console.error('Error fetching Safaricom certificate:', err);
        }
    }
    if (!cachedCertificate) {
        console.warn('publicCertificate could not be loaded. STK Push Transaction Status checks may fail.');
        return initiatorPassword;
    }
    try {
        const buffer = Buffer.from(initiatorPassword);
        const encrypted = crypto.publicEncrypt({
            key: cachedCertificate,
            padding: crypto.constants.RSA_PKCS1_PADDING,
        }, buffer);
        return encrypted.toString('base64');
    }
    catch (err) {
        console.error('Failed to generate Safaricom SecurityCredential:', err);
        return initiatorPassword;
    }
}
