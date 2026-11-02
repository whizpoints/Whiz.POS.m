const Database = require('../local-server/node_modules/better-sqlite3');
const path = require('path');
const bcrypt = require('../local-server/node_modules/bcryptjs');
const crypto = require('crypto');

const dbPath = path.join(__dirname, '../local-server/db/local.db');
const db = new Database(dbPath);

console.log('Seeding clean testing data into:', dbPath);

// 1. Get or create Business
let business = db.prepare('SELECT * FROM Business LIMIT 1').get();
if (!business) {
  const bId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO Business (id, name, email, kraPin, setupComplete, emailVerified, apiKey, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, 1, 1, ?, datetime('now'), datetime('now'))
  `).run(bId, 'Whiz Retail Store', 'admin@whizpos.local', 'P051234567Z', 'whiz-local-api-key-' + crypto.randomBytes(8).toString('hex'));
  business = db.prepare('SELECT * FROM Business WHERE id = ?').get(bId);
}

// 2. Get or create Location
let location = db.prepare('SELECT * FROM StoreLocation WHERE businessId = ? LIMIT 1').get(business.id);
if (!location) {
  const locId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO StoreLocation (id, businessId, name, address, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(locId, business.id, 'Main Store', 'Nairobi CBD Branch');
  location = db.prepare('SELECT * FROM StoreLocation WHERE id = ?').get(locId);
}

// 3. Get or create Outlet
let outlet = db.prepare('SELECT * FROM Outlet WHERE locationId = ? LIMIT 1').get(location.id);
if (!outlet) {
  const outId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO Outlet (id, businessId, locationId, name, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(outId, business.id, location.id, 'Main Register 1');
  outlet = db.prepare('SELECT * FROM Outlet WHERE id = ?').get(outId);
}

console.log(`Using Business: "${business.name}" (${business.id}), Location: "${location.name}", Outlet: "${outlet.name}"`);

// 4. Seed 5 Categories
const categories = [
  { id: 'cat-bev-001', name: 'Beverages' },
  { id: 'cat-bky-002', name: 'Bakery & Snacks' },
  { id: 'cat-dry-003', name: 'Dairy & Eggs' },
  { id: 'cat-grc-004', name: 'Groceries & Grains' },
  { id: 'cat-hsd-005', name: 'Household & Hygiene' },
];

const insertCat = db.prepare(`
  INSERT INTO Category (id, businessId, name, createdAt, updatedAt)
  VALUES (?, ?, ?, datetime('now'), datetime('now'))
  ON CONFLICT(id) DO UPDATE SET name = excluded.name, updatedAt = datetime('now')
`);

for (const cat of categories) {
  insertCat.run(cat.id, business.id, cat.name);
}
console.log('Seeded 5 categories.');

// 5. Seed 9 Products (<= 10)
const products = [
  {
    id: 'prod-milk-500',
    sku: 'DRY-MLK-500',
    barcode: '616110000001',
    name: 'Fresh Milk 500ml',
    category: 'Dairy & Eggs',
    price: 65.0,
    costPrice: 52.0,
    taxRate: 16.0,
    stock: 50
  },
  {
    id: 'prod-bread-400',
    sku: 'BKY-BRD-400',
    barcode: '616110000002',
    name: 'White Bread 400g',
    category: 'Bakery & Snacks',
    price: 65.0,
    costPrice: 54.0,
    taxRate: 0.0,
    stock: 40
  },
  {
    id: 'prod-water-500',
    sku: 'BEV-WTR-500',
    barcode: '616110000003',
    name: 'Mineral Water 500ml',
    category: 'Beverages',
    price: 40.0,
    costPrice: 25.0,
    taxRate: 16.0,
    stock: 100
  },
  {
    id: 'prod-soda-500',
    sku: 'BEV-SDA-500',
    barcode: '616110000004',
    name: 'Soda 500ml PET',
    category: 'Beverages',
    price: 70.0,
    costPrice: 55.0,
    taxRate: 16.0,
    stock: 60
  },
  {
    id: 'prod-oil-1l',
    sku: 'GRC-OIL-1L',
    barcode: '616110000005',
    name: 'Pure Cooking Oil 1L',
    category: 'Groceries & Grains',
    price: 280.0,
    costPrice: 240.0,
    taxRate: 16.0,
    stock: 30
  },
  {
    id: 'prod-rice-2kg',
    sku: 'GRC-RCE-2KG',
    barcode: '616110000006',
    name: 'Premium Basmati Rice 2kg',
    category: 'Groceries & Grains',
    price: 450.0,
    costPrice: 380.0,
    taxRate: 0.0,
    stock: 25
  },
  {
    id: 'prod-soap-800',
    sku: 'HSD-SOP-800',
    barcode: '616110000007',
    name: 'Bar Soap White 800g',
    category: 'Household & Hygiene',
    price: 160.0,
    costPrice: 130.0,
    taxRate: 16.0,
    stock: 45
  },
  {
    id: 'prod-eggs-30',
    sku: 'DRY-EGG-30',
    barcode: '616110000008',
    name: 'Fresh Eggs Tray (30 pcs)',
    category: 'Dairy & Eggs',
    price: 420.0,
    costPrice: 360.0,
    taxRate: 0.0,
    stock: 20
  },
  {
    id: 'prod-bisc-200',
    sku: 'BKY-BSC-200',
    barcode: '616110000009',
    name: 'Digestive Biscuits 200g',
    category: 'Bakery & Snacks',
    price: 120.0,
    costPrice: 95.0,
    taxRate: 16.0,
    stock: 50
  }
];

const insertProd = db.prepare(`
  INSERT INTO Product (id, businessId, sku, barcode, name, category, price, costPrice, taxRate, reorderLevel, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 5, datetime('now'), datetime('now'))
  ON CONFLICT(id) DO UPDATE SET
    sku = excluded.sku,
    barcode = excluded.barcode,
    name = excluded.name,
    category = excluded.category,
    price = excluded.price,
    costPrice = excluded.costPrice,
    taxRate = excluded.taxRate,
    updatedAt = datetime('now')
`);

const insertInv = db.prepare(`
  INSERT INTO ProductInventory (id, productId, locationId, outletId, stock, reorderLevel, updatedAt)
  VALUES (?, ?, ?, ?, ?, 5, datetime('now'))
  ON CONFLICT(id) DO UPDATE SET stock = excluded.stock, updatedAt = datetime('now')
`);

for (const p of products) {
  insertProd.run(p.id, business.id, p.sku, p.barcode, p.name, p.category, p.price, p.costPrice, p.taxRate);
  const invId = `inv-${p.id}-${location.id}-${outlet.id}`;
  insertInv.run(invId, p.id, location.id, outlet.id, p.stock);
}
console.log('Seeded 9 testing products with inventory.');

// 6. Seed 5 Users with Different Roles & Unique PINs
const defaultHashedPassword = bcrypt.hashSync('Password@123', 10);

const testUsers = [
  {
    id: 'usr-admin-001',
    name: 'Main Administrator',
    email: 'admin@whizpos.local',
    role: 'ADMIN',
    pin: '1111'
  },
  {
    id: 'usr-mgr-002',
    name: 'Store Manager',
    email: 'manager@whizpos.local',
    role: 'MANAGER',
    pin: '2222'
  },
  {
    id: 'usr-cashier-003',
    name: 'Cashier Alice',
    email: 'cashier1@whizpos.local',
    role: 'CASHIER',
    pin: '3333'
  },
  {
    id: 'usr-cashier-004',
    name: 'Cashier Bob',
    email: 'cashier2@whizpos.local',
    role: 'CASHIER',
    pin: '4444'
  },
  {
    id: 'usr-sup-005',
    name: 'Shift Supervisor',
    email: 'supervisor@whizpos.local',
    role: 'MANAGER',
    pin: '5555'
  }
];

const insertUser = db.prepare(`
  INSERT INTO User (id, businessId, locationId, outletId, name, email, password, pin, role, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    email = excluded.email,
    password = excluded.password,
    pin = excluded.pin,
    role = excluded.role,
    locationId = excluded.locationId,
    outletId = excluded.outletId,
    updatedAt = datetime('now')
`);

for (const u of testUsers) {
  insertUser.run(u.id, business.id, location.id, outlet.id, u.name, u.email, defaultHashedPassword, u.pin, u.role);
}

console.log('Seeded 5 users with distinct PINs and roles.');
db.close();

console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
