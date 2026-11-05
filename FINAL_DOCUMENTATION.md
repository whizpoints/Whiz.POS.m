# Whiz POS - Complete System Documentation & Architectural Specification

> **Version**: 7.4-ENTERPRISE  
> **Last Updated**: November 2026  
> **Target Environments**: POS Desktop Client (Electron), Local Shop Server (Node/Express/SQLite), Cloud Web Portal (Node/Express/PostgreSQL)  
> **Primary Domains**:
> - Cloud API & Tunnel: `https://api.whizpoint.app` (Maps `localhost:3000` via Cloudflare Tunnel)
> - Web Portal / Marketing: `https://pos.whizpoint.app`

---

## Table of Contents
1. [System Architecture & 3-Tier Edge Network](#1-system-architecture--3-tier-edge-network)
2. [Localhost & Cloudflare Tunnel Network Configuration](#2-localhost--cloudflare-tunnel-network-configuration)
3. [Safaricom Daraja 2.0, STK Push & Automated KYC](#3-safaricom-daraja-20-stk-push--automated-kyc)
4. [Inventory Topologies: Single-Shop vs Multi-Outlet](#4-inventory-topologies-single-shop-vs-multi-outlet)
5. [Sequential SKU Auto-Generation & Catalog Import](#5-sequential-sku-auto-generation--catalog-import)
6. [Business Intelligence & 7 Core Reports](#6-business-intelligence--7-core-reports)
7. [Executive Daily Business Summary PDF Generator](#7-executive-daily-business-summary-pdf-generator)
8. [Connection Health Pill & Hardware Peripherals](#8-connection-health-pill--hardware-peripherals)
9. [KRA eTIMS VSCU Cryptographic Signing](#9-kra-etims-vscu-cryptographic-signing)
10. [Hospitality & Restaurant Floor Architecture](#10-hospitality--restaurant-floor-architecture)
11. [Data Synchronization Protocols & Conflict Resolution](#11-data-synchronization-protocols--conflict-resolution)

---

## 1. System Architecture & 3-Tier Edge Network

Whiz POS uses an offline-first 3-tier architecture to maintain 100% cashier checkout uptime in physical shops during internet and power cuts:

### Tier 1: POS Desktop Client (`Whiz_POS-master`)
- **Engine**: Electron application running an embedded SQLite database (`sqlite-db.cjs`).
- **Performance**: Barcode lookups, cash transactions, and thermal printing execute in **< 0.2ms** locally.
- **Offline Queue**: Offline sales write immediately to disk in the `pending_syncs` table.
- **PIN Verification**: Cashiers authenticate against locally cached credentials with zero spinner delay.

### Tier 2: Local Shop Server (`local-server`)
- **Engine**: Electron-packaged Node/Express server running SQLite via Kysely (Port 5050).
- **Point of Truth**: Acts as the master inventory hub for the physical shop LAN.
- **Local WebSocket Hub**: Broadcasts `stock_updated` events to all connected cashier terminals in real time when an item is scanned.
- **Peripherals**: Manages local receipt print queues, M-Pesa STK push dispatch, and KRA eTIMS signing.

### Tier 3: Cloud Web Portal (`webportal`)
- **Engine**: Node/Express with PostgreSQL (via Prisma ORM).
- **Multi-Tenant Hub**: Manages `Business`, `StoreLocation`, `Outlet`, global catalog, staff roles, and centralized reporting.
- **Cron Synchronization**: Runs background delta sync every 60 seconds with Last-Write-Wins (LWW) conflict resolution.

---

## 2. Localhost & Cloudflare Tunnel Network Configuration

- On the host machine, a persistent **Cloudflare Tunnel** maps `localhost:3000` to `https://api.whizpoint.app` with valid SSL certificates.
- **External Services & Webhook Delivery**:
  - Safaricom Daraja STK Push callbacks (`/api/callbacks/payments/callback/stk/:businessId`) point directly to `https://api.whizpoint.app`.
  - Remote mobile devices (e.g. phones, tablets) connect via `https://api.whizpoint.app`.
  - Keeping port 3000 running is essential for all incoming webhook callbacks and cloud sync.

---

## 3. Safaricom Daraja 2.0, STK Push & Automated KYC

### Sub-450ms Latency Engine
- In-memory OAuth token caching eliminates duplicate token requests to Safaricom.
- Real-time millisecond stopwatches log the pipeline:
  ```
  [Backend STK Push] Received request for 254740841168, Amount: 500
  [Daraja Request] Token cached in RAM (+42ms)
  [Daraja Request] Sending STK Push to processrequest (+198ms)
  [Daraja Response] ResponseCode: 0, Accepted for processing (+420ms)
  [M-Pesa Webhook] STK Callback received: Receipt UK5KZ13A22
  ```

### Customer KYC Auto-Resolution
Because Daraja STK push callbacks omit customer names by Safaricom specification, Whiz POS automatically enriches transactions:
1. Checks local POS memory (`pos_customer_phone_directory` in `localStorage`).
2. Queries Central Customer Master on the cloud portal.
3. Checks past C2B receipts matching phone digits.
4. Cleans all-caps noisy strings: `JOSPHAT NJUGUNA MBURU` &rarr; `Josphat Mburu` (Title Case First + Last).
5. Persists the name for all subsequent checkout transactions.

### Till vs Paybill Configuration
- **BuyGoods Till**: Shortcode = Store Number (e.g. `7128505`), PartyB = Customer Till Number (e.g. `3098707`).
- **Paybill**: Shortcode and PartyB are identical. The POS automatically assigns invoice numbers as the Account Reference.

---

## 4. Inventory Topologies: Single-Shop vs Multi-Outlet

### Single-Outlet Shops (Direct Selling)
- **Setting**: `inventoryMode: 'SHARED'`, `hasCentralStore: false`.
- **Behavior**: Newly added or imported products immediately reflect at cashier tills.
- **Benefit**: Zero Good Received Notes (GRN) friction; prevents stock double-counting between shelf and storage.

### Multi-Branch Retailers (Central Store + Outlets)
- **Setting**: `inventoryMode: 'SEPARATE'`, `hasCentralStore: true`.
- **Behavior**: Goods arrive at Central Warehouse via GRN.
- **Inter-Branch Transfers**: Dispatch notes issued from Central Warehouse to satellite branches (e.g. Nairobi CBD to Mombasa). Outlet managers must click "Accept Transfer" to confirm received quantities.

---

## 5. Sequential SKU Auto-Generation & Catalog Import

- **Collision-Free Generation**: Auto-generates clean, sequential SKUs (`PRD-00001`, `PRD-00002`, `PRD-00003`, etc.).
- **Excel Bulk Import**: Scans Excel rows with missing or blank SKU cells, auto-assigns next sequential SKU numbers.
- **Dynamic Category Creation**: If imported products belong to categories not yet in the database, the importer creates them automatically on the fly.
- **Barcode Support**: Supports 1D EAN-13, UPC, Code-128, and supermarket butchery/produce scale barcodes (`20WWWWWCCCCCD`).

---

## 6. Business Intelligence & 7 Core Reports

The Reports Hub (`webportal/src/pages/Reports.tsx`) provides 7 real-time business intelligence tools:

1. **Stock Valuation Report (At Cost vs At Selling Price)**:
   - Total Units, Total Asset Cost Value, Total Retail Selling Value, and Projected Margin (KES & %).
2. **Dead Stock & Slow-Moving Items Report**:
   - Isolates items with zero sales over 15, 30, 60, or 90+ days.
   - Highlights tied-up working capital sitting dormant on shelves.
3. **Top 20 Pareto (80/20) Bestsellers**:
   - Calculates cumulative revenue distribution isolating the top 20% products driving 80% of sales.
4. **Physical Stocktake & Variance Auditor**:
   - Interactive audit sheet for physical counts.
   - Automatically computes unit discrepancy and monetary variance (shrinkage in red, surplus in green).
   - Includes 1-click **Commit Reconciliation** to update database inventory directly.
5. **Cash Float & End-of-Shift Reconciliation (X / Z Read)**:
   - POS formula: `Opening Float + Cash Sales - Petty Payouts = Expected Cash`.
   - Compares expected cash with physical counted cash to declare **Balanced**, **Shortage**, or **Surplus**.
   - Filterable by individual cashier or combined store total.
6. **M-Pesa Statement Reconciler**:
   - Regex parses 10-character alphanumeric transaction codes from raw statements.
   - Identifies unmatched M-Pesa payments made to till but unbilled by cashier.
7. **Executive Daily Overview**:
   - Visual Area charts for Revenue vs Estimated Profit, cashier shift leaderboards, and pending unpaid hospitality tabs.

---

## 7. Executive Daily Business Summary PDF Generator

- **File**: `webportal/src/lib/executivePdf.ts`
- **Output**: Multi-section A4 executive boardroom PDF generated via `jspdf` and `jspdf-autotable`.
- **Sections**:
  1. Executive KPI Cards (Total Revenue, Gross Profit, Total Orders, Paid vs Unpaid Tabs).
  2. Tender Payment Breakdown (Cash, M-Pesa, Card, Credit totals, counts, and share %).
  3. Top Pareto 80/20 Bestsellers table.
  4. Cashier Shift Performance audit table.
  5. Stock Valuation & Inventory Health summary.
  6. KRA Tax Compliance breakdown (Class A Exempt, Class B 16%, Class C Zero-Rated).

---

## 8. Connection Health Pill & Hardware Peripherals

### Header Health Pill (`src/components/ConnectionHealthPill.tsx`)
- Pings `localhost:3000` and `https://api.whizpoint.app` every 8 seconds.
- Displays connection latency (ms) and status indicator dot:
  - **Green**: Tunnel Active (sub-100ms latency, webhooks fully functional).
  - **Amber**: Local Server Only (Cloudflare tunnel unreachable, local checkout working).
  - **Red**: Disconnected (check host server status).

### Hardware Support
- **Thermal Printers**: ESC/POS 80mm & 58mm across USB, Network LAN, Bluetooth, Windows Spooler.
- **Barcode Scanners**: 1D/2D QR Handheld & Omnidirectional Presentation Scanners.
- **Cash Drawers**: RJ11 solenoid pulse kick on receipt completion.
- **Weight Scales**: RS-232 serial connection and price/weight-embedded scale barcodes.

---

## 9. KRA eTIMS VSCU Cryptographic Signing

- Direct integration with Virtual Sales Control Unit (VSCU).
- Inputs: KRA PIN, Branch ID, Device Serial Number, VSDC URL.
- On receipt completion:
  1. Signs invoice line items with SHA-256 cryptographic hash.
  2. Issues official KRA Control Unit Invoice Number (e.g., `MWZ00000293`).
  3. Prints scannable KRA QR Code directly on 80mm thermal receipt.

---

## 10. Hospitality & Restaurant Floor Architecture

- **Table Map & Guest Seating**: Visual floor management across Dining Room, Terrace, and Bar.
- **Open Running Tabs**: Track active unpaid customer balances across shifts.
- **Kitchen Order Tickets (KOT)**: Routes drink orders to Bar printer and food orders to Kitchen line printer.
- **Seat-Level Bill Splitting**: Split payments across cash, card, and M-Pesa on the same ticket.

---

## 11. Data Synchronization Protocols & Conflict Resolution

- **POSIX Delta Timestamps**: Every database record includes `createdAt` and `updatedAt`.
- **Resolution Strategy**: Last-Write-Wins (LWW) with server-side validation.
- **WebSocket Rooms**: Socket.io rooms segregated by `businessId` and `outletId`.
- **Transaction Atomicity**: SQLite WAL mode ensures completed sales are committed to disk before printing receipts.
