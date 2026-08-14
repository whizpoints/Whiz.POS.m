# Whiz POS Enterprise Upgrade & Architecture Tasks (v2.0 Complete)

## Overview & Modular Architecture Philosophy
This document details the complete task breakdown for upgrading Whiz POS to an enterprise-grade, multi-tenant POS system. 

**Core Requirement:** All hardware dependencies, payment modes, tax modules, and messaging features MUST be completely modular and toggleable via the settings panel. If a merchant operates without a physical cash drawer, scale, card terminal, or active internet connection, the system must continue to operate flawlessly without error.

---

## Phase 1: Data Model, RBAC & Core Setup
- `[x]` **Enterprise Data Schemas (`src/types/index.ts`)**:
  - Products: Barcode/SKU, tax category, unit type, batch number, expiry date, parent/child packaging relations, low-stock threshold.
  - Transactions: Unique ID, customer link, subtotal, tax breakdown, discount details, payment allocations, KRA eTIMS status (`SYNCED`, `PENDING_TAX_SYNC`), cashier user ID.
  - Immutable General Ledger (`ledger_entries`): Entry ID, transaction ID, tenant ID, account type (`CASH`, `MPESA`, `CARD`, `CREDIT`), debit/credit amounts, external reference, payer name, timestamp.
- `[x]` **SQLite Schema & Migration Engine (`sqlite-db.cjs`)**:
  - Write migration scripts for new tables (`products`, `sales`, `ledger_entries`, `etims_queue`, `shift_reconciliations`, `purchase_orders`).
  - Index barcode, SKU, transaction date, and payment status columns for high-speed queries.
- `[x]` **First-Run Device Setup Wizard**:
  - UI wizard prompting user to select **Device Role** (`CashierTerminal`, `BackOfficeMode`, or `HybridMode`).
  - Save persist data to local `config.json`.
- `[x]` **Role-Based Access Control (RBAC)**:
  - Define user roles: `CASHIER`, `SUPERVISOR`, `STORE_MANAGER`, `SYSTEM_ADMIN`.
  - Build reusable `ManagerPinModal.tsx` middleware component to block sensitive operations (item voids, cart cancellations, price overrides, manual cash drawer pop) until authorized.

---

## Phase 2: Complete Settings & Configuration Engine (`SettingsPage.tsx`)
Build a centralized settings panel organized into tabbed sections:

- `[x]` **Hardware & Peripherals Settings**:
  - Cash Drawer Mode: `Disabled / Drawerless`, `Auto-Pulse on Cash Sale`, `Manual Manager Button Only`.
  - Scale Mode: `Disabled`, `Manual Weight Input`, `USB/Serial Auto-Read (RS232)`, `Weight-Embedded Barcode Parser (Prefix 20)`.
  - Receipt Printing Mode: `Auto-Print on Sale`, `Print on Request`, `Digital Only (WhatsApp/Email)`. Select printer channel (`USB`, `Network IP`, `Bluetooth`).
- `[x]` **Payment Gateway Settings**:
  - Payment Method Switches: Independent toggles for Cash, M-Pesa, Card, and Store Credit.
  - M-Pesa Setup: Environment toggle (`Sandbox` / `Live`), Shortcode/Till Number, Consumer Key, Consumer Secret, Passkey, Callback Domain.
  - Card Processing Setup: Mode toggle (`Standalone PDQ Entry` vs `Integrated Smart Terminal API`), Gateway Provider selection (`Paystack`, `Flutterwave`, `Bank API`), Terminal IP/Port configuration.
  - **Developer Card Simulator Switch**: Toggle to enable/disable fake card terminal responses for offline testing without physical PDQ hardware.
- `[x]` **KRA eTIMS Settings**:
  - Environment toggle (`Sandbox` / `Live`).
  - Input fields for KRA PIN, Branch ID, Device Serial Number (e.g., `WhizpointPOS-VSCU-002`), VSCU Security Keys, and Integration Token.
- `[x]` **Digital Receipts & Messaging Settings**:
  - WhatsApp Business API Key, Phone Number ID, and Template ID fields.
  - Email SMTP credentials for B2B invoice dispatches.

---

## Phase 3: Dedicated Back-Office & Admin Views
Build dedicated web/desktop views for complete store management:

- `[x]` **Executive Dashboard (`DashboardPage.tsx`)**:
  - Real-time sales metrics, payment method revenue breakdown (Cash vs M-Pesa vs Card), low-stock count, and top-performing SKUs.
- `[x]` **Inventory & Batch Management (`InventoryPage.tsx`)**:
  - CRUD interface for product catalog.
  - Batch number & Expiry date tracking view with automated "Nearing Expiry" warnings.
  - Parent-Child Unit conversion setup (e.g., 1 Box = 24 Units).
  - Bulk Product CSV import and export modules.
- `[x]` **Procurement & Goods Received (`ProcurementPage.tsx`)**:
  - Purchase Order (PO) creation and supplier management.
  - Goods Received Notes (GRN) processing to scan incoming deliveries, adjust stock levels, and update supplier accounts payable ledgers.
- `[x]` **Financial Ledger & Accounting (`FinancialLedgerPage.tsx`)**:
  - Chart of Accounts (Assets, Liabilities, Equity, Revenue, Expenses).
  - Double-entry Journal Entry logging and Profit & Loss (P&L) Statement generation.
  - Customer Credit & Debt Settlement screen to view debt balances and record partial/full repayments.
- `[x]` **Shift History & Loss Prevention (`ShiftAuditPage.tsx`)**:
  - Blind Shift Reconciliation screen (Cashier inputs physical drawer counts; system calculates and logs variance against expected totals).
  - High-Risk Activity Logs: Track manual Cash Drawer opens (without a sale), Voided Transactions, and aggressive manual discounts. logs (tracks every void, cancellation, and manual drawer pop with timestamps and manager IDs).
- `[x]` **eTIMS Tax Audit Monitor (`eTIMSManagementPage.tsx`)**:
  - Status monitor for offline tax queue (`PENDING_TAX_SYNC` vs `SYNCED`).
  - Manual "Force Re-sync" trigger button for offline invoice queues.

---

## Phase 2: POS Terminal & Sync Refinement (Steps 3 & 4)
- [x] **Step 3: Back Office UI Updates**
  - [x] Update `ProductModal.tsx` for Category & Outlet selection.
  - [x] Update `StaffModal.tsx` for PIN & Outlet assignment.
  - [x] Fix remaining CRUD actions (`frontend_dev` subagent):
    - [x] `Staff.tsx`
    - [x] `Customers.tsx`
    - [x] `Suppliers.tsx`
    - [x] `Settings.tsx` (Outlets)
- [x] **Step 4: POS Terminal UI Updates**
  - [x] Review `LoginScreen.tsx` to verify 4-digit PIN authentication works with synced data.
  - [x] Update `posStore.ts` to sync using `/api/sync/delta` so the terminal receives only users and products assigned to its `outletId`.
  - [x] Verify terminal logic correctly references `outletId` (synced via `networkSetup.apiKey`).

---

## Phase 4: Universal Checkout & Register Workflows
- `[ ]` **High-Speed UI Refactor (`OrderArea.tsx`, `ProductGrid.tsx`)**:
  - Shortcut key listeners (e.g., `F1` for Payment, `F2` for Search, `F4` for Park Cart, `ESC` to Clear).
  - Global listener for USB/Bluetooth HID Barcode Scanners (auto-add scanned item to cart without requiring cursor focus in a text field).
  - EAN-13 weight-embedded barcode parser for produce starting with prefix `20`.
- `[ ]` **Cart Operations**:
  - Suspend and Resume (Park Cart) functionality accessible across local network registers.
  - Line-item adjustments (quantity, percentage/fixed discounts, manual price overrides) with manager PIN prompts.
  - Cart voiding with mandatory audit reason logging.
  - Customer lookup and link to cart.

---

## Phase 5: Modular Payment Processing Engine
- `[ ]` **Cash Module**:
  - Tendered amount input with automated change calculation in high-visibility text.
  - Trigger cash drawer pulse on completed sale (if enabled in Settings).
  - Manual manager cash drawer button with audit log entry.
- `[ ]` **M-Pesa Module**:
  - STK Push UI prompt: Enter customer phone number, fire push, and hold pending state.
  - C2B Automated Callback Listener: POS WebSocket listener that auto-pops a payment confirmation toast when Safaricom sends a C2B Till payment payload (*"Payment received from [Name] - KES [Amount]"*), allowing 1-click matching to active cart.
  - Fallback manual M-Pesa reference input box for offline/delayed callbacks.
- `[ ]` **Card Payment Module**:
  - Standalone Mode: Entry box for bank receipt reference numbers.
  - Integrated Smart Terminal Listener: Local IP/WebSocket API client that sends the cart total to a smart card terminal and waits for an electronic approval callback.
  - Simulator Fallback: If "Terminal Simulator" is ON in Settings, mock an asynchronous payment approval for developer testing.
- `[ ]` **Split Payments & Ledger Integration**:
  - Allow cart totals to be split across multiple payment types (e.g., KES 500 Cash + KES 1,500 M-Pesa).
  - Commit balanced DEBIT/CREDIT rows to `ledger_entries` for every finalized sale.

---

## Phase 6: KRA eTIMS Tax Compliance Engine
- `[ ]` Build local cryptographic signing utility using VSCU security keys for offline invoice signing.
- `[ ]` Generate thermal receipt QR codes containing eTIMS verification metadata and control codes.
- `[ ]` Build an asynchronous worker process that monitors internet connection and uploads queued `PENDING_TAX_SYNC` records to the KRA REST API.
- `[ ]` Format ESC/POS thermal receipt templates to include KRA Control Unit details and QR code graphics.

---

## Phase 7: Supermarket Operations & Rules Engine
- `[ ]` FIFO Inventory Deduction: Automatically deduct stock from the oldest unexpired batch.
- `[ ]` Automated Promotions Engine: Process rules for Buy-One-Get-One (BOGO), Mix-and-Match category bundles, and schedule-based flash sales during cart calculation.
- `[ ]` Parent-Child Inventory Sync: Deduct single items from master bulk inventory units seamlessly.

---

## Phase 8: Digital Receipts & Auto-Updater
- `[ ]` **Digital Receipts**:
  - Integrate WhatsApp Business API to dispatch PDF receipts/invoices on customer request.
  - Integrate SMTP email service to dispatch B2B account statements and invoices.
- `[ ]` **Desktop App Auto-Updater**:
  - Build startup version-gate module checking central API `/api/v1/check-version`.
  - Block UI and display a mandatory progress modal if an essential update is available, automatically downloading and applying the update before launch.

---

## Phase 9: Multi-Tenant Cloud Central Back-Office (`whizpos.whizpoint.app`)
- `[ ]` Implement Multi-Tenant PostgreSQL database architecture utilizing explicit `tenant_id` row-level isolation.
- `[ ]` Expose secure Webhook endpoints for Safaricom M-Pesa C2B payment callbacks.
- `[ ]` Establish WebSocket hub-and-spoke sync service for multi-store stock updates and remote manager monitoring.
