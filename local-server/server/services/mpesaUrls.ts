export class MpesaCallbackUrlService {
  private static get baseUrl(): string {
    return process.env.API_BASE_URL || 'https://api.whizpoint.app';
  }

  static getStkCallbackUrl(businessId: string): string {
    return `${this.baseUrl}/api/callbacks/payments/callback/stk/${encodeURIComponent(businessId)}`;
  }

  static getC2bConfirmationUrl(businessId: string): string {
    return `${this.baseUrl}/api/callbacks/payments/callback/c2b/confirmation/${encodeURIComponent(businessId)}`;
  }

  static getC2bValidationUrl(businessId: string): string {
    return `${this.baseUrl}/api/callbacks/payments/callback/c2b/validation/${encodeURIComponent(businessId)}`;
  }
}
