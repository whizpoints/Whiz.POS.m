import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { PrismaClient } from '@prisma/client';
import prisma from '../prisma.js';
import jwt from 'jsonwebtoken';
// We use a dynamic import or require for better-sqlite3
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const router = Router();
const upload = multer({ dest: 'uploads/' });
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const requireSuperAdmin = async (req: any, res: any, next: any) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
        
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        
        if (decoded.role !== 'ADMIN' && decoded.role !== 'MANAGER') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

router.use(requireSuperAdmin);

router.post('/import', upload.single('file'), async (req: any, res: any) => {
    const file = req.file;
    const businessId = req.user.businessId;

    if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    let parsedData: any = {};
    const ext = path.extname(file.originalname).toLowerCase();

    try {
        if (ext === '.json') {
            const raw = await fs.readFile(file.path, 'utf8');
            const data = JSON.parse(raw);
            parsedData = data.data || data; // handle wrapped vs raw formats
        } else if (ext === '.wpos') {
            const Database = require('better-sqlite3');
            const db = new Database(file.path, { readonly: true });
            
            // Read all tables from the sqlite wpos file
            const tables = ['businessSetup', 'products', 'users', 'transactions', 'expenses', 'salaries', 'creditCustomers', 'suppliers', 'categories'];
            for (const table of tables) {
                try {
                    const stmt = db.prepare(`SELECT data FROM ${table}`);
                    const rows = stmt.all();
                    
                    if (['businessSetup'].includes(table)) {
                        parsedData[`${table}.json`] = rows.length > 0 ? JSON.parse(rows[0].data as string) : null;
                    } else {
                        parsedData[`${table}.json`] = rows.map((r: any) => JSON.parse(r.data as string));
                    }
                } catch (e) {
                    // table might not exist, skip
                    console.log(`[Backup Import] Skipped table ${table}`);
                }
            }
            db.close();
        } else {
            return res.status(400).json({ error: 'Unsupported file format. Please upload .json or .wpos' });
        }

        // Clean up uploaded file
        await fs.unlink(file.path).catch(() => {});

        // Process parsedData into the Cloud Database (Prisma)
        let stats = {
            products: 0,
            users: 0,
            transactions: 0,
            customers: 0
        };

        const defaultLocation = await prisma.storeLocation.findFirst({ where: { businessId } }) || 
                              await prisma.storeLocation.create({ data: { businessId, name: 'Main Branch' } });
        const locationId = defaultLocation.id;

        // Import Products
        const productsList = parsedData['products.json'] || [];
        for (const p of productsList) {
            if (!p.name) continue;
            const sku = String(p.sku || p.barcode || p.id || p.productId);
            
            const existing = await prisma.product.findFirst({ where: { businessId, sku } });
            let productId = '';

            if (existing) {
                await prisma.product.update({
                    where: { id: existing.id },
                    data: {
                        name: String(p.name),
                        category: p.category ? String(p.category) : null,
                        price: Number(p.price) || 0,
                        costPrice: Number(p.costPrice) || 0,
                        barcode: p.barcode ? String(p.barcode) : null
                    }
                });
                productId = existing.id;
            } else {
                const newP = await prisma.product.create({
                    data: {
                        businessId,
                        sku,
                        name: String(p.name),
                        category: p.category ? String(p.category) : null,
                        price: Number(p.price) || 0,
                        costPrice: Number(p.costPrice) || 0,
                        barcode: p.barcode ? String(p.barcode) : null
                    }
                });
                productId = newP.id;
            }

            // Inventory
            const existingInv = await prisma.productInventory.findFirst({
                where: { productId, locationId }
            });
            if (existingInv) {
                await prisma.productInventory.update({
                    where: { id: existingInv.id },
                    data: { stock: Math.max(existingInv.stock, Number(p.stock) || 0) } // keep highest stock to avoid overwriting newer sales
                });
            } else {
                await prisma.productInventory.create({
                    data: { productId, locationId, stock: Number(p.stock) || 0 }
                });
            }
            stats.products++;
        }

        // Import Users
        const usersList = parsedData['users.json'] || [];
        for (const u of usersList) {
            if (!u.name) continue;
            const fallbackEmail = u.email || `${u.name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${u.id}@pos.local`;
            
            let role = 'CASHIER';
            if (u.role === 'SYSTEM_ADMIN' || u.role === 'Admin') role = 'ADMIN';
            else if (u.role === 'STORE_MANAGER' || u.role === 'Manager') role = 'MANAGER';

            await prisma.user.upsert({
                where: { email: fallbackEmail },
                create: {
                    businessId,
                    locationId,
                    email: fallbackEmail,
                    password: u.pin || u.password || 'pos1234', // keep legacy PIN if they had it
                    pin: u.pin || null,
                    name: u.name,
                    role: role as any
                },
                update: {
                    name: u.name,
                    role: role as any,
                    locationId
                }
            });
            stats.users++;
        }

        // Import Transactions (Receipts)
        const txList = parsedData['transactions.json'] || [];
        for (const t of txList) {
            const rawStatus = (t.status || '').toUpperCase();
            if (rawStatus === 'CANCELLED') continue;

            const existing = await prisma.receipt.findFirst({ where: { businessId, receiptNumber: String(t.id) } });
            if (!existing) {
                await prisma.receipt.create({
                    data: {
                        businessId,
                        locationId,
                        receiptNumber: String(t.id),
                        totalAmount: Number(t.totalAmount || t.total) || 0,
                        paymentMethod: String(t.paymentMethod || 'CASH'),
                        customerPhone: t.customerPhone ? String(t.customerPhone) : null,
                        status: 'COMPLETED',
                        createdAt: t.timestamp ? new Date(t.timestamp) : undefined
                    }
                });
                stats.transactions++;
            }
        }

        return res.json({ success: true, message: 'Backup imported successfully', stats });
    } catch (error) {
        console.error('Import error:', error);
        return res.status(500).json({ error: 'Failed to process backup file' });
    }
});

export default router;
