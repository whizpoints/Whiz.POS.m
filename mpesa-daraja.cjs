const fetch = require('node-fetch');

class MpesaService {
    constructor() {
        this.env = 'production'; // Using live URLs as requested
        this.baseUrl = 'https://api.safaricom.co.ke';
    }

    async getAccessToken(consumerKey, consumerSecret) {
        const auth = Buffer.from(\\:\\).toString('base64');
        const res = await fetch(\\/oauth/v1/generate?grant_type=client_credentials\, {
            headers: { 'Authorization': \Basic \\ }
        });
        if (!res.ok) throw new Error('Failed to authenticate with Daraja');
        const data = await res.json();
        return data.access_token;
    }

    async sendStkPush({ amount, phone, passkey, shortcode, consumerKey, consumerSecret }) {
        try {
            const token = await this.getAccessToken(consumerKey, consumerSecret);
            const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
            const password = Buffer.from(\\\\\).toString('base64');

            // Safaricom requires phone numbers to start with 254
            let formattedPhone = phone.startsWith('+') ? phone.slice(1) : phone;
            if (formattedPhone.startsWith('0')) formattedPhone = \254\\;

            const payload = {
                BusinessShortCode: shortcode,
                Password: password,
                Timestamp: timestamp,
                TransactionType: 'CustomerPayBillOnline', // or CustomerBuyGoodsOnline
                Amount: Math.ceil(amount),
                PartyA: formattedPhone,
                PartyB: shortcode,
                PhoneNumber: formattedPhone,
                CallBackURL: 'https://api.whizpoint.app/api/mpesa/callback', // We still send it to cloud for record keeping
                AccountReference: 'WhizPOS',
                TransactionDesc: 'POS Sale'
            };

            const res = await fetch(\\/mpesa/stkpush/v1/processrequest\, {
                method: 'POST',
                headers: {
                    'Authorization': \Bearer \\,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.ResponseCode === '0') {
                return { success: true, checkoutRequestId: data.CheckoutRequestID };
            } else {
                return { success: false, error: data.errorMessage || data.ResponseDescription };
            }
        } catch (error) {
            console.error('[Mpesa] STK Push Error:', error);
            return { success: false, error: error.message };
        }
    }

    async queryStkPush({ checkoutRequestId, passkey, shortcode, consumerKey, consumerSecret }) {
        try {
            const token = await this.getAccessToken(consumerKey, consumerSecret);
            const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
            const password = Buffer.from(\\\\\).toString('base64');

            const res = await fetch(\\/mpesa/stkpushquery/v1/query\, {
                method: 'POST',
                headers: {
                    'Authorization': \Bearer \\,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    BusinessShortCode: shortcode,
                    Password: password,
                    Timestamp: timestamp,
                    CheckoutRequestID: checkoutRequestId
                })
            });

            const data = await res.json();
            
            // ResultCode 0 means successful payment
            if (data.ResultCode === '0') {
                return { success: true, status: 'COMPLETED', receipt: data.ResultDesc };
            } else if (data.ResultCode) {
                // Any other result code means it was cancelled or failed
                return { success: true, status: 'FAILED', error: data.ResultDesc };
            } else if (data.errorCode) {
                // Usually means it's still processing
                return { success: true, status: 'PENDING' };
            }

            return { success: true, status: 'PENDING' };
        } catch (error) {
            console.error('[Mpesa] STK Query Error:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new MpesaService();
