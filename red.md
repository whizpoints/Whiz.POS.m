# Whiz Point POS - Multi-Outlet Architecture

This document explains the decentralized, multi-outlet network architecture implemented for Whiz Point POS.

## 1. Network Discovery & Connectivity
The system utilizes mDNS (Zero-Config Networking) to allow Outlets to discover the Main Server without manual IP entry.
- **Server Hub**: Broadcasts its presence on UDP 5353, bound to `0.0.0.0` to be visible on all network interfaces.
- **Outlet Terminal**: Automatically scans and lists discovered servers during the setup handshake.

## 2. Zero-Config Handshake (The Lifecycle)
1. **Launch**: App detects no config → Prompts for Outlet Name → Scans for Server.
2. **Handshake**: Outlet sends a "Registration Request" with its name to the selected Server.
3. **Approval**: Server Hub administrator views "Pending Requests" and clicks **[Approve]**.
4. **Activation**: Outlet automatically detects approval, downloads Master Data (Products, Users, PINs), and launches the POS.

## 3. Server Admin Control Plane (The Brain)
The Server Hub is the central management layer:
- **Manage Outlets**: Approval Gateway to authorize new terminals.
- **Real-Time Monitoring**: View connectivity status, last sync, pending sales, and shift IDs.
- **Inventory Orchestration**: Global catalog management with stock adjustment pushing.
- **Centralized Staff**: Manage all employee profiles and secure PINs globally.

## 4. Outlet Terminal Logic (The Muscle)
Outlets are optimized for high-speed transaction execution:
- **Offline-First**: Every sale is saved in a local ledger with a `synced: false` flag.
- **Background Sync**: A persistent service pushes unsynced sales to the Server every 30 seconds.
- **Restricted Access**: Outlets cannot modify inventory, users, or receipt policies.

## 5. Centralized Backup Management
The Server runs an automated daemon that pulls local databases from all approved outlets every 2 hours, organizing them into `Documents/WhizPOS/OutletName`.

## 6. Branding & Compliance
- **Support Email**: support@whizpoint.app
- **Website**: https://pos.whizpoint.app
