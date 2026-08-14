import { usePosStore } from '../store/posStore';

type SyncTarget = 'CLOUD' | 'LAN_ADMIN';

interface NetworkConfig {
  baseUrl: string;
  apiKey: string;
}

export class NetworkClient {
  static resolvedLanIp: string | null = null;
  static isDiscovering = false;

  /**
   * Discovers the Local Admin Server via mDNS on the network.
   */
  static async discoverLocalServer(): Promise<string | null> {
    if (this.resolvedLanIp) return this.resolvedLanIp;
    if (this.isDiscovering) return null; // Prevent concurrent discovery loops
    this.isDiscovering = true;

    try {
      // @ts-ignore
      const ip = await window.electron.discoverLocalServer();
      if (ip) {
        this.resolvedLanIp = ip;
      }
      this.isDiscovering = false;
      return ip;
    } catch (err) {
      console.error('[mDNS] Discovery failed:', err);
      this.isDiscovering = false;
      return null;
    }
  }

  /**
   * Dynamically resolves the correct base URL and API key based on the selected sync target.
   */
  static async getConfig(): Promise<NetworkConfig | null> {
    const state = usePosStore.getState();
    const setup = state.businessSetup;

    if (!setup) return null;

    // For future expansion: state.syncTarget could be added to allow toggling
    const target: SyncTarget = 'LAN_ADMIN'; // Switch to Local Server mode!

    if (target === 'CLOUD') {
      const rawUrl = setup.backOfficeUrl || setup.apiUrl || '';
      let apiUrl = rawUrl.replace(/\/$/, '');
      apiUrl = apiUrl.replace(/\/api$/, '');
      const apiKey = setup.backOfficeApiKey || setup.apiKey || '';
      
      if (!apiUrl || !apiKey) return null;
      return { baseUrl: apiUrl, apiKey };
    } else {
      // LAN_ADMIN routing
      let lanIp = this.resolvedLanIp || setup.lanAdminIp;
      
      if (!lanIp) {
        // Attempt auto-discovery
        lanIp = await this.discoverLocalServer();
        if (!lanIp) {
           lanIp = 'http://localhost:3000'; // Final fallback
        }
      }
      return { baseUrl: lanIp, apiKey: setup.apiKey || '' };
    }
  }

  static async fetchApi(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const config = await this.getConfig();
    if (!config) {
      throw new Error("Network client unconfigured. Missing API URL or Key.");
    }

    const url = `${config.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'X-API-KEY': config.apiKey,
      ...options.headers,
    };

    return fetch(url, { ...options, headers });
  }

  static async pushDeltaSync(payload: any) {
    const response = await this.fetchApi('/api/sync/delta', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Push Sync failed: ${response.status}`);
    return response.json();
  }

  static async pullDeltaSync(sinceTimestamp: string, locationId?: string, outletId?: string) {
    let endpoint = `/api/sync/delta?since=${encodeURIComponent(sinceTimestamp)}`;
    if (locationId) endpoint += `&locationId=${encodeURIComponent(locationId)}`;
    if (outletId) endpoint += `&outletId=${encodeURIComponent(outletId)}`;

    const response = await this.fetchApi(endpoint, { method: 'GET' });
    if (!response.ok) throw new Error(`Pull Sync failed: ${response.status}`);
    return response.json();
  }
}
