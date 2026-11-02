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
  static async discoverLocalServer(force: boolean = false): Promise<string | null> {
    if (!force && this.resolvedLanIp) return this.resolvedLanIp;
    if (this.isDiscovering) return null; // Prevent concurrent discovery loops
    this.isDiscovering = true;

    try {
      if (window.electron && typeof window.electron.discoverLocalServer === 'function') {
        const res = await window.electron.discoverLocalServer();
        const ip = Array.isArray(res) ? (res[0]?.url || null) : (typeof res === 'string' ? res : (res as any)?.url || null);
        if (ip) {
          this.resolvedLanIp = ip;
          usePosStore.getState().updateServerUrl(ip);
        }
        this.isDiscovering = false;
        return ip;
      }
      this.isDiscovering = false;
      return null;
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

    if ((target as string) === 'CLOUD') {
      const rawUrl = setup.backOfficeUrl || setup.apiUrl || '';
      let apiUrl = rawUrl.replace(/\/$/, '');
      apiUrl = apiUrl.replace(/\/api$/, '');
      const apiKey = setup.backOfficeApiKey || setup.apiKey || '';
      
      if (!apiUrl || !apiKey) return null;
      return { baseUrl: apiUrl, apiKey };
    } else {
      // LAN_ADMIN routing
      let lanIp = this.resolvedLanIp || (setup as any).lanAdminIp || setup.apiUrl;
      
      if (!lanIp) {
        // Attempt auto-discovery
        lanIp = await this.discoverLocalServer();
        if (!lanIp) {
           lanIp = 'http://localhost:5050'; // Fallback to Local Admin Server port
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

    const state = usePosStore.getState();
    const outletId = state.businessSetup?.outletId;

    const url = `${config.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'X-API-KEY': config.apiKey,
      ...(outletId ? { 'x-outlet-id': outletId, 'X-Outlet-Id': outletId } : {}),
      ...(options.headers as Record<string, string> || {}),
    };

    try {
      return await fetch(url, { ...options, headers });
    } catch (err) {
      console.warn(`[NetworkClient] Fetch to ${url} failed. Attempting force discovery...`);
      const newIp = await this.discoverLocalServer(true);
      if (newIp && newIp !== config.baseUrl) {
        const retryUrl = `${newIp}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
        return await fetch(retryUrl, { ...options, headers });
      }
      throw err;
    }
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
    const effectiveOutletId = outletId || usePosStore.getState().businessSetup?.outletId;
    let endpoint = `/api/sync/delta?since=${encodeURIComponent(sinceTimestamp)}`;
    if (locationId) endpoint += `&locationId=${encodeURIComponent(locationId)}`;
    if (effectiveOutletId) endpoint += `&outletId=${encodeURIComponent(effectiveOutletId)}`;

    const response = await this.fetchApi(endpoint, { method: 'GET' });
    if (!response.ok) throw new Error(`Pull Sync failed: ${response.status}`);
    return response.json();
  }
}
