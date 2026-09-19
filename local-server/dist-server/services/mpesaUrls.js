export class MpesaCallbackUrlService {
    static get baseUrl() {
        return process.env.API_BASE_URL || 'https://api.whizpoint.app';
    }
    static getStkCallbackUrl(businessId) {
        return `${this.baseUrl}/api/callbacks/payments/callback/stk/${encodeURIComponent(businessId)}`;
    }
    static getC2bConfirmationUrl(businessId) {
        return `${this.baseUrl}/api/callbacks/payments/callback/c2b/confirmation/${encodeURIComponent(businessId)}`;
    }
    static getC2bValidationUrl(businessId) {
        return `${this.baseUrl}/api/callbacks/payments/callback/c2b/validation/${encodeURIComponent(businessId)}`;
    }
}
