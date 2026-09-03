// @ts-nocheck
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import db from '../db.js';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
// We use a dynamic import or require for better-sqlite3
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const router = Router();
const upload = multer({ dest: 'uploads/' });
const requireSuperAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader)
            return res.status(401).json({ error: 'Unauthorized' });
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, (process.env.JWT_SECRET || 'fallback_secret'));
        if (decoded.role !== 'ADMIN' && decoded.role !== 'MANAGER' && decoded.role !== 'SYSTEM_ADMIN') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        req.user = decoded;
        next();
    }
    catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};
router.use(requireSuperAdmin);
router.post('/import', upload.single('file'), async (req, res) => {
    const file = req.file;
    const businessId = req.user.businessId;
    if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    let parsedData = {};
    const ext = path.extname(file.originalname).toLowerCase();
    try {
        if (ext === '.json') {
            const raw = await fs.readFile(file.path, 'utf8');
            const data = JSON.parse(raw);
            parsedData = data.data || data; // handle wrapped vs raw formats
        }
        else if (ext === '.wpos') {
            const Database = require('better-sqlite3');
            const db = new Database(file.path, { readonly: true });
            // Read all tables from the sqlite wpos file
            const tables = ['businessSetup', 'products', 'users', 'transactions', 'expenses', 'salaries', 'creditCustomers', 'suppliers', 'categories'];
            for (const table of tables) {
                try {
                    const stmt = db.prepare(`SELECT data FROM ${table}`);
                    const rows = stmt.all();
                    if (['businessSetup'].includes(table)) {
                        parsedData[`${table}.json`] = rows.length > 0 ? JSON.parse(rows[0].data) : null;
                    }
                    else {
                        parsedData[`${table}.json`] = rows.map((r) => JSON.parse(r.data));
                    }
                }
                catch (e) {
                    // table might not exist, skip
                    console.log(`[Backup Import] Skipped table ${table}`);
                }
            }
            db.close();
        }
        else {
            return res.status(400).json({ error: 'Unsupported file format. Please upload .json or .wpos' });
        }
        // Clean up uploaded file
        await fs.unlink(file.path).catch(() => { });
        // Process parsedData into the Cloud Database (Prisma)
        let stats = {
            products: 0,
            users: 0,
            transactions: 0,
            customers: 0
        };
        const defaultLocation = await db.selectFrom('StoreLocation').selectAll().where('businessId', '=', businessId).executeTakeFirst() || await db.insertInto('StoreLocation').values({ id: randomUUID(), businessId, name: 'Main Branch' }).returningAll().executeTakeFirstOrThrow();
        const locationId = defaultLocation.id;
        // --- CLEAR EXISTING DATA ---
        await db.deleteFrom('Receipt').where('businessId', '=', businessId).execute();
        await db.deleteFrom('ProductInventory').where('locationId', 'in', (qb) => qb.selectFrom('StoreLocation').select('id').where('businessId', '=', businessId)).execute();
        await db.deleteFrom('Product').where('businessId', '=', businessId).execute();
        await db.deleteFrom('Category').where('businessId', '=', businessId).execute();
        await db.deleteFrom('Customer').where('businessId', '=', businessId).execute();
        // For users, delete everyone EXCEPT the current user so they don't get logged out instantly
        await db.deleteFrom('User').where('businessId', '=', businessId).where('id', '!=', req.user.userId).execute();
        // ---------------------------
        // Import Settings
        const settingsRaw = parsedData['settings'] || parsedData['businessSetup.json'];
        if (settingsRaw) {
            let settingsObj = settingsRaw;
            if (typeof settingsObj === 'string') {
                try {
                    settingsObj = JSON.parse(settingsObj);
                }
                catch (e) { }
            }
            if (typeof settingsObj === 'object') {
                // Strip terminal-specific settings from backups to prevent corrupting the server
                delete settingsObj.apiKey;
                delete settingsObj.terminalName;
                delete settingsObj.outletId;
                delete settingsObj.deviceRole;
                delete settingsObj.lanAdminIp;
                delete settingsObj.apiUrl;
                delete settingsObj.isLoggedIn;
                delete settingsObj.isSetup;
                // If the backup has the corrupted terminal name as the business name, try to fix it
                if (settingsObj.businessName === 'Terminal 1' || settingsObj.businessName === 'Terminal 1t') {
                    settingsObj.businessName = settingsObj.legalName || 'WHIZPOINT SOLUTIONS';
                }
                await db.updateTable('Business').set({ settings: JSON.stringify(settingsObj) }).where('id', '=', businessId).execute();
            }
        }
        // Import Categories
        const categoriesList = parsedData['categories'] || parsedData['categories.json'] || [];
        for (const c of categoriesList) {
            if (!c.name)
                continue;
            const existingCat = await db.selectFrom('Category').selectAll().where('businessId', '=', businessId).where('name', '=', String(c.name)).executeTakeFirst();
            if (!existingCat) {
                await db.insertInto('Category').values({
                    id: randomUUID(),
                    businessId,
                    name: String(c.name),
                }).execute();
            }
        }
        // Import Products
        const productsList = parsedData['products'] || parsedData['products.json'] || [];
        for (const p of productsList) {
            if (!p.name)
                continue;
            const sku = String(p.sku || p.barcode || p.id || p.productId);
            const existing = await db.selectFrom('Product').selectAll().where('businessId', '=', businessId).where('sku', '=', sku).executeTakeFirst();
            let productId = '';
            if (existing) {
                await db.updateTable('Product').set({
                    name: String(p.name),
                    category: p.category ? String(p.category) : null,
                    price: Number(p.price) || 0,
                    costPrice: Number(p.costPrice) || 0,
                    barcode: p.barcode ? String(p.barcode) : null
                }).where('id', '=', existing.id).execute();
                productId = existing.id;
            }
            else {
                const newP = await db.insertInto('Product').values({
                    id: randomUUID(),
                    businessId,
                    sku,
                    name: String(p.name),
                    category: p.category ? String(p.category) : null,
                    price: Number(p.price) || 0,
                    costPrice: Number(p.costPrice) || 0,
                    barcode: p.barcode ? String(p.barcode) : null
                }).returningAll().executeTakeFirstOrThrow();
                productId = newP.id;
            }
            // Inventory
            const existingInv = await db.selectFrom('ProductInventory').selectAll().where('productId', '=', productId).where('locationId', '=', locationId).executeTakeFirst();
            if (existingInv) {
                await db.updateTable('ProductInventory').set({ stock: Math.max(existingInv.stock, Number(p.stock) || 0) }).where('id', '=', existingInv.id).execute();
            }
            else {
                await db.insertInto('ProductInventory').values({ id: randomUUID(), productId, locationId, stock: Number(p.stock) || 0 }).execute();
            }
            stats.products++;
        }
        // Import Users
        const usersList = parsedData['users'] || parsedData['users.json'] || [];
        for (const u of usersList) {
            if (!u.name)
                continue;
            const fallbackEmail = u.email || `${u.name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${u.id}@pos.local`;
            let role = 'CASHIER';
            if (u.role === 'SYSTEM_ADMIN' || u.role === 'Admin' || u.role === 'ADMIN')
                role = 'ADMIN';
            else if (u.role === 'STORE_MANAGER' || u.role === 'Manager' || u.role === 'MANAGER')
                role = 'MANAGER';
            let existingUser = await db.selectFrom('User').selectAll().where('email', '=', fallbackEmail).executeTakeFirst();
            if (existingUser) {
                await db.updateTable('User').set({
                    name: u.name,
                    role: role,
                    locationId
                }).where('email', '=', fallbackEmail).execute();
            }
            else {
                await db.insertInto('User').values({
                    id: randomUUID(),
                    businessId,
                    locationId,
                    email: fallbackEmail,
                    password: u.pin || u.password || 'pos1234',
                    pin: u.pin || null,
                    name: u.name,
                    role: role
                }).execute();
            }
            stats.users++;
        }
        // Import Transactions (Receipts)
        const txList = parsedData['transactions'] || parsedData['transactions.json'] || [];
        for (const t of txList) {
            const rawStatus = (t.status || '').toUpperCase();
            if (rawStatus === 'CANCELLED')
                continue;
            const existing = await db.selectFrom('Receipt').selectAll().where('businessId', '=', businessId).where('receiptNumber', '=', String(t.id)).executeTakeFirst();
            if (!existing) {
                await db.insertInto('Receipt').values({
                    id: randomUUID(),
                    businessId,
                    locationId,
                    receiptNumber: String(t.id),
                    totalAmount: Number(t.totalAmount || t.total) || 0,
                    paymentMethod: String(t.paymentMethod || 'CASH'),
                    customerPhone: t.customerPhone ? String(t.customerPhone) : null,
                    status: 'COMPLETED',
                    createdAt: t.timestamp ? new Date(t.timestamp).toISOString() : undefined
                }).execute();
                stats.transactions++;
            }
        }
        // Import Customers
        const customersList = parsedData['customers'] || parsedData['customers.json'] || [];
        for (const c of customersList) {
            if (!c.name)
                continue;
            const existing = await db.selectFrom('Customer').selectAll().where('businessId', '=', businessId).where('phone', '=', String(c.phone || c.name)).executeTakeFirst();
            if (!existing) {
                await db.insertInto('Customer').values({
                    id: randomUUID(),
                    businessId,
                    name: String(c.name),
                    phone: c.phone ? String(c.phone) : null,
                    email: c.email ? String(c.email) : null
                }).execute();
                stats.customers++;
            }
        }
        return res.json({ success: true, message: 'Backup imported successfully', stats });
    }
    catch (error) {
        console.error('Import error:', error);
        return res.status(500).json({ error: 'Failed to process backup file' });
    }
});
export default router;
