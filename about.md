# Whiz POS - Complete Documentation

## Table of Contents
1. [Introduction](#introduction)
2. [Project Overview](#project-overview)
3. [Key Features](#key-features)
4. [Importance of Whiz POS](#importance-of-whiz-pos)
5. [System Architecture](#system-architecture)
6. [Getting Started](#getting-started)
7. [Installation Guide](#installation-guide)
8. [Setup Wizard](#setup-wizard)
9. [How to Use](#how-to-use)
10. [Features in Detail](#features-in-detail)
11. [Technical Specifications](#technical-specifications)
12. [Troubleshooting](#troubleshooting)
13. [Support & Contact](#support--contact)

---

## Introduction

**Whiz POS** is a modern, robust, and feature-rich Point-of-Sale (POS) application developed by Whizpoint Solutions. Designed to cater to the needs of small and medium-sized businesses, Whiz POS offers a comprehensive solution for managing sales, inventory, customers, and expenses with ease and efficiency.

Built on cutting-edge technology, Whiz POS combines the power of a desktop application with offline-first capabilities, ensuring that your business operations continue seamlessly even without an internet connection. With its intuitive user interface and extensive feature set, Whiz POS empowers businesses to streamline their operations, improve customer service, and gain valuable insights into their performance.

---

## Project Overview

### What is Whiz POS?
Whiz POS is a cross-platform desktop application built using Electron, React, and TypeScript. It serves as a complete POS system that handles everything from product management and sales transactions to inventory tracking and reporting.

### Vision
To become the leading POS solution for small and medium businesses, providing affordable, reliable, and feature-packed software that simplifies daily operations and drives growth.

### Mission
To empower businesses with tools that enhance efficiency, accuracy, and profitability through innovative technology and exceptional user experience.

### Target Audience
- Retail stores
- Restaurants and cafes
- Grocery shops
- Boutiques
- Service-based businesses
- Any business that needs a reliable POS system

---

## Key Features

### Core POS Functionality
- **Fast Checkout**: Quick and easy transaction processing
- **Multiple Payment Methods**: Cash, M-Pesa, and Credit sales
- **Barcode Scanner Integration**: Support for barcode scanners for rapid product entry
- **Receipt Printing**: Thermal and standard printer support with customizable templates
- **Cart Management**: Add, remove, and update items in the cart

### Inventory Management
- **Product Catalog**: Manage products with details like name, price, category, image, and stock levels
- **Stock Tracking**: Real-time inventory updates with low-stock alerts
- **Stock Management**: Add, edit, and delete products
- **Import/Export**: CSV import and export for bulk product management

### Customer Management
- **Credit Customers**: Track credit sales and payments
- **Customer Profiles**: Store customer information and transaction history
- **Loyalty Program**: Reward loyal customers (if enabled)

### Expense Tracking
- **Expense Entry**: Record business expenses with categories
- **Expense History**: View and manage past expenses
- **Receipt Attachments**: Attach receipts to expense entries

### Reporting & Analytics
- **Daily Closing Report**: End-of-day summary with sales totals and payment breakdown
- **Sales Reports**: Daily, weekly, and monthly sales summaries
- **Inventory Reports**: Stock levels, low-stock items, and inventory value
- **Cashier Performance**: Track sales per cashier
- **Charts & Visualizations**: Interactive charts for sales trends and analytics

### Multi-User Support
- **Role-Based Access**: Admin, Manager, and Cashier roles with different permissions
- **User Management**: Add, edit, and delete users
- **PIN Authentication**: Secure login with PIN codes

### Offline-First Capabilities
- **Offline Operation**: Works without internet connection
- **Auto-Sync**: Automatically syncs data when internet is available
- **Data Persistence**: Local SQLite database for reliable data storage

### Multi-Outlet Support
- **Multiple Locations**: Manage multiple outlets from a single system
- **Centralized Data**: Sync data across all outlets

### Customization
- **Business Setup**: Customize business details, tax rates, and currency
- **Receipt Customization**: Customize receipt headers and footers
- **Printer Settings**: Configure printer type and paper width

### Additional Features
- **Auto-Logout**: Security feature to automatically log out inactive users
- **On-Screen Keyboard**: For touchscreen devices
- **Dark/Light Theme**: Customizable UI theme
- **Data Backup & Restore**: Backup and restore your data

---

## Importance of Whiz POS

### For Business Owners
1. **Efficiency**: Streamlines daily operations, saving time and reducing errors
2. **Insights**: Provides valuable data and reports to make informed decisions
3. **Cost-Effective**: Affordable alternative to expensive POS systems
4. **Scalability**: Grows with your business with multi-outlet support
5. **Reliability**: Offline-first ensures operations continue even without internet

### For Cashiers
1. **Ease of Use**: Intuitive interface that's easy to learn and use
2. **Speed**: Fast checkout process reduces customer wait times
3. **Accuracy**: Minimizes human errors in transactions
4. **Convenience**: Barcode scanner and on-screen keyboard support

### For Customers
1. **Faster Service**: Quick checkout process improves customer experience
2. **Multiple Payment Options**: Flexible payment methods
3. **Professional Receipts**: Customizable, professional-looking receipts
4. **Credit Facilities**: Option for credit sales (where applicable)

---

## System Architecture

### Technology Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Electron, Node.js
- **Database**: SQLite (local), MongoDB (cloud/back-office)
- **Build Tool**: Vite
- **UI Components**: Headless UI, Lucide React
- **State Management**: Zustand
- **Charts**: Chart.js, React-Chartjs-2
- **PDF Generation**: jsPDF, jsPDF-AutoTable
- **Printing**: Electron-POS-Printer
- **Other**: Express, Better-SQLite3, Mongoose

### Architecture Overview
```
Whiz POS System
├── Desktop Application (Electron)
│   ├── Frontend (React + TypeScript)
│   │   ├── Components
│   │   ├── Pages
│   │   ├── Hooks
│   │   └── Store (Zustand)
│   └── Backend (Node.js + Express)
│       ├── SQLite Database
│       ├── Printer Integration
│       └── API Handlers
├── Back-Office System (Optional)
│   ├── Web Dashboard
│   ├── MongoDB Database
│   └── REST API
└── Marketing Website (Optional)
    ├── Landing Page
    └── Documentation
```

### Data Storage
- **Local Storage**: SQLite database for offline operation
- **Cloud Storage**: MongoDB for multi-outlet and back-office sync
- **File Storage**: JSON files for initial setup and templates

---

## Getting Started

### Prerequisites
- **Operating System**: Windows 10 or later (macOS and Linux support coming soon)
- **Node.js**: Version 24.11.0 or later (for development)
- **Hardware**: 
  - Thermal or standard receipt printer (optional)
  - Barcode scanner (optional)
  - Cash drawer (optional)

### System Requirements
- **Processor**: 1 GHz or faster
- **RAM**: 2 GB minimum, 4 GB recommended
- **Storage**: 500 MB available space
- **Display**: 1024x768 resolution or higher

---

## Installation Guide

### Step 1: Download Whiz POS
1. Visit the Whiz POS website at `pos.whizpoint.app`
2. Navigate to the Downloads section
3. Download the latest version of Whiz POS for Windows

### Step 2: Install Whiz POS
1. Locate the downloaded installer file (`WHIZ POS Setup X.X.X.exe`)
2. Double-click the installer to run it
3. Follow the installation wizard:
   - Click "Next" to continue
   - Read and accept the license agreement
   - Choose the installation directory (default is recommended)
   - Click "Install" to begin installation
   - Wait for the installation to complete
   - Click "Finish" to launch Whiz POS

### Step 3: First Launch
1. When you launch Whiz POS for the first time, you'll be greeted by the Setup Wizard
2. Follow the Setup Wizard to configure your business (see [Setup Wizard](#setup-wizard) section)

---

## Setup Wizard

The Setup Wizard guides you through configuring your business for the first time.

### Step 1: Business Information
- **Business Name**: Enter your business name
- **Address**: Enter your business address
- **Phone**: Enter your business phone number
- **Email**: Enter your business email address

### Step 2: Tax & Currency
- **Tax Rate**: Enter your tax rate (e.g., 16 for 16%)
- **Currency**: Select your currency (e.g., KES, USD)

### Step 3: Receipt Settings
- **Receipt Header**: Enter text to appear at the top of receipts
- **Receipt Footer**: Enter text to appear at the bottom of receipts
- **Printer Type**: Select "thermal" or "standard"
- **Printer Paper Width**: Enter the paper width in mm (e.g., 80)

### Step 4: M-Pesa Settings (Optional)
- **Paybill Number**: Enter your M-Pesa Paybill number
- **Till Number**: Enter your M-Pesa Till number
- **Account Number**: Enter your M-Pesa account number (for Paybill)

### Step 5: Create Admin User
- **Name**: Enter the admin's name
- **PIN**: Create a secure PIN (4-6 digits)
- **Confirm PIN**: Re-enter the PIN to confirm

### Step 6: Complete Setup
- Review your settings
- Click "Complete Setup" to finish

---

## How to Use

### Logging In
1. Launch Whiz POS
2. On the login screen, select your user from the dropdown
3. Enter your PIN
4. Click "Login"

### Making a Sale
1. **Add Items to Cart**:
   - Click on products in the product grid, or
   - Use the barcode scanner to scan items, or
   - Search for products using the search bar
2. **Adjust Quantities**: Click on items in the cart to adjust quantities
3. **Checkout**:
   - Click the "Checkout" button
   - Select payment method (Cash, M-Pesa, or Credit)
   - For Cash: Enter amount tendered, click "Complete Sale"
   - For M-Pesa: Enter phone number and M-Pesa code, click "Complete Sale"
   - For Credit: Select credit customer, click "Complete Sale"
4. **Print Receipt**: The receipt will print automatically (if enabled)

### Managing Inventory
1. Go to **Inventory** from the main menu
2. **Add Product**:
   - Click "Add Product"
   - Fill in product details (name, price, category, stock, etc.)
   - Click "Save"
3. **Edit Product**:
   - Click on a product to edit
   - Update details
   - Click "Save"
4. **Delete Product**:
   - Click on a product
   - Click "Delete"
   - Confirm deletion

### Managing Credit Customers
1. Go to **Credit Customers** from the main menu
2. **Add Customer**:
   - Click "Add Customer"
   - Enter customer name and phone
   - Click "Save"
3. **Record Payment**:
   - Click on a customer
   - Click "Record Payment"
   - Enter payment amount
   - Click "Save"

### Tracking Expenses
1. Go to **Expenses** from the main menu
2. **Add Expense**:
   - Click "Add Expense"
   - Enter description, amount, and category
   - Optionally attach a receipt
   - Click "Save"

### Viewing Reports
1. Go to **Reports** from the main menu
2. Select the report you want to view:
   - Daily Closing Report
   - Sales Reports
   - Inventory Reports
   - Cashier Performance
3. Apply filters (date range, cashier, etc.) as needed
4. Export to PDF or Excel if needed

### Daily Closing
1. At the end of the day, go to **Daily Closing** from the main menu
2. Review the closing report
3. Click "Close Day" to finalize
4. Print the closing report if needed

---

## Features in Detail

### Product Management
- **Product Details**: Each product has:
  - ID
  - Name
  - Price
  - Category
  - Image
  - Stock quantity
  - Minimum stock level
  - Availability status
- **Categories**: Organize products into categories for easy navigation
- **Low Stock Alerts**: Get notified when stock falls below minimum level
- **Bulk Import/Export**: Import products from CSV or export to CSV

### Transaction Processing
- **Transaction Details**: Each transaction records:
  - Transaction ID
  - Timestamp
  - Items sold
  - Subtotal
  - Tax
  - Total
  - Payment method
  - Cashier
  - Credit customer (if applicable)
  - Status (completed/pending/refunded)
  - Amount tendered and change (for cash)
  - M-Pesa code and phone number (for M-Pesa)
- **Transaction History**: View all past transactions
- **Reprint Receipts**: Reprint receipts for any transaction
- **Refunds**: Process refunds and reverse transactions

### Credit Customers
- **Customer Profiles**: Store customer name, phone, and transaction history
- **Credit Tracking**: Track total credit, paid amount, and balance
- **Payment History**: Record and view all payments from credit customers
- **Credit Limits**: Set credit limits for customers (if enabled)

### Expense Tracking
- **Expense Categories**: Categorize expenses (e.g., rent, utilities, supplies)
- **Expense Details**: Each expense records:
  - Description
  - Amount
  - Category
  - Timestamp
  - Cashier
  - Receipt attachment (optional)
- **Expense Reports**: Generate expense reports by date range or category

### Reporting
- **Daily Closing Report**:
  - Total sales
  - Payment method breakdown
  - Items sold count
  - Cashier totals
  - Tax collected
- **Sales Reports**:
  - Sales trends over time
  - Top-selling products
  - Sales by payment method
  - Sales by cashier
- **Inventory Reports**:
  - Current stock levels
  - Low stock items
  - Inventory value
  - Stock movement history
- **Cashier Performance**:
  - Sales per cashier
  - Transaction count per cashier
  - Average transaction value

### Multi-User & Permissions
- **Roles**:
  - **Admin**: Full access to all features
  - **Manager**: Can view reports, manage inventory, view transactions
  - **Cashier**: Can only process sales and view basic information
- **User Management**:
  - Add new users
  - Edit user details
  - Reset PINs
  - Activate/deactivate users
  - Delete users

### Offline Operation
- **Local Database**: All data is stored locally in an SQLite database
- **No Internet Required**: Operate fully without internet
- **Auto-Sync**: When internet is available, data syncs automatically with back-office (if configured)
- **Data Integrity**: Ensures data is not lost even if internet goes down

---

## Technical Specifications

### Application Details
- **Version**: 7.0.0
- **App ID**: com.whizpos.app
- **Product Name**: WHIZ POS
- **Author**: Whizpoint Solutions
- **License**: Proprietary

### Development Stack
- **Node.js**: ^24.11.0
- **React**: ^18.3.1
- **TypeScript**: ~5.8.3
- **Electron**: ^31.7.7
- **Vite**: ^4.5.14
- **Tailwind CSS**: ^3.4.18

### Database
- **Local**: SQLite 3 (using better-sqlite3)
- **Cloud**: MongoDB 7.0 (using Mongoose)

### Supported Platforms
- **Windows**: Windows 10 or later
- **macOS**: Coming soon
- **Linux**: Coming soon

### File Types
- **Backup Files**: `.wpos` (Whiz POS Offline Database Backup)

---

## Troubleshooting

### Installation Issues
- **Installer won't run**: Make sure you have administrator privileges
- **Installation fails**: Disable antivirus temporarily and try again

### Printing Issues
- **Receipt won't print**:
  - Check if printer is connected and turned on
  - Verify printer settings in Whiz POS
  - Try printing a test page from Windows
- **Receipt is cut off**: Adjust printer paper width in settings

### Database Issues
- **Data not saving**: Restart Whiz POS
- **Data corruption**: Use the backup/restore feature to restore from a backup

### Sync Issues
- **Data not syncing**:
  - Check internet connection
  - Verify API settings in business setup
  - Restart Whiz POS

### Performance Issues
- **App is slow**:
  - Close other applications
  - Restart your computer
  - Check for updates

### Login Issues
- **Forgot PIN**: Contact your admin to reset your PIN
- **Can't login**: Make sure your user account is active

---

## Support & Contact

### Getting Help
- **Documentation**: Visit `pos.whizpoint.app/docs` for detailed documentation
- **FAQ**: Check our FAQ section on the website
- **Contact Support**: 
  - Email: support@pos.whizpoint.app
  - Phone: +254 700 000 000
  - Business Hours: Monday - Friday, 8:00 AM - 6:00 PM EAT

### Sales Inquiries
- **Email**: sales@pos.whizpoint.app
- **Phone**: +254 700 000 000

### Feedback
We value your feedback! Please send suggestions and feedback to feedback@pos.whizpoint.app.

---

## Conclusion

Whiz POS is more than just a cash register—it's a complete business management solution that helps you run your business more efficiently, make better decisions, and provide exceptional customer service. With its powerful features, intuitive interface, and reliable performance, Whiz POS is the perfect POS system for your business.

Thank you for choosing Whiz POS!

---

*Last Updated: May 2026*
*Version: 7.0.0*
