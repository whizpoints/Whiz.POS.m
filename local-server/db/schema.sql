-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "kraPin" TEXT,
    "logoUrl" TEXT,
    "settings" TEXT DEFAULT '{}',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "setupComplete" BOOLEAN NOT NULL DEFAULT false,
    "verificationToken" TEXT,
    "pairingCode" TEXT,
    "apiKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Category_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MpesaConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "locationId" TEXT,
    "merchantType" TEXT NOT NULL DEFAULT 'BUY_GOODS',
    "tillNumber" TEXT,
    "paybillNumber" TEXT,
    "accountReference" TEXT,
    "environment" TEXT NOT NULL DEFAULT 'sandbox',
    "consumerKey" TEXT NOT NULL,
    "consumerSecret" TEXT NOT NULL,
    "passkey" TEXT NOT NULL,
    "shortcode" TEXT NOT NULL,
    "initiatorName" TEXT,
    "initiatorPassword" TEXT,
    "stkEnabled" BOOLEAN NOT NULL DEFAULT true,
    "c2bEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outletId" TEXT,
    CONSTRAINT "MpesaConfig_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MpesaConfig_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StoreLocation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MpesaConfig_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "locationId" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "pin" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CASHIER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outletId" TEXT,
    CONSTRAINT "User_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "User_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StoreLocation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StoreLocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StoreLocation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Outlet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Outlet_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Outlet_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StoreLocation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "outletId" TEXT,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reference" TEXT,
    "sourceTerminal" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMovement_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StoreLocation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "price" REAL NOT NULL,
    "costPrice" REAL,
    "taxRate" REAL NOT NULL DEFAULT 16.0,
    "reorderLevel" INTEGER NOT NULL DEFAULT 5,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Product_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductInventory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "outletId" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductInventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductInventory_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StoreLocation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductInventory_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Customer_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MpesaTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "locationId" TEXT,
    "transactionId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "customerName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNLINKED',
    "isEnriched" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outletId" TEXT,
    CONSTRAINT "MpesaTransaction_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MpesaTransaction_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StoreLocation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MpesaTransaction_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "locationId" TEXT,
    "receiptNumber" TEXT NOT NULL,
    "totalAmount" REAL NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "customerPhone" TEXT,
    "mpesaCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cashierName" TEXT,
    "outletId" TEXT,
    CONSTRAINT "Receipt_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Receipt_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StoreLocation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Receipt_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReceiptItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "receiptId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" REAL NOT NULL,
    "totalPrice" REAL NOT NULL,
    CONSTRAINT "ReceiptItem_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "email" TEXT,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Supplier_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Terminal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "macAddress" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "apiKey" TEXT,
    "outletId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "outletId" TEXT,
    "terminal" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Business_email_key" ON "Business"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Business_apiKey_key" ON "Business"("apiKey");

-- CreateIndex
CREATE INDEX "Business_email_idx" ON "Business"("email");

-- CreateIndex
CREATE INDEX "Business_updatedAt_idx" ON "Business"("updatedAt");

-- CreateIndex
CREATE INDEX "Category_businessId_idx" ON "Category"("businessId");

-- CreateIndex
CREATE INDEX "Category_name_idx" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MpesaConfig_locationId_key" ON "MpesaConfig"("locationId");

-- CreateIndex
CREATE INDEX "MpesaConfig_businessId_idx" ON "MpesaConfig"("businessId");

-- CreateIndex
CREATE INDEX "MpesaConfig_locationId_idx" ON "MpesaConfig"("locationId");

-- CreateIndex
CREATE INDEX "MpesaConfig_outletId_idx" ON "MpesaConfig"("outletId");

-- CreateIndex
CREATE INDEX "MpesaConfig_updatedAt_idx" ON "MpesaConfig"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_businessId_idx" ON "User"("businessId");

-- CreateIndex
CREATE INDEX "User_locationId_idx" ON "User"("locationId");

-- CreateIndex
CREATE INDEX "User_outletId_idx" ON "User"("outletId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_updatedAt_idx" ON "User"("updatedAt");

-- CreateIndex
CREATE INDEX "StoreLocation_businessId_idx" ON "StoreLocation"("businessId");

-- CreateIndex
CREATE INDEX "StoreLocation_updatedAt_idx" ON "StoreLocation"("updatedAt");

-- CreateIndex
CREATE INDEX "Outlet_businessId_idx" ON "Outlet"("businessId");

-- CreateIndex
CREATE INDEX "Outlet_locationId_idx" ON "Outlet"("locationId");

-- CreateIndex
CREATE INDEX "Outlet_updatedAt_idx" ON "Outlet"("updatedAt");

-- CreateIndex
CREATE INDEX "StockMovement_businessId_idx" ON "StockMovement"("businessId");

-- CreateIndex
CREATE INDEX "StockMovement_productId_idx" ON "StockMovement"("productId");

-- CreateIndex
CREATE INDEX "StockMovement_locationId_idx" ON "StockMovement"("locationId");

-- CreateIndex
CREATE INDEX "StockMovement_outletId_idx" ON "StockMovement"("outletId");

-- CreateIndex
CREATE INDEX "StockMovement_timestamp_idx" ON "StockMovement"("timestamp");

-- CreateIndex
CREATE INDEX "StockMovement_updatedAt_idx" ON "StockMovement"("updatedAt");

-- CreateIndex
CREATE INDEX "Product_businessId_idx" ON "Product"("businessId");

-- CreateIndex
CREATE INDEX "Product_sku_idx" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_updatedAt_idx" ON "Product"("updatedAt");

-- CreateIndex
CREATE INDEX "ProductInventory_productId_idx" ON "ProductInventory"("productId");

-- CreateIndex
CREATE INDEX "ProductInventory_locationId_idx" ON "ProductInventory"("locationId");

-- CreateIndex
CREATE INDEX "ProductInventory_outletId_idx" ON "ProductInventory"("outletId");

-- CreateIndex
CREATE INDEX "ProductInventory_updatedAt_idx" ON "ProductInventory"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductInventory_productId_locationId_outletId_key" ON "ProductInventory"("productId", "locationId", "outletId");

-- CreateIndex
CREATE INDEX "Customer_businessId_idx" ON "Customer"("businessId");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Customer_updatedAt_idx" ON "Customer"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MpesaTransaction_transactionId_key" ON "MpesaTransaction"("transactionId");

-- CreateIndex
CREATE INDEX "MpesaTransaction_businessId_idx" ON "MpesaTransaction"("businessId");

-- CreateIndex
CREATE INDEX "MpesaTransaction_locationId_idx" ON "MpesaTransaction"("locationId");

-- CreateIndex
CREATE INDEX "MpesaTransaction_outletId_idx" ON "MpesaTransaction"("outletId");

-- CreateIndex
CREATE INDEX "MpesaTransaction_transactionId_idx" ON "MpesaTransaction"("transactionId");

-- CreateIndex
CREATE INDEX "MpesaTransaction_timestamp_idx" ON "MpesaTransaction"("timestamp");

-- CreateIndex
CREATE INDEX "MpesaTransaction_updatedAt_idx" ON "MpesaTransaction"("updatedAt");

-- CreateIndex
CREATE INDEX "Receipt_businessId_idx" ON "Receipt"("businessId");

-- CreateIndex
CREATE INDEX "Receipt_locationId_idx" ON "Receipt"("locationId");

-- CreateIndex
CREATE INDEX "Receipt_outletId_idx" ON "Receipt"("outletId");

-- CreateIndex
CREATE INDEX "Receipt_receiptNumber_idx" ON "Receipt"("receiptNumber");

-- CreateIndex
CREATE INDEX "Receipt_createdAt_idx" ON "Receipt"("createdAt");

-- CreateIndex
CREATE INDEX "Receipt_updatedAt_idx" ON "Receipt"("updatedAt");

-- CreateIndex
CREATE INDEX "ReceiptItem_receiptId_idx" ON "ReceiptItem"("receiptId");

-- CreateIndex
CREATE INDEX "Supplier_businessId_idx" ON "Supplier"("businessId");

-- CreateIndex
CREATE INDEX "Supplier_name_idx" ON "Supplier"("name");

-- CreateIndex
CREATE INDEX "Supplier_updatedAt_idx" ON "Supplier"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Terminal_macAddress_key" ON "Terminal"("macAddress");

-- CreateIndex
CREATE INDEX "SyncLog_businessId_idx" ON "SyncLog"("businessId");

-- CreateIndex
CREATE INDEX "SyncLog_outletId_idx" ON "SyncLog"("outletId");

-- CreateIndex
CREATE INDEX "SyncLog_createdAt_idx" ON "SyncLog"("createdAt");

-- Auto-updatedAt Triggers
-- Ensures updatedAt is always in ISO-8601 format (YYYY-MM-DDTHH:MM:SS.000Z)
-- which is required for delta sync timestamp comparisons to work correctly.

CREATE TRIGGER Business_after_insert AFTER INSERT ON "Business"
BEGIN UPDATE "Business" SET updatedAt = strftime('%Y-%m-%dT%H:%M:%f0Z', 'now') WHERE id = new.id; END;
CREATE TRIGGER Business_after_update AFTER UPDATE ON "Business"
BEGIN UPDATE "Business" SET updatedAt = strftime('%Y-%m-%dT%H:%M:%f0Z', 'now') WHERE id = new.id; END;

CREATE TRIGGER Category_after_insert AFTER INSERT ON "Category"
BEGIN UPDATE "Category" SET updatedAt = strftime('%Y-%m-%dT%H:%M:%f0Z', 'now') WHERE id = new.id; END;
CREATE TRIGGER Category_after_update AFTER UPDATE ON "Category"
BEGIN UPDATE "Category" SET updatedAt = strftime('%Y-%m-%dT%H:%M:%f0Z', 'now') WHERE id = new.id; END;

CREATE TRIGGER MpesaConfig_after_insert AFTER INSERT ON "MpesaConfig"
BEGIN UPDATE "MpesaConfig" SET updatedAt = strftime('%Y-%m-%dT%H:%M:%f0Z', 'now') WHERE id = new.id; END;
CREATE TRIGGER MpesaConfig_after_update AFTER UPDATE ON "MpesaConfig"
BEGIN UPDATE "MpesaConfig" SET updatedAt = strftime('%Y-%m-%dT%H:%M:%f0Z', 'now') WHERE id = new.id; END;

CREATE TRIGGER User_after_insert AFTER INSERT ON "User"
BEGIN UPDATE "User" SET updatedAt = strftime('%Y-%m-%dT%H:%M:%f0Z', 'now') WHERE id = new.id; END;
CREATE TRIGGER User_after_update AFTER UPDATE ON "User"
BEGIN UPDATE "User" SET updatedAt = strftime('%Y-%m-%dT%H:%M:%f0Z', 'now') WHERE id = new.id; END;

CREATE TRIGGER StoreLocation_after_insert AFTER INSERT ON "StoreLocation"
BEGIN UPDATE "StoreLocation" SET updatedAt = strftime('%Y-%m-%dT%H:%M:%f0Z', 'now') WHERE id = new.id; END;
CREATE TRIGGER StoreLocation_after_update AFTER UPDATE ON "StoreLocation"
BEGIN UPDATE "StoreLocation" SET updatedAt = strftime('%Y-%m-%dT%H:%M:%f0Z', 'now') WHERE id = new.id; END;

CREATE TRIGGER Outlet_after_insert AFTER INSERT ON "Outlet"
BEGIN UPDATE "Outlet" SET updatedAt = strftime('%Y-%m-%dT%H:%M:%f0Z', 'now') WHERE id = new.id; END;
CREATE TRIGGER Outlet_after_update AFTER UPDATE ON "Outlet"
BEGIN UPDATE "Outlet" SET updatedAt = strftime('%Y-%m-%dT%H:%M:%f0Z', 'now') WHERE id = new.id; END;

CREATE TRIGGER StockMovement_after_insert AFTER INSERT ON "StockMovement"
BEGIN UPDATE "StockMovement" SET updatedAt = strftime('%Y-%m-%dT%H:%M:%f0Z', 'now') WHERE id = new.id; END;
CREATE TRIGGER StockMovement_after_update AFTER UPDATE ON "StockMovement"
BEGIN UPDATE "StockMovement" SET updatedAt = strftime('%Y-%m-%dT%H:%M:%f0Z', 'now') WHERE id = new.id; END;

CREATE TRIGGER Product_after_insert AFTER INSERT ON "Product"
BEGIN UPDATE "Product" SET updatedAt = strftime('%Y-%m-%dT%H:%M:%f0Z', 'now') WHERE id = new.id; END;
CREATE TRIGGER Product_after_update AFTER UPDATE ON "Product"
BEGIN UPDATE "Product" SET updatedAt = strftime('%Y-%m-%dT%H:%M:%f0Z', 'now') WHERE id = new.id; END;

CREATE TRIGGER ProductInventory_after_insert AFTER INSERT ON "ProductInventory"
BEGIN UPDATE "ProductInventory" SET updatedAt = strftime('%Y-%m-%dT%H:%M:%f0Z', 'now') WHERE id = new.id; END;
CREATE TRIGGER ProductInventory_after_update AFTER UPDATE ON "ProductInventory"
BEGIN UPDATE "ProductInventory" SET updatedAt = strftime('%Y-%m-%dT%H:%M:%f0Z', 'now') WHERE id = new.id; END;

CREATE TRIGGER Customer_after_insert AFTER INSERT ON "Customer"
BEGIN UPDATE "Customer" SET updatedAt = strftime('%Y-%m-%dT%H:%M:%f0Z', 'now') WHERE id = new.id; END;
CREATE TRIGGER Customer_after_update AFTER UPDATE ON "Customer"
BEGIN UPDATE "Customer" SET updatedAt = strftime('%Y-%m-%dT%H:%M:%f0Z', 'now') WHERE id = new.id; END;

CREATE TRIGGER MpesaTransaction_after_insert AFTER INSERT ON "MpesaTransaction"
BEGIN UPDATE "MpesaTransaction" SET updatedAt = strftime('%Y-%m-%dT%H:%M:%f0Z', 'now') WHERE id = new.id; END;
CREATE TRIGGER MpesaTransaction_after_update AFTER UPDATE ON "MpesaTransaction"
BEGIN UPDATE "MpesaTransaction" SET updatedAt = strftime('%Y-%m-%dT%H:%M:%f0Z', 'now') WHERE id = new.id; END;

CREATE TRIGGER Receipt_after_insert AFTER INSERT ON "Receipt"
BEGIN UPDATE "Receipt" SET updatedAt = strftime('%Y-%m-%dT%H:%M:%f0Z', 'now') WHERE id = new.id; END;
CREATE TRIGGER Receipt_after_update AFTER UPDATE ON "Receipt"
BEGIN UPDATE "Receipt" SET updatedAt = strftime('%Y-%m-%dT%H:%M:%f0Z', 'now') WHERE id = new.id; END;

CREATE TRIGGER Supplier_after_insert AFTER INSERT ON "Supplier"
BEGIN UPDATE "Supplier" SET updatedAt = strftime('%Y-%m-%dT%H:%M:%f0Z', 'now') WHERE id = new.id; END;
CREATE TRIGGER Supplier_after_update AFTER UPDATE ON "Supplier"
BEGIN UPDATE "Supplier" SET updatedAt = strftime('%Y-%m-%dT%H:%M:%f0Z', 'now') WHERE id = new.id; END;

CREATE TRIGGER Terminal_after_insert AFTER INSERT ON "Terminal"
BEGIN UPDATE "Terminal" SET updatedAt = strftime('%Y-%m-%dT%H:%M:%f0Z', 'now') WHERE id = new.id; END;
CREATE TRIGGER Terminal_after_update AFTER UPDATE ON "Terminal"
BEGIN UPDATE "Terminal" SET updatedAt = strftime('%Y-%m-%dT%H:%M:%f0Z', 'now') WHERE id = new.id; END;

CREATE TRIGGER SyncLog_after_insert AFTER INSERT ON "SyncLog"
BEGIN UPDATE "SyncLog" SET updatedAt = strftime('%Y-%m-%dT%H:%M:%f0Z', 'now') WHERE id = new.id; END;

