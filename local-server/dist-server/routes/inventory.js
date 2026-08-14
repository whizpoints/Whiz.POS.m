// @ts-nocheck
import { Router } from 'express';
import prisma from '../prisma.js';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import * as xlsx from 'xlsx';
import ExcelJS from 'exceljs';
const upload = multer({ dest: 'uploads/' });
const router = Router();
// const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader)
        return res.status(401).json({ error: 'Missing authorization header' });
    const token = authHeader.split(' ')[1];
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    }
    catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};
router.use(authenticate);
// Get all products
router.get('/', async (req, res) => {
    try {
        const { businessId } = req.user;
        const { locationId } = req.query;
        const products = await prisma.product.findMany({
            where: { businessId },
            include: { inventory: { include: { location: true } } },
            orderBy: { name: 'asc' }
        });
        const formatted = products.map(p => {
            let stock = 0;
            if (locationId) {
                const inv = p.inventory.find(i => i.locationId === locationId);
                stock = inv ? inv.stock : 0;
            }
            else {
                stock = p.inventory.reduce((sum, inv) => sum + inv.stock, 0);
            }
            return { ...p, stock };
        });
        res.json(formatted);
    }
    catch (error) {
        console.error('Inventory GET error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create product
router.post('/', async (req, res) => {
    try {
        const { businessId } = req.user;
        const { sku, barcode, name, category, price, costPrice, taxRate, stock, reorderLevel, locationId } = req.body;
        // Create product
        const product = await prisma.product.create({
            data: {
                businessId, sku, barcode, name, category, price, costPrice, taxRate
            }
        });
        // Create inventory
        let targetLocationId = locationId;
        if (!targetLocationId) {
            const loc = await prisma.storeLocation.findFirst({ where: { businessId } });
            if (loc)
                targetLocationId = loc.id;
        }
        if (targetLocationId) {
            await prisma.productInventory.create({
                data: {
                    productId: product.id,
                    locationId: targetLocationId,
                    stock: stock || 0,
                    reorderLevel: reorderLevel || 5
                }
            });
        }
        res.json(product);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update product
router.put('/:id', async (req, res) => {
    try {
        const { businessId } = req.user;
        const { id } = req.params;
        const { sku, barcode, name, category, price, costPrice, taxRate, stock, reorderLevel, locationId } = req.body;
        await prisma.product.updateMany({
            where: { id, businessId },
            data: { sku, barcode, name, category, price, costPrice, taxRate }
        });
        // Update inventory if locationId is provided
        let targetLocationId = locationId;
        if (!targetLocationId) {
            const loc = await prisma.storeLocation.findFirst({ where: { businessId } });
            if (loc)
                targetLocationId = loc.id;
        }
        if (targetLocationId && stock !== undefined) {
            await prisma.productInventory.upsert({
                where: { productId_locationId: { productId: id, locationId: targetLocationId } },
                create: { productId: id, locationId: targetLocationId, stock: stock || 0, reorderLevel: reorderLevel || 5 },
                update: { stock: stock || 0, reorderLevel: reorderLevel || 5 }
            });
        }
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete product
router.delete('/:id', async (req, res) => {
    try {
        const { businessId } = req.user;
        const { id } = req.params;
        await prisma.product.deleteMany({
            where: { id, businessId }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/import', upload.single('file'), async (req, res) => {
    try {
        const { businessId } = req.user;
        const { locationId } = req.body;
        const file = req.file;
        if (!file)
            return res.status(400).json({ error: 'No file uploaded' });
        let targetLocationId = locationId;
        if (!targetLocationId) {
            const loc = await prisma.storeLocation.findFirst({ where: { businessId } });
            if (loc)
                targetLocationId = loc.id;
        }
        const workbook = xlsx.readFile(file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);
        let count = 0;
        for (const row of data) {
            if (!row.Name)
                continue;
            const product = await prisma.product.create({
                data: {
                    businessId,
                    name: row.Name,
                    sku: row.SKU ? String(row.SKU) : null,
                    barcode: row.Barcode ? String(row.Barcode) : null,
                    category: row.Category || 'General',
                    price: Number(row.Price) || 0,
                    costPrice: Number(row.CostPrice) || 0
                }
            });
            if (targetLocationId) {
                await prisma.productInventory.create({
                    data: {
                        productId: product.id,
                        locationId: targetLocationId,
                        stock: Number(row.Stock) || 0,
                        reorderLevel: 5
                    }
                });
            }
            count++;
        }
        res.json({ success: true, count, message: count + ' products imported.' });
    }
    catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: 'Failed to import inventory' });
    }
});
router.post('/quick-add', async (req, res) => {
    try {
        const { businessId } = req.user;
        const { productId, quantity, locationId } = req.body;
        let targetLocationId = locationId;
        if (!targetLocationId) {
            const loc = await prisma.storeLocation.findFirst({ where: { businessId } });
            if (loc)
                targetLocationId = loc.id;
        }
        if (!targetLocationId)
            return res.status(400).json({ error: 'No location found' });
        const inv = await prisma.productInventory.findFirst({
            where: { productId, locationId: targetLocationId }
        });
        if (inv) {
            await prisma.productInventory.update({
                where: { id: inv.id },
                data: { stock: { increment: quantity } }
            });
        }
        else {
            await prisma.productInventory.create({
                data: {
                    productId,
                    locationId: targetLocationId,
                    stock: quantity,
                    reorderLevel: 5
                }
            });
        }
        // Note: Cloud Sync background engine picks this up naturally if we had an audit table, 
        // but for immediate sync we can simulate the push here: 
        console.log(`[Quick Add] Triggering immediate sync to cloud for Product ${productId} + ${quantity}`);
        res.json({ success: true, message: 'Stock added successfully' });
    }
    catch (error) {
        console.error('Quick Add error:', error);
        res.status(500).json({ error: 'Failed to add stock' });
    }
});
// Export Inventory to Excel
router.get('/export', async (req, res) => {
    try {
        const { businessId } = req.user;
        const { locationId } = req.query;
        const products = await prisma.product.findMany({
            where: { businessId },
            include: { inventory: { include: { location: true } } },
            orderBy: { name: 'asc' }
        });
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Whiz POS Server';
        workbook.created = new Date();
        const sheet = workbook.addWorksheet('Inventory', {
            views: [{ state: 'frozen', ySplit: 1 }]
        });
        sheet.columns = [
            { header: 'Product Name', key: 'name', width: 30 },
            { header: 'SKU', key: 'sku', width: 15 },
            { header: 'Barcode', key: 'barcode', width: 20 },
            { header: 'Category', key: 'category', width: 20 },
            { header: 'Cost Price', key: 'costPrice', width: 15 },
            { header: 'Selling Price', key: 'price', width: 15 },
            { header: 'Current Stock', key: 'stock', width: 15 },
        ];
        // Style the header row
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF2563EB' } // Tailwind Blue-600
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        products.forEach((p, index) => {
            let stock = 0;
            if (locationId) {
                const inv = p.inventory.find(i => i.locationId === locationId);
                stock = inv ? inv.stock : 0;
            }
            else {
                stock = p.inventory.reduce((sum, inv) => sum + inv.stock, 0);
            }
            const row = sheet.addRow({
                name: p.name,
                sku: p.sku || '',
                barcode: p.barcode || '',
                category: p.category || '',
                costPrice: p.costPrice,
                price: p.price,
                stock: stock
            });
            // Alternating row colors
            if (index % 2 === 1) {
                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF3F4F6' } // Tailwind Gray-100
                };
            }
            // Stock warning formatting
            const stockCell = row.getCell('stock');
            if (stock <= 5) {
                stockCell.font = { color: { argb: 'FFDC2626' }, bold: true }; // Tailwind Red-600
            }
            else {
                stockCell.font = { color: { argb: 'FF16A34A' }, bold: true }; // Tailwind Green-600
            }
            stockCell.alignment = { horizontal: 'center' };
        });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=' + 'Whiz_Inventory.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    }
    catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Failed to export inventory' });
    }
});
export default router;
