# Upgrade Whiz POS for Supermarket Scale (Enterprise Specification)

This document serves as the **Master Architectural Plan** for upgrading the Whiz POS system into a high-performance, modular, enterprise-grade application capable of running supermarkets and multi-lane retail operations.

## User Review Required

> [!IMPORTANT]
> I have merged your comprehensive specification into this master plan. Please review this finalized scope. If everything looks perfect, click **Approve** and we will generate the `task.md` checklist and begin the coding phase!

---

## 1. Cloud & API Infrastructure

All cloud operations, backend databases, callbacks, and APIs will be strictly routed through **`whizpos.whizpoint.app`**. 

This includes:
- Multi-Tenant Account Management (data isolated by `tenant_id` per business).
- Multi-outlet and multi-warehouse synchronization.
- M-Pesa Webhook Callbacks (for C2B automatic detection).
- KRA eTIMS API routing and payload formatting.

---

## 2. System Setup, User Roles & Device Initialization

*   **First-Run Setup Wizard & Device Roles:** The app will prompt on first boot to assign a persistent **Device Role** (saved in `config.json`):
    *   **Cashier Terminal:** High-speed scanning UI; restricted back-office access.
    *   **Manager / Back-Office Station:** Access to stock, reports, shift audits.
    *   **Hybrid Mode:** Combined register and back-office tabs.
*   **Role-Based Access Control (RBAC):** Granular permissions. High-risk actions (voids, price overrides, manual cash drawer opens) require a Manager PIN or approval override.

---

## 3. Universal Checkout Engine & Register Workflows

*   **Continuous HID Barcode Scanning:** Automatic cart update on barcode scan without requiring manual cursor focus.
*   **Suspended Sales (Park & Resume):** Cashiers can "Park" an active cart and retrieve it later (even on another register within the local network).
*   **Quick-Search & Touch Grid:** Fast manual item search or visual touch category grid.
*   **Quantity Adjustments, Line Discounts, & Price Overrides** (subject to RBAC).
*   **Customer Identification:** Quick lookup by phone number/name, linking transactions to profiles for credit tracking.

---

## 4. Comprehensive Payment Gateway (Modular Engine)

All payment methods will be modular and toggleable.

*   **Cash Processing & Drawer Control:**
    *   Auto-Pulse Trigger (via printer kick codes).
    *   Manual Drawer Open (Manager PIN required).
    *   Drawerless Mode (for shops without physical drawers).
*   **Card Payment Processing:**
    *   **Integrated Gateway:** API integration (e.g., Paystack) for seamless approval tokens.
    *   **Standalone PDQ Mode:** Manual input of bank terminal reference codes.
    *   **Sandbox Mode:** For developer testing without real funds.
*   **Mobile Money Processing (M-Pesa strictly on `whizpos.whizpoint.app`):**
    *   **C2B Auto-Detection:** Safaricom API hits the backend callback. The POS receives WebSocket alerts (*"Payment Received... [Ref: XXX]"*) for 1-click cart matching.
    *   **STK Push:** Cashier enters a phone number and pushes a PIN prompt instantly to the customer's phone.
*   **Split Payments:** e.g., KES 1,000 Cash + KES 2,500 M-Pesa.
*   **Store Credit / Debt Accounting:** Dedicated "Customer Debt Settlement" screens.

---

## 5. Hardware & Peripheral Abstraction Layer

*   **Scanners:** Support for USB/Bluetooth HID keyboard emulation.
*   **Digital Scales:** Support for RS232/USB digital scale integration for live weights, and parsing weight-embedded EAN-13 barcodes (starting with `20`).
*   **Thermal Printers:** Support for 58mm/80mm ESC/POS printers via USB, LAN, or Bluetooth, printing standard templates with QR codes and KRA CU numbers.

---

## 6. KRA eTIMS (iTax) Tax Compliance Engine

*   **Software VSCU Integration:** Direct REST API integration via the central server (no physical ETR hardware needed).
*   **Offline Cryptographic Signing:** When internet drops, the local POS uses pre-downloaded keys to sign tax receipts locally (generating sequential offline invoice numbers and valid QR codes).
*   **Asynchronous Queue Syncing:** Offline records queue as `PENDING_TAX_SYNC` and automatically upload to KRA when the internet reconnects, updating to `SYNCED`.

---

## 7. Supermarket Operations, Inventory & Audit Controls

*   **Inventory & FIFO Batch Management:** Real-time adjustments, expiration date tracking (with auto-markdown options), and Parent-Child unit conversion (e.g., crates to singles).
*   **Automated Promos:** Buy-One-Get-One (BOGO), Mix-and-Match, and Time-Based Flash Sales.
*   **Loss Prevention & Shift Audits:** 
    *   **Blind Shift Reconciliation:** Cashiers close their shift by typing physical cash counts *without* seeing the system's expected total. Managers review discrepancies later.
    *   **Mid-Shift Safe Drops:** Transferring cash from register to main safe.
*   **Procurement:** Automated Purchase Orders (PO) for low stock and Goods Received Notes (GRN) logging.

---

## 8. Digital Communication Engine

*   **WhatsApp Business API (Optional):** Send interactive digital PDF receipts/invoices directly to the customer's WhatsApp at checkout.
*   **Email Invoicing (Optional):** Automated HTML invoices with attached PDFs for B2B accounts and monthly statement runs.
