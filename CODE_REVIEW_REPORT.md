# Comprehensive Code Review & Recommendations Report

This report outlines bugs, UX/UI improvements, architectural considerations, and market-fit recommendations tailored for the Kenyan supermarket environment, analyzing the Desktop POS Terminal (`src/`), Webportal (`webportal/`), and Local Server (`local-server/`).

## 1. POS Terminal (`src/` - React/Electron)

### 1.1 Bug Observations & Fixes
- **State Management (Zustand)**: `addToCart` handles item incrementing, but `removeFromCart` fully drops the item rather than decrementing by 1 (unless `updateQuantity` is used via the UI). The UX might suffer if users expect tapping/scanning again to undo a mistake rather than jumping to a specific quantity adjustor.
- **Sync Architecture**: `pullDeltaFromServer` and `pushDataToServer` in `posStore.ts` show good intention for delta syncing but lack robust conflict resolution (e.g., LWW - Last Writer Wins) for offline edits (e.g., updating a product's price offline while it was changed on the cloud). It relies entirely on `NetworkClient` which currently routes strictly to `LAN_ADMIN` rather than allowing hybrid cloud fallback.
- **Data Persistence**: Heavy reliance on `saveDataToFile` synchronously dumping arrays to local JSON via Electron IPC. As `transactions.json` or `inventoryLogs.json` grow, JSON serialization and IPC payload limits could crash the app or cause significant UI thread blocking. Moving to a local SQLite-backed store via IPC (which seems partially implemented in `sqlite-db.cjs`) is critical.

### 1.2 UX/UI Enhancements for Kenyan Market
- **M-Pesa Integration Visibility**: The M-Pesa STK push and C2B listener is a great feature, but the POS needs a prominent, always-visible network/API status indicator for Safaricom. Cashiers need to know instantly if Safaricom's API is down so they can request manual payment instead of attempting STK pushes.
- **Offline Mode Indicator**: When the internet drops, an unmistakable banner should appear (e.g., "⚠️ Operating Offline - Local Sync Only").
- **Keyboard Shortcuts**: Supermarkets rely on speed. Ensure `F1` (Payment), `F2` (Search), `F4` (Park/Suspend Cart), and `F8` (Clear) are globally accessible. The current `useKeyboardShortcuts.ts` only has `F8` and `F12`.
- **EAN-13 Weight Embedded Barcodes**: Essential for the butchery/deli section. The barcode scanner hook needs to parse prefix `20` (e.g., `20PPPPPWWWWWC`) to dynamically add weighted items to the cart rather than treating the whole barcode as a static SKU.
- **Cart Suspension (Park Cart)**: Cashiers frequently need to park a cart when a customer forgets an item and runs back to the aisle. A "Park Cart" and "Resume Cart" feature is essential to keep the queue moving.

## 2. Local Server (`local-server/`)

### 2.1 Bug Observations & Fixes
- **Concurrency & Locking**: If multiple POS terminals try to sync data simultaneously, SQLite's default lock mechanism might throw `SQLITE_BUSY`. Ensure WAL (Write-Ahead Logging) mode is enabled (`PRAGMA journal_mode=WAL;`) in the SQLite database connection.
- **Error Handling**: The server needs graceful restarts if the network interface changes (e.g., switching from Ethernet to Wi-Fi).

### 2.2 Architectural Improvements
- **Local Network Discovery (mDNS)**: Ensure Bonjour/mDNS service broadcasting is robust across Windows firewalls, which notoriously block UDP port 5353. Provide a manual IP override option in the UI for terminals that fail to auto-discover the local server.
- **Tax (KRA eTIMS) Queueing**: If KRA is offline, receipts must still print. Ensure the `etims_queue` table reliably retries failed POST requests to the VSCU in the background without blocking the main event loop.

## 3. Webportal (`webportal/`)

### 3.1 Bug Observations & Fixes
- **Data Hydration**: Bulk Excel uploads (`exceljs`) can easily cause race conditions if multiple admins upload stock sheets simultaneously. Implement database transactions or a locking mechanism during bulk imports.
- **Delta API Performance**: The `/api/sync/delta` endpoint fetching all records `since` a timestamp can become a slow query if tables grow into the millions. Ensure `updatedAt` columns are properly indexed in PostgreSQL.

### 3.2 Feature Enhancements
- **Multi-Branch Visibility**: The dashboard should clearly differentiate aggregate vs branch-specific metrics. A "Store Switcher" dropdown at the top navigation level would improve UX.
- **Role-Based Access Control (RBAC)**: Ensure `SUPERVISOR` vs `SYSTEM_ADMIN` roles are strictly enforced at the API layer, not just hidden in the React UI.
- **Loss Prevention Logs**: Expose the manual drawer pops, voided items, and parked carts that were never completed as a high-priority "Audit Report" for store owners.

## Conclusion & Next Steps
The system's offline-first architecture is excellent for the Kenyan market, where internet reliability fluctuates. To reach enterprise scale, the immediate focus should be shifting local storage strictly to SQLite (moving away from JSON file dumps), implementing the EAN-13 weight parser, and adding cart suspension to maximize checkout throughput.

## 3. Webportal (`webportal/`) - Additions

### 3.1 Bug Observations & Fixes (Continued)
- **Excel Uploads (Race Conditions)**: The `POST /import/products` endpoint in `webportal/server/routes/inventory.ts` iterates through rows synchronously calling `prisma.product.update` or `create`. If a file has 10,000 products, this will take a long time and tie up the connection pool. This should be refactored to use `prisma.$transaction` and bulk operations (`createMany`, `updateMany` or raw `ON CONFLICT DO UPDATE`) to prevent DB locks and timeout errors on large supermarkets.

### 3.2 UI/UX for Kenyan Supermarkets (Continued)
- **M-Pesa Reconciliation Dashboard**: The `MpesaReconciliation.tsx` needs clear visual alerts for "Unlinked" transactions (where the money arrived via C2B but the cashier hasn't closed a matching cart). In a busy Kenyan supermarket, this is the #1 cause of cash discrepancies at end-of-day.
