# Whiz POS - Complete System Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Marketing & Documentation Website (`pos.whizpoint.app`)](#marketing--documentation-website-poswhizpointapp)
   - [Landing Page](#landing-page)
   - [Documentation Section](#documentation-section)
   - [Contact & Sales Page](#contact--sales-page)
   - [SEO & Performance](#seo--performance)
3. [Back-Office System](#back-office-system)
   - [Global Admin Portal](#global-admin-portal)
   - [Business Admin Portal](#business-admin-portal)
   - [Manager Portal](#manager-portal)
   - [Cashier Portal](#cashier-portal)
   - [Authentication & Account Management](#authentication--account-management)
4. [Brevo Email Integration](#brevo-email-integration)
5. [POS Integration](#pos-integration)

---

## System Overview

**Domains**:
- **Marketing/Docs**: `pos.whizpoint.app` - Lives in `/website` directory, shares assets with POS
- **Back-Office API**: `api.pos.whizpoint.app` - Multi-tenant backend
- **POS Desktop App**: Existing Electron app

---

## Marketing & Documentation Website (`pos.whizpoint.app`)

### Directory Structure
```
/website
├── index.html                 # Landing page
├── docs/
│   ├── index.html            # Docs landing
│   ├── installation.html     # Installation guide
│   ├── features.html         # Feature guide
│   └── troubleshooting.html  # Troubleshooting
├── contact.html              # Contact/Sales page
├── assets/                   # Shared with main POS
│   ├── logo.png
│   ├── logo.ico
│   ├── logo.svg
│   └── images/
└── styles/
    └── main.css
```

---

### Landing Page (`/`)

#### Hero Section
- **Headline**: "Modern Point-of-Sale for Every Business"
- **Subheadline**: "Fast, reliable, and packed with features to grow your sales"
- **CTA Buttons**:
  - Primary: "Get Started Free"
  - Secondary: "View Demo"
- **Visual**: Hero image of POS in use

#### Feature Grid (6 Features)
1. **Offline-First**: Works without internet, syncs when connected
2. **Inventory Management**: Real-time stock tracking with low-stock alerts
3. **Multiple Payment Methods**: Cash, M-Pesa, Credit
4. **Sales Reports**: Daily, weekly, and monthly summaries
5. **Multi-User Support**: Cashiers, managers, and admins with permissions
6. **Credit Customers**: Track credit sales and payments

#### Social Proof
- **Testimonials**: 3-5 customer quotes with photos
- **Logos**: Show businesses using Whiz POS
- **Stats**: "1000+ Businesses", "5000+ Daily Transactions"

#### Footer
- Navigation links
- Contact info
- Social media links
- Privacy policy & Terms of service

---

### Documentation Section (`/docs`)

#### Sidebar Navigation (Persistent)
```
📚 Documentation
├── Getting Started
│   ├── Installation
│   ├── Setup Wizard
│   └── First Sale
├── Features
│   ├── Inventory Management
│   ├── Transactions
│   ├── Credit Customers
│   ├── Expense Tracking
│   ├── Reports
│   └── Loyalty Program
├── Back-Office
│   ├── Dashboard
│   ├── Syncing Data
│   └── API Integration
└── Help
    ├── Troubleshooting
    ├── FAQ
    └── Contact Support
```

#### Documentation Page Structure
- **Table of Contents** (right sidebar, auto-generated from headings)
- **Content** (clean, scannable sections)
- **Code Examples** (with syntax highlighting)
- **Screenshots** (where applicable)
- **Next/Previous** buttons

---

### Contact & Sales Page (`/contact`)

#### Contact Form (Brevo Integration)
**Fields**:
- Full Name (required)
- Email Address (required)
- Business Name
- Phone Number
- Message (required)

**On Submit**:
1. Validates all fields
2. Sends email via Brevo SMTP to `sales@pos.whizpoint.app`
3. Saves inquiry to back-office database
4. Shows success message: "Thank you! We'll get back to you within 24 hours."

#### Additional Info
- **Sales Email**: `sales@pos.whizpoint.app`
- **Phone**: +254 700 000 000
- **Business Hours**: Mon-Fri 8am-6pm EAT
- **Address**: Whizpoint Solutions, Nairobi, Kenya

---

### SEO & Performance

#### Meta Tags (All Pages)
```html
<title>Whiz POS - Modern Point-of-Sale System</title>
<meta name="description" content="Fast, reliable POS system with offline support, inventory management, and sales reports. Perfect for retail businesses.">
<meta name="keywords" content="POS, point of sale, cash register, inventory management, retail software">
<meta property="og:title" content="Whiz POS - Modern Point-of-Sale System">
<meta property="og:description" content="Fast, reliable POS system with offline support">
<meta property="og:image" content="https://pos.whizpoint.app/assets/og-image.png">
```

#### Schema Markup (Landing Page)
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Whiz POS",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Windows, macOS, Linux",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "KES"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "250"
  }
}
</script>
```

#### Core Web Vitals Optimization
- **Lazy Loading**: Images and iframes
- **Minification**: CSS, JS, HTML
- **CDN**: Host assets on CDN for fast delivery
- **Caching**: Browser caching for static assets
- **Responsive Images**: `srcset` for different screen sizes

---

## Back-Office System

### URL Pattern
- **Global Admin**: `pos.whizpoint.app/admin`
- **Business Portal**: `pos.whizpoint.app/dashboard`

---

### Global Admin Portal

#### Login
- **URL**: `/admin/login`
- **Credentials**: Global admin email (from `.env`)

#### Pages

##### 1. Dashboard (`/admin`)
- **Stats Cards**:
  - Total Businesses
  - Active Businesses
  - Total Users
  - Total Transactions (system-wide)
- **Charts**:
  - New businesses per month (line chart)
  - Active devices (bar chart)
- **Recent Activity**: Last 10 business signups

##### 2. Businesses Management (`/admin/businesses`)
- **Table**:
  - Business Name
  - Email Prefix
  - Registered Email
  - Status (Active/Inactive)
  - Created At
  - Actions
- **Actions**:
  - View Details
  - Edit Business
  - Deactivate/Activate
  - Regenerate API Key
- **Create New Business** Button: Opens modal with form

##### 3. Sales Inquiries (`/admin/inquiries`)
- **Table**:
  - Name
  - Email
  - Business Name
  - Message Preview
  - Status (New/Replied/Closed)
  - Date
- **Actions**:
  - View Inquiry
  - Reply (uses Brevo to send email)
  - Mark as Closed
- **Reply Modal**:
  - Pre-filled "To" (inquirer's email)
  - Subject line
  - Rich text editor
  - Send button

##### 4. Global Admins (`/admin/users`)
- **Table**:
  - Name
  - Email
  - Role
  - Last Login
  - Actions
- **Actions**:
  - Edit
  - Reset Password
  - Delete
- **Add Admin** Button

---

### Business Admin Portal

#### Login
- **URL**: `/login`
- **Email Format**: `{business-prefix}@pos.whizpoint.app` (e.g., `coffee_shop@pos.whizpoint.app`)
- **Password**: Numeric PIN or text password (both supported)

#### Pages

##### 1. Dashboard (`/dashboard`)
- **Stats Cards**:
  - Total Sales Today
  - Total Sales This Week
  - Total Sales This Month
  - Current Stock Value
  - Low Stock Items (count)
- **Charts**:
  - Sales Trend (last 7 days - line chart)
  - Payment Methods (pie chart: Cash/M-Pesa/Credit)
  - Top 5 Products (bar chart)
- **Recent Transactions**: Last 10 transactions with quick actions

##### 2. Transactions (`/transactions`)
- **Filters**:
  - Date Range (From/To)
  - Cashier
  - Payment Method
  - Status (Completed/Pending/Refunded)
- **Search**: By Transaction ID
- **Table**:
  - Transaction ID
  - Date & Time
  - Cashier
  - Items (count)
  - Total
  - Payment Method
  - Status
  - Actions
- **Actions**:
  - View Details (modal with full transaction breakdown)
  - Reprint Receipt
  - Reverse Transaction (marks as refunded, restores inventory)
  - Delete
- **Bulk Actions**: Export to CSV, Export to PDF

##### 3. Inventory Management (`/inventory`)
- **Filters**:
  - Category
  - Stock Status (In Stock/Low Stock/Out of Stock)
- **Search**: By Product Name
- **Table**:
  - Product Image
  - Product Name
  - Category
  - Price
  - Current Stock
  - Min Stock
  - Status
  - Actions
- **Actions**:
  - Edit Product
  - Delete Product
  - View Inventory Log (for that product)
- **Buttons**:
  - Add Product
  - Import Products (CSV)
  - Export Products (CSV)
- **Inventory Log Page** (`/inventory/logs`):
  - All stock changes
  - Product, Old Stock, New Stock, Variance
  - Cashier, Timestamp, Reason

##### 4. Users & Permissions (`/users`)
- **Table**:
  - Name
  - Email (for back-office users) / PIN (for POS users)
  - Role
  - Status (Active/Inactive)
  - Last Login
  - Actions
- **Roles**:
  - **Admin**: Full access to everything
  - **Manager**: Can view reports, manage inventory, view transactions
  - **Cashier**: Can only use POS (no back-office access)
- **Actions**:
  - Edit User
  - Reset PIN/Password
  - Deactivate/Activate
  - Delete
- **Add User** Button:
  - Name
  - Email (for back-office)
  - PIN (for POS, numeric only)
  - Role

##### 5. Credit Customers (`/customers`)
- **Table**:
  - Name
  - Phone
  - Total Credit
  - Paid Amount
  - Balance
  - Last Updated
  - Actions
- **Actions**:
  - View Details (full transaction history)
  - Record Payment
  - Edit Customer
  - Delete Customer
- **Add Customer** Button

##### 6. Expenses (`/expenses`)
- **Filters**:
  - Date Range
  - Category
  - Cashier
- **Table**:
  - Date
  - Description
  - Category
  - Amount
  - Cashier
  - Receipt (if uploaded)
  - Actions
- **Actions**:
  - View Details
  - Edit
  - Delete
- **Add Expense** Button
- **Export to CSV/PDF**

##### 7. Reports (`/reports`)
- **Available Reports**:
  1. **Daily Closing Report**: Cashier totals, payment breakdown, items sold
  2. **Monthly Summary**: Aggregated data (total sales, tax, cashier totals)
  3. **Tax Report**: Total tax collected per period
  4. **Inventory Report**: Stock levels, low stock items, inventory value
  5. **Cashier Performance**: Sales per cashier, transaction count
- **Filters**: Date Range, Cashier (where applicable)
- **Export**: All reports exportable to Excel (XLSX) and PDF

##### 8. Settings (`/settings`)
- **Business Profile**:
  - Business Name
  - Address
  - Phone
  - Email
  - Logo Upload
- **Tax & Currency**:
  - Tax Rate (%)
  - Currency (KES, USD, etc.)
- **Receipt Settings**:
  - Receipt Header
  - Receipt Footer
  - Show Print Preview
- **POS API**:
  - Current API Key (masked: `whiz_xxxx...xxxx`)
  - Regenerate API Key Button (with confirmation)
- **Notifications**:
  - Low Stock Alerts (email)
  - Daily Summary Email (yes/no)

---

### Manager Portal
Same as Business Admin, but with restricted access:
- ✅ Dashboard
- ✅ Transactions (view only, no reverse/delete)
- ✅ Inventory Management
- ✅ Credit Customers
- ✅ Expenses
- ✅ Reports
- ❌ Users & Permissions
- ❌ Settings (except personal password change)

---

### Cashier Portal
No back-office access - only POS application access.

---

### Authentication & Account Management

#### Login Page (`/login`)
**Fields**:
- Email Address
- Password/PIN (input type toggles based on input - numeric keypad available for PINs)
- Device Name (optional, for trusted devices)
- "Remember this device" checkbox

**Flow**:
1. User enters email + password/PIN
2. System checks if device is trusted
   - **Trusted**: Logs in directly, issues JWT
   - **Not Trusted**:
     - Generates 6-digit OTP
     - Sends OTP to registered email via Brevo
     - Shows OTP input modal
     - After OTP verification: trusts device, logs in

#### Forgot Password (`/forgot-password`)
**Fields**:
- Email Address

**Flow**:
1. User enters email
2. System checks if email exists
3. Sends password reset link via Brevo
4. Link expires after 1 hour
5. Success message: "Password reset link sent to your email"

#### Reset Password (`/reset-password?token=xxx`)
**Fields**:
- New Password
- Confirm New Password

**Rules**:
- At least 6 characters
- Numeric PINs allowed
- Must match confirmation

#### Change Password (Logged In)
**Location**: User menu → Change Password

**Fields**:
- Current Password
- New Password
- Confirm New Password

#### Change Email (Logged In)
**Location**: User menu → Account Settings

**Fields**:
- New Email Address
- Current Password

**Flow**:
1. User enters new email + password
2. System sends verification link to new email
3. User clicks link to confirm
4. Email updated

---

## Brevo Email Integration

### Setup
1. **API Key**: Store in `.env` as `BREVO_API_KEY`
2. **Sender Email**: Verified in Brevo (e.g., `no-reply@pos.whizpoint.app`)

### Email Types Sent

#### 1. Sales Inquiry Notification
- **To**: `sales@pos.whizpoint.app`
- **From**: `no-reply@pos.whizpoint.app`
- **Subject**: New Sales Inquiry from {Name}
- **Body**: Full inquiry details

#### 2. OTP Verification
- **To**: User's email
- **From**: `no-reply@pos.whizpoint.app`
- **Subject**: Your Whiz POS Verification Code
- **Body**: 6-digit OTP, expires in 10 minutes

#### 3. Password Reset
- **To**: User's email
- **From**: `no-reply@pos.whizpoint.app`
- **Subject**: Reset Your Whiz POS Password
- **Body**: Reset link, expires in 1 hour

#### 4. Email Change Confirmation
- **To**: New email address
- **From**: `no-reply@pos.whizpoint.app`
- **Subject**: Confirm Your Email Change
- **Body**: Confirmation link

#### 5. Sales Inquiry Reply (From Admin)
- **To**: Inquirer's email
- **From**: `sales@pos.whizpoint.app`
- **Subject**: Re: Your Inquiry About Whiz POS
- **Body**: Admin's reply

---

## POS Integration

### Configuration in POS App
**Business Setup Page**:
- Back-Office URL: `https://api.pos.whizpoint.app`
- API Key: (from business settings in back-office)

### Sync Flow
1. **POS is Online**: Auto-syncs every 5 minutes
2. **Transaction Completed**: Syncs immediately
3. **Product/Inventory Changed**: Syncs immediately
4. **POS Comes Online**: Pulls all latest changes from back-office

For full API details, see `API_INTEGRATION_GUIDE_FINAL.md`
