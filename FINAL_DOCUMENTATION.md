# Whiz POS - Complete System Documentation

## Table of Contents
1. [System Architecture (3-Tier Model)](#system-architecture-3-tier-model)
2. [Tier 1: POS Desktop App (Client)](#tier-1-pos-desktop-app-client)
3. [Tier 2: Local Server (Admin Server)](#tier-2-local-server-admin-server)
4. [Tier 3: Web Portal (Cloud Back-Office)](#tier-3-web-portal-cloud-back-office)
5. [Data Synchronization Flow](#data-synchronization-flow)
6. [Multi-Outlet & Integrations Management](#multi-outlet--integrations-management)
7. [Authentication & Account Management](#authentication--account-management)

---

## System Architecture (3-Tier Model)

Whiz POS uses a robust, offline-first 3-tier architecture designed to support businesses with multiple physical locations and outlets, while maintaining 100% uptime in the shop even without internet access.

1. **POS Client (`Whiz_POS-master`)**: The frontend cashier interface.
2. **Local Server (`local-server`)**: The local network hub acting as the point of truth for a specific physical shop/outlet.
3. **Web Portal (`webportal`)**: The global cloud backend that aggregates data across all locations.

**Key Domains**:
- **Cloud Backend API**: `api.whizpoint.app` (Secure HTTPS tunnel routing to the central database)
- **Marketing/Web**: `pos.whizpoint.app`

---

## Tier 1: POS Desktop App (Client)

The POS Client is an Electron application that cashiers interact with. It is designed to be lightweight and fast.

### Core Responsibilities
- **Offline Checkout**: Can process sales completely offline using its local SQLite database (`sqlite-db.cjs`).
- **Local Data Caching**: Stores a local copy of users (cashiers), products, categories, and settings needed for immediate checkout.
- **Queueing**: Puts transactions into a `pending_syncs` queue when offline, and pushes them to the Local Server once the local network is available.

### Configuration
The POS client discovers its Local Server automatically via mDNS or can be configured manually via the `NetworkClient` to point to the Local Server's IP address (e.g., `http://192.168.1.100:5050`).

---

## Tier 2: Local Server (Admin Server)

The Local Server is an Electron-packaged Node/Express application running a local SQLite database (via Prisma/Kysely). It sits in the physical shop (e.g., on a manager's computer or a dedicated back-office PC) and serves all POS terminals in that outlet.

### Core Responsibilities
- **Shop Point of Truth**: Holds the master local inventory, local transactions, and handles local stock deductions.
- **Terminal Aggregation**: Receives delta pushes from all POS clients in the shop via local LAN (`/api/sync/delta`).
- **Hardware & Integrations**: Executes hardware-specific integrations that require local network access, such as:
  - **M-Pesa STK Push**: Communicates with Daraja API using credentials assigned to this specific outlet.
  - **KRA eTIMS**: Communicates with local VSDC middleware or KRA servers to sign invoices.
- **Cloud Sync Engine**: Runs a background cron job every 60 seconds to push local changes to the Web Portal and pull global updates.

---

## Tier 3: Web Portal (Cloud Back-Office)

The Web Portal is the global cloud backend running on Node/Express with a PostgreSQL database. It is accessible by business owners and global admins.

### Core Responsibilities
- **Multi-Tenant Management**: Separates data securely by `Business`.
- **Multi-Location / Multi-Outlet**: Manages multiple `StoreLocation`s and `Outlet`s under a single business account.
- **Global Catalog & Inventory**: Maintains the master product list and tracks inventory across all outlets globally.
- **Reporting**: Aggregates all transactions (`Receipt` and `ReceiptItem`) across all servers to provide global financial reports.
- **Central Configuration**: Allows the business owner to remotely configure M-Pesa (`MpesaConfig`) and eTIMS credentials for specific remote outlets.

---

## Data Synchronization Flow

The sync process utilizes a "Delta Sync" pattern with Last-Write-Wins (LWW) conflict resolution based on `updatedAt` timestamps.

### 1. POS Client ↔ Local Server
- **Trigger**: Continuous (when LAN is available).
- **Push**: POS pushes new transactions and stock deductions to the Local Server.
- **Pull**: POS pulls new products, users, and settings from the Local Server.

### 2. Local Server ↔ Web Portal (Cloud)
- **Trigger**: Background Cron Job (Every 60 Seconds).
- **Push (Upward Sync)**: The Local Server packages all `transactions` (including line items), `inventoryLogs`, `users`, and `products` modified since the last successful push, and sends them to the Web Portal.
- **Pull (Downward Sync)**: The Local Server requests all data modified globally since the last successful pull. This includes new global products, global user updates, and `MpesaConfig` updates targeted at its specific `outletId`.

---

## Multi-Outlet & Integrations Management

### The Hierarchy
- **Business**: The overarching company account.
- **StoreLocation**: A physical geographical area (e.g., "Nairobi CBD").
- **Outlet**: A specific shop within a location (e.g., "Shop 1", "Shop 2").

### How it Works
1. When setting up a Local Server in a shop, the owner generates an **API Key** in the Web Portal assigned to a specific `Outlet`.
2. This API Key is entered into the Local Server's setup screen.
3. Every time the Local Server syncs with the Web Portal, it authenticates using this API Key, which the Web Portal resolves to the specific `businessId`, `locationId`, and `outletId`.
4. **M-Pesa / eTIMS**: Because these integrations are inherently tied to physical locations (e.g., a specific Till Number for a specific shop), their configurations are tied to the `Outlet` level in the Web Portal database. The Web Portal pushes these credentials down to the correct Local Server during the Delta Pull.

---

## Detailed Data Matrix

This section explicitly defines exactly what data is held by each portal to assist project engineers in planning changes.

### 1. Web Portal (Cloud - PostgreSQL via Prisma)
*Acts as the Global Master Record for the entire business.*
- **Business Setup**: `Business`, `StoreLocation`, `Outlet` (Defines the multi-tenant architecture).
- **Users**: `User` (Contains all global admins, store managers, and cashiers across all locations).
- **Catalog**: `Category`, `Product` (The master catalog shared across all locations).
- **Inventory**: `ProductInventory` (Tracks stock levels globally, separated by `locationId` and `outletId`), `StockMovement` (Global audit log of all stock changes).
- **Financials**: `Receipt`, `ReceiptItem` (Every sale made anywhere), `SavedDocument` (Global quotations/proforma invoices).
- **CRM & Supply**: `Customer` (Global customer list), `Supplier` (Global vendor list).
- **Integrations**: `MpesaConfig` (Master repository of Daraja API keys, separated by `outletId`), `MpesaTransaction` (Global ledger of all M-Pesa payments).
- **Devices**: `Terminal` (Registry of all active POS machines).

### 2. Local Server (Shop Back-Office - SQLite via Kysely)
*Acts as the Point of Truth for a specific Outlet.*
- **Business Setup**: Cached subsets of `Business`, `StoreLocation`, `Outlet` relevant ONLY to the assigned API Key.
- **Users**: Cached `User` records for cashiers/managers assigned to this location.
- **Catalog**: Cached `Category`, `Product` pushed down from the Web Portal.
- **Inventory**: `ProductInventory` (Master local stock levels), `StockMovement` (Local stock adjustments and sales deductions).
- **Financials**: `Receipt`, `ReceiptItem` (Only transactions processed within this outlet), `SavedDocument` (Quotations generated locally).
- **CRM & Supply**: `Customer`, `Supplier` (Local records, synced upward to become global).
- **Integrations**: `MpesaConfig` (Cached from Web Portal to execute local STK pushes), `MpesaTransaction` (Local M-Pesa callbacks).
- **Devices**: `Terminal` (Local POS machines connected to this server).

### 3. POS Client (Desktop App - local `sqlite-db.cjs`)
*Acts as the Offline Checkout Interface.*
- **Users**: Local cached `users` table for offline login PIN verification.
- **Catalog**: Local cached `products` and `categories` tables for fast offline search and checkout.
- **Settings**: Local `settings` (Receipt headers, tax rules, local printer configs).
- **Financials**: Local `transactions` and `transaction_items` (Temporary storage before sync), `hold_orders` (Saved carts).
- **Sync State**: `pending_syncs` (The queue table holding JSON payloads of transactions and stock deductions waiting to be pushed to the Local Server).

---

## Exact Communication Protocols

### 1. POS Client ↔ Local Server
- **REST API (`/api/sync/delta`)**: 
  - The POS Client uses `NetworkClient` to automatically discover the Local Server via **mDNS** (`whizpos-admin` service).
  - PUSH: The POS empties its `pending_syncs` SQLite table by POSTing transactions and stock deductions to the Local Server.
  - PULL: The POS GETs updated products and users from the Local Server.
- **Socket.io (Port 5050)**: 
  - The POS maintains an active WebSocket connection to the Local Server.
  - When a cashier completes a sale, the POS emits `stock_deducted`.
  - The Local Server broadcasts `stock_updated` to all other connected POS machines in the shop to ensure real-time inventory consistency locally without needing the internet.

### 2. Local Server ↔ Web Portal
- **REST API (`api.whizpoint.app/api/sync/delta`)**:
  - A cron job (`setInterval`) runs every 60 seconds inside `local-server/server/index.ts`.
  - **PUSH**: Queries the local SQLite database for `Receipt`, `ReceiptItem`, `User`, `Product`, `Customer`, `StockMovement` where `updatedAt > lastPushLog`. Sends JSON payload to Web Portal.
  - **PULL**: Requests data where `updatedAt > lastPullLog`. The Web Portal returns global products, global users, and `MpesaConfigs`. The Local Server loops through this payload and upserts its local SQLite database.
- **REST API (`api.whizpoint.app/api/sync/sales`)**: Secondary fallback endpoint for pushing transactions (currently deprecated in favor of the unified Delta Push).
- **Cloud Socket.io (`https://api.whizpoint.app`)**:
  - The Local Server maintains a persistent socket connection to the Web Portal, joining a room based on its `businessId`.
  - Listens for `downward_sync_event` (triggered when a Web Portal admin updates a product or setting).
  - Emits `local_transaction_synced` to notify the Web Portal dashboard to update live sales charts.

---

## Authentication & Account Management

### Web Portal (Cloud)
- **URL**: `pos.whizpoint.app`
- **Login**: Email and Password.
- **Roles**: Global Admin (System Owner), Business Admin (Business Owner).

### Local Server (Shop Back-Office)
- **URL**: `http://localhost:5050` or LAN IP.
- **Login**: Email and Password/PIN.
- **Roles**: Store Manager, Admin.
- **Note**: Authenticable users are synced down from the Web Portal.

### POS Client
- **Login**: Cashier PIN or Password.
- **Roles**: Cashier.
- **Note**: The POS authenticates against its local SQLite database, allowing login even when the internet is completely down.
