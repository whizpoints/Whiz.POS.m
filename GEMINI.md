# Localhost & Cloudflare Tunnel Network Configuration

## Port 3000 Cloudflare Tunnel
- On this machine, a **Cloudflare Tunnel** is configured and running that maps `localhost:3000` to `https://api.whizpoint.app` with a valid HTTPS certificate.
- When running any server or application on `localhost:3000`, its endpoints are reachable globally via `https://api.whizpoint.app`.
- **Remote Devices & Webhook Callbacks**:
  - Use `https://api.whizpoint.app` when testing or debugging from other devices (phones, tablets, external browsers).
  - External services and webhook callbacks that require public HTTPS endpoints (e.g. Safaricom M-Pesa callbacks / STK push) must point to `https://api.whizpoint.app`.
  - If the local server on port 3000 is stopped or down, `https://api.whizpoint.app` is also down. Always keep the port 3000 service active during testing and integrations.
