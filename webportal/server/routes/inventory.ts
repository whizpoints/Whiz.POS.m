import prisma from '../db.js';

import { Router } from 'express';

import jwt from 'jsonwebtoken';

import multer from 'multer';

import * as xlsx from 'xlsx';

import ExcelJS from 'exceljs';



const upload = multer({ dest: 'uploads/' });



const router = Router();

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

    const { locationId, outletId } = req.query;

    

    const business = await prisma.business.findUnique({ where: { id: businessId } });

    let bSettings: any = {};

    try { bSettings = typeof business?.settings === 'string' ? JSON.parse(business.settings) : (business?.settings || {}); } catch(e) {}

    const isShared = bSettings.inventoryMode === 'SHARED' || bSettings.sharedInventory === true;



    const products = await prisma.product.findMany({

      where: { businessId },

      include: { inventory: { include: { location: true, outlet: true } } },

      orderBy: { name: 'asc' }

    });



    const formatted = products.map(p => {

       const totalStock = p.inventory.reduce((sum: number, inv: any) => sum + (inv.stock || 0), 0);

       if (isShared) {

          return { ...p, stock: totalStock, totalStock, inStoreStock: totalStock, outletStock: totalStock };

       }

       let inStoreStock = 0;

       if (outletId === 'CENTRAL') {

          const centralInv = p.inventory.find((i: any) => i.outletId === null);

          inStoreStock = centralInv ? centralInv.stock : 0;

       } else if (outletId && outletId !== 'ALL') {

          const outInv = p.inventory.find((i: any) => i.outletId === outletId);

          inStoreStock = outInv ? outInv.stock : 0;

       } else if (locationId && locationId !== 'ALL') {

          const locInvs = p.inventory.filter((i: any) => i.locationId === locationId);

          inStoreStock = locInvs.reduce((sum: number, i: any) => sum + (i.stock || 0), 0);

       } else {

          const inStoreInv = p.inventory.find((i: any) => i.outletId === null) || p.inventory[0];

          inStoreStock = inStoreInv ? inStoreInv.stock : totalStock;

       }

       

       return { ...p, stock: totalStock, totalStock, inStoreStock };

    });



    res.json(formatted);

  } catch (error) {

    console.error('Inventory GET error:', error);

    res.status(500).json({ error: 'Internal server error' });

  }

});




async function getNextSequentialSku(businessId: string, offset = 0): Promise<string> {
  try {
    const products = await prisma.product.findMany({
      where: { businessId },
      select: { sku: true }
    });

    let maxNum = 0;
    for (const p of products) {
      if (!p.sku) continue;
      const matches = p.sku.match(/(\d+)/g);
      if (matches) {
        const lastDigits = matches[matches.length - 1];
        const n = parseInt(lastDigits, 10);
        if (!isNaN(n) && n > maxNum) {
          maxNum = n;
        }
      }
    }

    const nextNum = maxNum + 1 + offset;
    return `SKU-${String(nextNum).padStart(5, '0')}`;
  } catch (err) {
    return `SKU-${String(1 + offset).padStart(5, '0')}`;
  }
}

async function ensureCategoryExists(businessId: string, categoryName?: string | null) {
  if (!categoryName || typeof categoryName !== 'string') return;
  const trimmed = categoryName.trim();
  if (!trimmed || trimmed.toLowerCase() === 'general') return;

  try {
    const existing = await prisma.category.findFirst({
      where: { businessId, name: trimmed }
    });

    if (!existing) {
      await prisma.category.create({
        data: {
          businessId,
          name: trimmed,
          color: '#3B82F6'
        }
      });
    }
  } catch (err) {
    console.error('ensureCategoryExists error:', err);
  }
}

// Get next auto-sequenced SKU
router.get('/next-sku', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const nextSku = await getNextSequentialSku(businessId);
    res.json({ nextSku });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// Create product

router.post('/', async (req: any, res: any) => {

  try {

    const { businessId } = req.user;

    let { sku, barcode, name, category, price, costPrice, taxRate, stock, reorderLevel, locationId } = req.body;

    if (!sku || (typeof sku === 'string' && sku.trim() === '')) {
      sku = await getNextSequentialSku(businessId);
    }
    if (category) {
      await ensureCategoryExists(businessId, category);
    }

    

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



    const io = req.app.get('io');

      if (io && req.user && req.user.businessId) {

        io.to(`business_${req.user.businessId}`).emit('cloud_transaction_created', { type: 'INVENTORY_UPDATE', timestamp: new Date().toISOString(), businessId: req.user.businessId });

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



    const io = req.app.get('io');

      if (io && req.user && req.user.businessId) {

        io.to(`business_${req.user.businessId}`).emit('cloud_transaction_created', { type: 'INVENTORY_UPDATE', timestamp: new Date().toISOString(), businessId: req.user.businessId });

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

    const io = req.app.get('io');

      if (io && req.user && req.user.businessId) {

        io.to(`business_${req.user.businessId}`).emit('cloud_transaction_created', { type: 'INVENTORY_UPDATE', timestamp: new Date().toISOString(), businessId: req.user.businessId });

      }

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
      let missingSkuOffset = 0;

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

    const { productId, quantity, locationId, outletId } = req.body;

    

    let targetLocationId = locationId;

    let targetOutletId = outletId || null;



    if (targetOutletId) {

      const outlet = await prisma.outlet.findFirst({ where: { id: targetOutletId, businessId } });

      if (outlet && outlet.locationId) {

        targetLocationId = outlet.locationId;

      }

    }



    if (!targetLocationId) {

      const loc = await prisma.storeLocation.findFirst({ where: { businessId } });

      if (loc) targetLocationId = loc.id;

    }



    if (!targetLocationId) return res.status(400).json({ error: 'No location found' });



    const numQty = Number(quantity);

    if (isNaN(numQty)) return res.status(400).json({ error: 'Invalid quantity' });



    const invWhere: any = { productId, locationId: targetLocationId, outletId: targetOutletId || null };



    let inv = await prisma.productInventory.findFirst({ where: invWhere });



    if (inv) {

      inv = await prisma.productInventory.update({

        where: { id: inv.id },

        data: { stock: { increment: numQty }, updatedAt: new Date() }

      });

    } else {

      inv = await prisma.productInventory.create({

        data: {

          productId,

          locationId: targetLocationId,

          outletId: targetOutletId || null,

          stock: numQty,

          reorderLevel: 5

        }

      });

    }



    const { randomUUID } = await import('crypto');

    await prisma.stockMovement.create({

      data: {

        id: `adj_${Date.now()}_${randomUUID().substring(0, 8)}`,

        businessId,

        productId,

        locationId: targetLocationId,

        outletId: targetOutletId,

        type: numQty >= 0 ? 'ADJUSTMENT_UP' : 'ADJUSTMENT_DOWN',

        quantity: Math.abs(numQty),

        reference: 'Quick Add from Web Portal',

        timestamp: new Date()

      }

    });



    const io = req.app.get('io');

    if (io) {

      io.to(`business_${businessId}`).emit('downward_sync_event', {

        type: 'STOCK_ADJUSTMENT',

        outletId: targetOutletId,

        productId,

        delta: numQty

      });

    }



    res.json({ success: true, message: 'Stock added successfully', stock: inv.stock });

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
          sku = await getNextSequentialSku(businessId, missingSkuOffset++);
        }

  

        const barcode = row.getCell(3).text?.trim() || null;

        const categoryName = row.getCell(4).text?.trim() || 'General';
        await ensureCategoryExists(businessId, categoryName);

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



  // Receive stock into Central Store or Direct to Inventory (GRN)

  router.post('/receive-stock', async (req: any, res: any) => {

    try {

      const { businessId } = req.user;

      const { productId, quantity: rawQty, costPrice, referenceNote, locationId, destinationType, destinationOutletId } = req.body;



      const quantity = parseInt(rawQty, 10);

      if (isNaN(quantity) || quantity <= 0) {

        return res.status(400).json({ error: 'Quantity must be a positive integer' });

      }



      const product = await prisma.product.findFirst({ where: { id: productId, businessId } });

      if (!product) return res.status(404).json({ error: 'Product not found' });



      let targetLocationId = locationId;

      if (!targetLocationId) {

        const loc = await prisma.storeLocation.findFirst({ where: { businessId } });

        if (loc) targetLocationId = loc.id;

      }

      if (!targetLocationId) return res.status(400).json({ error: 'No location found' });



      const business = await prisma.business.findUnique({ where: { id: businessId } });

      let bSettings: any = {};

      try { bSettings = typeof business?.settings === 'string' ? JSON.parse(business.settings) : (business?.settings || {}); } catch(e) {}

      const isShared = bSettings.inventoryMode === 'SHARED' || bSettings.sharedInventory === true;

      const hasCentralStore = bSettings.hasCentralStore !== false;



      let targetOutletId: string | null = null;

      let isDirect = false;

      if (destinationType === 'OUTLET' && destinationOutletId) {

        targetOutletId = destinationOutletId;

        isDirect = true;

      } else if (destinationType === 'SHARED' || !hasCentralStore || isShared) {

        targetOutletId = null;

        isDirect = true;

      } else {

        targetOutletId = null;

        isDirect = false;

      }



      const now = new Date();

      const existingInv = await prisma.productInventory.findFirst({

        where: { productId, outletId: targetOutletId }

      });



      let updatedInv;

      if (existingInv) {

        updatedInv = await prisma.productInventory.update({

          where: { id: existingInv.id },

          data: { stock: { increment: quantity }, updatedAt: now }

        });

      } else {

        updatedInv = await prisma.productInventory.create({

          data: {

            productId,

            locationId: targetLocationId,

            outletId: targetOutletId,

            stock: quantity,

            reorderLevel: 5

          }

        });

      }



      if (costPrice !== undefined && !isNaN(Number(costPrice)) && Number(costPrice) > 0) {

        await prisma.product.update({

          where: { id: productId },

          data: { costPrice: Number(costPrice), updatedAt: now }

        });

      }



      const defaultRef = isDirect 

        ? (targetOutletId ? 'Goods Received Note (GRN) Direct to Outlet' : 'Goods Received Note (GRN) Direct to Inventory')

        : 'Goods Received Note (GRN) into Central Store';



      const { randomUUID } = await import('crypto');

      await prisma.stockMovement.create({

        data: {

          id: `grn_${Date.now()}_${randomUUID().substring(0, 8)}`,

          businessId,

          productId,

          locationId: targetLocationId,

          outletId: targetOutletId,

          type: 'PURCHASE',

          quantity,

          reference: referenceNote || defaultRef,

          timestamp: now

        }

      });



      const io = req.app.get('io');

      if (io) {

        io.to(`business_${businessId}`).emit('downward_sync_event', {

          type: 'STOCK_RECEIVED',

          productId,

          stock: updatedInv.stock,

          inStoreStock: updatedInv.stock,

          outletId: targetOutletId

        });

        io.to(`business_${businessId}`).emit('cloud_transaction_created', {

          type: 'INVENTORY_UPDATE',

          timestamp: now.toISOString(),

          businessId

        });

      }



      const successMsg = isDirect ? 'Stock received directly into Inventory successfully' : 'Stock received into Central Store successfully';

      res.json({ success: true, inStoreStock: updatedInv.stock, stock: updatedInv.stock, message: successMsg });

    } catch (error: any) {

      console.error('Receive stock error:', error);

      res.status(500).json({ error: error.message || 'Failed to receive stock' });

    }

  });

  

  export default router;

