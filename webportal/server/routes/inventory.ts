import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import * as xlsx from 'xlsx';
import ExcelJS from 'exceljs';

const upload = multer({ dest: 'uploads/' });

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const authenticate = (req: any, res: any, next: any) => {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }
  
  if (!token) return res.status(401).json({ error: 'Missing authorization header or token' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

router.use(authenticate);

// Get all products
router.get('/', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { locationId } = req.query;
    
    const products = await prisma.product.findMany({
      where: { businessId },
      include: { inventory: { include: { location: true } } },
      orderBy: { name: 'asc' }
    });

    const formatted = products.map(p => {
       const totalStock = p.inventory.reduce((sum: number, inv: any) => sum + inv.stock, 0);
       const inStoreInv = p.inventory.find(i => i.outletId === null);
       const inStoreStock = inStoreInv ? inStoreInv.stock : 0;
       
       return { ...p, stock: totalStock, totalStock, inStoreStock };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Inventory GET error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create product
router.post('/', async (req: any, res: any) => {
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
      if (loc) targetLocationId = loc.id;
    }

    if (targetLocationId) {
       await prisma.productInventory.create({
         data: {
           productId: product.id,
           locationId: targetLocationId,
           outletId: null,
           stock: stock || 0,
           reorderLevel: reorderLevel || 5
         }
       });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update product
router.put('/:id', async (req: any, res: any) => {
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
      if (loc) targetLocationId = loc.id;
    }

    if (targetLocationId && stock !== undefined) {
      const existingInventory = await prisma.productInventory.findFirst({
        where: { productId: id, locationId: targetLocationId, outletId: null }
      });
      if (existingInventory) {
        await prisma.productInventory.update({
          where: { id: existingInventory.id },
          data: { stock: stock || 0, reorderLevel: reorderLevel || 5 }
        });
      } else {
        await prisma.productInventory.create({
          data: { productId: id, locationId: targetLocationId, outletId: null, stock: stock || 0, reorderLevel: reorderLevel || 5 }
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete product
router.delete('/:id', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { id } = req.params;
    await prisma.product.deleteMany({
      where: { id, businessId }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/import', upload.single('file'), async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { locationId } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    let targetLocationId = locationId;
    if (!targetLocationId) {
      const loc = await prisma.storeLocation.findFirst({ where: { businessId } });
      if (loc) targetLocationId = loc.id;
    }

    const workbook = xlsx.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data: any[] = xlsx.utils.sheet_to_json(sheet);

    let count = 0;
    for (const row of data) {
      if (!row.Name) continue;
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
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Failed to import inventory' });
  }
});

router.post('/quick-add', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { productId, quantity, locationId } = req.body;
    
    let targetLocationId = locationId;
    if (!targetLocationId) {
      const loc = await prisma.storeLocation.findFirst({ where: { businessId } });
      if (loc) targetLocationId = loc.id;
    }

    if (!targetLocationId) return res.status(400).json({ error: 'No location found' });

    const inv = await prisma.productInventory.findFirst({
      where: { productId, locationId: targetLocationId }
    });

    if (inv) {
      await prisma.productInventory.update({
        where: { id: inv.id },
        data: { stock: { increment: quantity } }
      });
    } else {
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
  } catch (error) {
    console.error('Quick Add error:', error);
    res.status(500).json({ error: 'Failed to add stock' });
  }
});

// Export Inventory to Excel
router.get('/export', async (req: any, res: any) => {
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
      } else {
        stock = p.inventory.reduce((sum: number, inv: any) => sum + inv.stock, 0);
        }

      sheet.addRow({
        name: p.name,
        sku: p.sku || '',
        barcode: p.barcode || '',
        category: p.category || '',
        costPrice: p.costPrice || 0,
        price: p.price || 0,
        stock: stock
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Whiz_Inventory_Export.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export inventory' });
  }
});

router.get('/template/products', async (req: any, res: any) => {
    try {
      const { businessId } = req.user;
      const categories = await prisma.category.findMany({ where: { businessId } });
      const products = await prisma.product.findMany({ where: { businessId }, orderBy: { name: 'asc' } });
  
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Whiz POS Server';
  
      // MUST ADD PRODUCTS SHEET FIRST so it's the active sheet when opened
      const sheet = workbook.addWorksheet('Products', { views: [{ state: 'frozen', ySplit: 1 }] });
      sheet.columns = [
        { header: 'Product Name', key: 'name', width: 30 },
        { header: 'SKU (Leave blank to auto-generate)', key: 'sku', width: 35 },
        { header: 'Barcode', key: 'barcode', width: 20 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Selling Price', key: 'price', width: 15 },
        { header: 'Cost Price', key: 'costPrice', width: 15 },
        { header: 'Tax Rate (%)', key: 'taxRate', width: 15 },
        { header: 'Reorder Level', key: 'reorderLevel', width: 15 },
      ];
  
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
  
      // Pre-fill existing products
      products.forEach((p: any) => {
        sheet.addRow({
          name: p.name,
          sku: p.sku,
          barcode: p.barcode,
          category: p.category,
          price: p.price,
          costPrice: p.costPrice,
          taxRate: p.taxRate,
          reorderLevel: p.reorderLevel,
        });
      });
  
      // Add category sheet SECOND so it's hidden and not the default
      const catSheet = workbook.addWorksheet('_Categories', { state: 'hidden' });
      const catList = categories.map((c: any) => c.name);
      if (!catList.includes('General')) catList.push('General');
      catSheet.getColumn(1).values = ['CategoryList', ...catList];
  
      const totalRows = Math.max(1000, products.length + 1000);
      for (let i = 2; i <= totalRows; i++) {
        sheet.getCell(`D${i}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['_Categories!$A$2:$A$500']
        };
      }
  
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=Whiz_Product_Template.xlsx');
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Template products error:', error);
      res.status(500).json({ error: 'Failed to generate template' });
    }
  });
  
  router.post('/import/products', upload.single('file'), async (req: any, res: any) => {
    try {
      const { businessId } = req.user;
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer || require('fs').readFileSync(req.file.path));
      const sheet = workbook.getWorksheet('Products') || workbook.worksheets[0];
  
      let count = 0;
      const rows = sheet.getRows(2, sheet.rowCount) || [];
      
      for (const row of rows) {
        const name = row.getCell(1).text?.trim();
        if (!name) continue;
  
        let sku = row.getCell(2).text?.trim();
        if (!sku) {
          sku = 'SKU-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        }
  
        const barcode = row.getCell(3).text?.trim() || null;
        const categoryName = row.getCell(4).text?.trim() || 'General';
        const price = Number(row.getCell(5).value) || 0;
        const costPrice = Number(row.getCell(6).value) || 0;
        const taxRate = Number(row.getCell(7).value) || 16.0;
        const reorderLevel = Number(row.getCell(8).value) || 5;
  
        const existingProduct = await prisma.product.findFirst({
          where: { businessId, OR: [{ sku }, { name }] }
        });
  
        if (existingProduct) {
          await prisma.product.update({
            where: { id: existingProduct.id },
            data: { name, barcode, category: categoryName, price, costPrice, taxRate, reorderLevel }
          });
        } else {
          await prisma.product.create({
            data: { businessId, sku, barcode, name, category: categoryName, price, costPrice, taxRate, reorderLevel }
          });
        }
        count++;
      }
  
      res.json({ success: true, count, message: `Successfully imported ${count} products.` });
    } catch (error) {
      console.error('Import products error:', error);
      res.status(500).json({ error: 'Failed to import products' });
    }
  });
  
  router.get('/template/reconciliation', async (req: any, res: any) => {
    try {
      const { businessId } = req.user;
      const { locationId } = req.query;
  
      let targetLocationId = locationId;
      if (!targetLocationId) {
        const loc = await prisma.storeLocation.findFirst({ where: { businessId } });
        if (loc) targetLocationId = loc.id;
      }
  
      const products = await prisma.product.findMany({
        where: { businessId },
        include: { inventory: { where: { locationId: targetLocationId } } },
        orderBy: { name: 'asc' }
      });
  
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Stock Audit', { views: [{ state: 'frozen', ySplit: 1 }] });
      sheet.columns = [
        { header: 'Product ID (DO NOT EDIT)', key: 'id', width: 30 },
        { header: 'Product Name', key: 'name', width: 30 },
        { header: 'SKU', key: 'sku', width: 20 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Current System Stock', key: 'current', width: 20 },
        { header: 'Amount to Add (+)', key: 'add', width: 20 },
        { header: 'Amount to Deduct (-)', key: 'deduct', width: 20 },
      ];
  
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } };
  
      products.forEach((p: any) => {
        const stock = p.inventory[0]?.stock || 0;
        const row = sheet.addRow({
          id: p.id,
          name: p.name,
          sku: p.sku || '',
          category: p.category || '',
          current: stock,
          add: 0,
          deduct: 0
        });
        row.getCell('id').font = { color: { argb: 'FF9CA3AF' } }; 
        row.getCell('add').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
        row.getCell('deduct').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
      });
  
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=Whiz_Stock_Audit.xlsx');
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Template reconciliation error:', error);
      res.status(500).json({ error: 'Failed to generate template' });
    }
  });
  
  router.post('/import/reconciliation', upload.single('file'), async (req: any, res: any) => {
    try {
      const { businessId } = req.user;
      const { locationId } = req.body;
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
      let targetLocationId = locationId;
      if (!targetLocationId) {
        const loc = await prisma.storeLocation.findFirst({ where: { businessId } });
        if (loc) targetLocationId = loc.id;
      }
      if (!targetLocationId) return res.status(400).json({ error: 'No location found' });
  
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer || require('fs').readFileSync(req.file.path));
      const sheet = workbook.getWorksheet('Stock Audit') || workbook.worksheets[0];
  
      let count = 0;
      const rows = sheet.getRows(2, sheet.rowCount) || [];
      
      for (const row of rows) {
        const productId = row.getCell(1).text?.trim();
        if (!productId) continue;
  
        const addAmount = Number(row.getCell(6).value) || 0;
        const deductAmount = Number(row.getCell(7).value) || 0;
        
        if (addAmount === 0 && deductAmount === 0) continue;
  
        const inv = await prisma.productInventory.findFirst({
          where: { productId, locationId: targetLocationId }
        });
  
        if (inv) {
          await prisma.productInventory.update({
            where: { id: inv.id },
            data: { stock: { increment: addAmount - deductAmount } }
          });
        }
        count++;
      }
  
      res.json({ success: true, message: `Successfully updated stock for ${count} products.` });
    } catch (error) {
      console.error('Import reconciliation error:', error);
      res.status(500).json({ error: 'Failed to process audit sheet' });
    }
  });
  
  export default router;
