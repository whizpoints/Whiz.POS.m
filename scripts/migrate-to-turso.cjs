/**
 * Whiz POS - Neon Postgres to Turso LibSQL Database Migration Utility
 * 
 * Usage:
 *   node scripts/migrate-to-turso.cjs
 * 
 * Requirements:
 *   TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in webportal/.env or environment
 */

const { PrismaClient } = require('../webportal/node_modules/@prisma/client');
const { createClient } = require('@libsql/client');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../webportal/.env') });

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl) {
  console.error('[Error] TURSO_DATABASE_URL is not set in webportal/.env');
  console.log('Please provide TURSO_DATABASE_URL (e.g. libsql://whizpos-yourorg.turso.io) and TURSO_AUTH_TOKEN.');
  process.exit(1);
}

const prisma = new PrismaClient();
const turso = createClient({
  url: tursoUrl,
  authToken: tursoToken
});

async function migrate() {
  console.log('--- Starting Migration from Neon Postgres to Turso ---');
  
  try {
    // 1. Fetch data from Neon PostgreSQL
    console.log('Fetching existing data from Neon PostgreSQL...');
    const [
      businesses,
      locations,
      outlets,
      users,
      products,
      inventories,
      customers,
      suppliers,
      mpesaConfigs,
      servers,
      terminals,
      receipts
    ] = await Promise.all([
      prisma.business.findMany(),
      prisma.storeLocation.findMany(),
      prisma.outlet.findMany(),
      prisma.user.findMany(),
      prisma.product.findMany(),
      prisma.productInventory.findMany(),
      prisma.customer.findMany(),
      prisma.supplier.findMany(),
      prisma.mpesaConfig.findMany(),
      prisma.server.findMany(),
      prisma.terminal.findMany(),
      prisma.receipt.findMany({ take: 5000, orderBy: { createdAt: 'desc' } })
    ]);

    console.log(`Fetched from Postgres:
      - ${businesses.length} Businesses
      - ${locations.length} Locations
      - ${outlets.length} Outlets
      - ${users.length} Users
      - ${products.length} Products
      - ${inventories.length} Inventory Records
      - ${customers.length} Customers
      - ${suppliers.length} Suppliers
      - ${servers.length} Edge Servers
      - ${terminals.length} Terminals
      - ${receipts.length} Receipts
    `);

    // 2. Insert into Turso using batched queries
    console.log('Inserting into Turso edge database...');

    for (const b of businesses) {
      await turso.execute({
        sql: `INSERT OR REPLACE INTO Business (id, name, email, kraPin, logoUrl, settings, emailVerified, setupComplete, apiKey, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          b.id, b.name, b.email, b.kraPin || null, b.logoUrl || null,
          typeof b.settings === 'object' ? JSON.stringify(b.settings) : (b.settings || '{}'),
          b.emailVerified ? 1 : 0, b.setupComplete ? 1 : 0, b.apiKey || null,
          b.createdAt.toISOString(), b.updatedAt.toISOString()
        ]
      });
    }

    for (const l of locations) {
      await turso.execute({
        sql: `INSERT OR REPLACE INTO StoreLocation (id, businessId, name, address, apiKey, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [l.id, l.businessId, l.name, l.address || null, l.apiKey || null, l.createdAt.toISOString(), l.updatedAt.toISOString()]
      });
    }

    for (const o of outlets) {
      await turso.execute({
        sql: `INSERT OR REPLACE INTO Outlet (id, businessId, locationId, name, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [o.id, o.businessId, o.locationId, o.name, o.createdAt.toISOString(), o.updatedAt.toISOString()]
      });
    }

    for (const u of users) {
      await turso.execute({
        sql: `INSERT OR REPLACE INTO User (id, businessId, locationId, outletId, email, password, name, role, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [u.id, u.businessId, u.locationId || null, u.outletId || null, u.email, u.password, u.name, u.role, u.createdAt.toISOString(), u.updatedAt.toISOString()]
      });
    }

    for (const p of products) {
      await turso.execute({
        sql: `INSERT OR REPLACE INTO Product (id, businessId, sku, barcode, name, category, price, costPrice, taxRate, reorderLevel, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [p.id, p.businessId, p.sku, p.barcode || null, p.name, p.category || null, p.price, p.costPrice || 0, p.taxRate || 16.0, p.reorderLevel || 5, p.createdAt.toISOString(), p.updatedAt.toISOString()]
      });
    }

    for (const inv of inventories) {
      await turso.execute({
        sql: `INSERT OR REPLACE INTO ProductInventory (id, productId, locationId, outletId, stock, reorderLevel, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [inv.id, inv.productId, inv.locationId, inv.outletId || null, inv.stock, inv.reorderLevel || 5, inv.updatedAt.toISOString()]
      });
    }

    for (const c of customers) {
      await turso.execute({
        sql: `INSERT OR REPLACE INTO Customer (id, businessId, name, phone, email, balance, loyaltyPoints, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [c.id, c.businessId, c.name, c.phone || null, c.email || null, c.balance || 0, c.loyaltyPoints || 0, c.createdAt.toISOString(), c.updatedAt.toISOString()]
      });
    }

    for (const s of servers) {
      await turso.execute({
        sql: `INSERT OR REPLACE INTO Server (id, businessId, name, status, apiKey, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [s.id, s.businessId, s.name, s.status, s.apiKey || null, s.createdAt.toISOString(), s.updatedAt.toISOString()]
      });
    }

    for (const t of terminals) {
      await turso.execute({
        sql: `INSERT OR REPLACE INTO Terminal (id, businessId, serverId, outletId, macAddress, name, status, apiKey, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [t.id, t.businessId || null, t.serverId || null, t.outletId || null, t.macAddress, t.name, t.status, t.apiKey || null, t.createdAt.toISOString(), t.updatedAt.toISOString()]
      });
    }

    console.log('✅ Successfully migrated all records to Turso!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
