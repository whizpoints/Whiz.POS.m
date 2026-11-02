// @ts-nocheck
import { Router } from 'express';
import db from '../db.js';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import * as xlsx from 'xlsx';
import { authenticate } from '../middleware/auth.js';


const upload = multer({ storage: multer.memoryStorage() });

const router = Router();
// const prisma = new PrismaClient();


router.use(authenticate);

// Get all products
router.get('/', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { locationId } = req.query;
    
    const products = await (async () => {
      let prods = await db.selectFrom('Product').selectAll().where('businessId', '=', businessId).orderBy('name', 'asc').execute();
    if (prods.length === 0) {
      const anyProds = await db.selectFrom('Product').selectAll().orderBy('name', 'asc').execute();
      if (anyProds.length > 0) {
        console.log('[AutoHeal] Re-aligning ' + anyProds.length + ' products to business ' + businessId);
        await db.updateTable('Product').set({ businessId }).execute();
        await db.updateTable('Category').set({ businessId }).execute();
        await db.updateTable('StoreLocation').set({ businessId }).execute();
        prods = await db.selectFrom('Product').selectAll().where('businessId', '=', businessId).orderBy('name', 'asc').execute();
      }
    }
      const invs = await db.selectFrom('ProductInventory').selectAll().where('productId', 'in', prods.length > 0 ? prods.map(p => p.id) : ['']).execute();
      const locs = await db.selectFrom('StoreLocation').selectAll().where('businessId', '=', businessId).execute();
      for (const i of invs) {
        i.location = locs.find(l => l.id === i.locationId);
      }
      for (const p of prods) {
        p.inventory = invs.filter(i => i.productId === p.id);
      }
      return prods;
    })().catch(async () => []);

    const formatted = products.map(p => {
       const invList = (p.inventory && Array.isArray(p.inventory)) ? p.inventory : [];
       const totalStock = invList.reduce((sum: number, inv: any) => sum + (Number(inv.stock) || 0), 0);

       // Central Store stock is strictly where outletId is null
       let centralInvs = invList.filter((i: any) => !i.outletId);
       if (locationId && locationId !== 'ALL') {
         centralInvs = centralInvs.filter((i: any) => i.locationId === locationId);
       }
       const inStoreStock = centralInvs.reduce((sum: number, i: any) => sum + (Number(i.stock) || 0), 0);

       const outletId = req.query.outletId;
       let effectiveStock = inStoreStock;
       if (outletId && outletId !== 'ALL' && outletId !== 'CENTRAL' && outletId !== 'STORE') {
         const outInv = invList.find((i: any) => i.outletId === outletId);
         effectiveStock = outInv ? Number(outInv.stock) || 0 : 0;
       }

       return {
         ...p,
         stock: effectiveStock,
         inStoreStock,
         totalStock,
         outletStock: Math.max(0, totalStock - inStoreStock)
       };
    });

    res.json(formatted);
  } catch (error: any) {
    console.error('Inventory GET error:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

// Helper: resolve categoryId (ID or plain category string from frontend
async function resolveCategory(businessId: string, categoryId?: string, categoryFallback?: string): Promise<string | null> {
  if (categoryId) {
    try {
      const cat = await db.selectFrom('Category').selectAll().where('id', '=', categoryId).where('businessId', '=', businessId).executeTakeFirst();
      if (cat) return cat.name;
    } catch {}
  }
  return categoryFallback || null;
}

// Create product
router.post('/', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    let { sku, barcode, name, categoryId, category, price, costPrice, taxRate, stock, reorderLevel, locationId } = req.body;

    // Resolve category: prefer categoryId -> look up Category model, else use plain "category" string
    const resolvedCategory = await resolveCategory(businessId, categoryId, category);

    // Parse numeric values since they might come as strings from HTML inputs
    price = parseFloat(price) || 0;
    costPrice = parseFloat(costPrice) || 0;
    taxRate = parseFloat(taxRate) || 16.0;
    stock = parseInt(stock) || 0;
    reorderLevel = parseInt(reorderLevel) || 5;

    // Generate SKU if missing (Prisma requires it
    if (!sku) {
      sku = 'SKU-' + Date.now().toString(36).toUpperCase();
    }

    // Create product
    const product = await db.insertInto('Product').values({ id: randomUUID(), 
        businessId,
        sku,
        barcode: barcode || null,
        name,
        category: resolvedCategory,
        price,
        costPrice: costPrice || 0,
        taxRate,
        reorderLevel
       }).returningAll().executeTakeFirstOrThrow();

    // Create inventory
    let targetLocationId = locationId;
    if (!targetLocationId) {
      try {
        const loc = await db.selectFrom('StoreLocation').selectAll().where('businessId', '=', businessId).executeTakeFirst();
        if (loc) targetLocationId = loc.id;
      } catch {}
    }

    if (targetLocationId) {
       try {
         await db.insertInto('ProductInventory').values({ id: randomUUID(), 
             productId: product.id,
             locationId: targetLocationId,
             outletId: null,
             stock: stock || 0,
             reorderLevel: reorderLevel || 5
            }).returningAll().executeTakeFirstOrThrow();
       } catch (invErr: any) {
         console.warn('Inventory record creation skipped:', invErr?.message || invErr);
       }
    }

    res.json({ ...product, stock: stock || 0 });
  } catch (error: any) {
    console.error('Inventory POST error:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

// Update product
router.put('/:id', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { id } = req.params;
    let { sku, barcode, name, categoryId, category, price, costPrice, taxRate, stock, reorderLevel, locationId } = req.body;

    const resolvedCategory = await resolveCategory(businessId, categoryId, category);

    // Parse numeric values
    price = parseFloat(price) || 0;
    costPrice = parseFloat(costPrice) || 0;
    taxRate = parseFloat(taxRate) || 16.0;
    stock = parseInt(stock) || 0;
    reorderLevel = parseInt(reorderLevel) || 5;

    const updateData: any = {
      name,
      price,
      costPrice: costPrice || 0,
      taxRate,
      reorderLevel
    };
    if (sku !== undefined) updateData.sku = sku;
    if (barcode !== undefined) updateData.barcode = barcode || null;
    if (resolvedCategory !== undefined) updateData.category = resolvedCategory;

    updateData.updatedAt = new Date().toISOString();
    await db.updateTable('Product').set(updateData).where('id', '=', id).where('businessId', '=', businessId).execute();

    // Update inventory if locationId is provided
    let targetLocationId = locationId;
    if (!targetLocationId) {
      try {
        const loc = await db.selectFrom('StoreLocation').selectAll().where('businessId', '=', businessId).executeTakeFirst();
        if (loc) targetLocationId = loc.id;
      } catch {}
    }

    if (targetLocationId && stock !== undefined) {
      try {
        // Strict boundary: Inventory updates from the main catalog strictly update Central Store stock (outletId is null)
        const existingInventory = await db.selectFrom('ProductInventory')
          .selectAll()
          .where('productId', '=', id)
          .where('outletId', 'is', null)
          .executeTakeFirst();
        
        const oldStock = existingInventory ? Number(existingInventory.stock || 0) : 0;
        const newStock = Number(stock) || 0;
        const variance = newStock - oldStock;
        const now = new Date().toISOString();
        
        if (existingInventory) {
          await db.updateTable('ProductInventory')
            .set({ stock: newStock, reorderLevel: reorderLevel || 5, updatedAt: now })
            .where('id', '=', existingInventory.id)
            .execute();
        } else {
          await db.insertInto('ProductInventory').values({
            id: randomUUID(),
            productId: id,
            locationId: targetLocationId,
            outletId: null,
            stock: newStock,
            reorderLevel: reorderLevel || 5,
            updatedAt: now
          }).execute();
        }
        
        if (variance !== 0 || !existingInventory) {
           await db.insertInto('StockMovement').values({ 
               id: `adj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
               businessId,
               productId: id,
               locationId: targetLocationId,
               outletId: null,
               type: variance > 0 ? 'ADJUSTMENT_UP' : 'ADJUSTMENT_DOWN',
               quantity: Math.abs(variance),
               reference: 'Central Store Stock Adjustment',
               sourceTerminal: 'SERVER',
               timestamp: now,
               updatedAt: now
           }).execute();
        }
      } catch (invErr: any) {
        console.warn('Inventory update skipped:', invErr?.message || invErr);
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Inventory PUT error:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

// Delete product
router.delete('/:id', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { id } = req.params;
    await db.deleteFrom('Product').where('id', '=', id).where('businessId', '=', businessId).execute();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/template/products', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const categories = await db.selectFrom('Category').selectAll().where('businessId', '=', businessId).execute();
    const products = await db.selectFrom('Product').selectAll().where('businessId', '=', businessId).orderBy('name', 'asc').execute();

    const workbook = new (await import('exceljs')).default.Workbook();
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

    const workbook = new (await import('exceljs')).default.Workbook();
    await workbook.xlsx.load(req.file.buffer);
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

      const existingProduct = await db.selectFrom('Product').selectAll().where('businessId', '=', businessId).where((eb) => eb.or([eb('sku', '=', sku), eb('name', '=', name)])).executeTakeFirst();

      if (existingProduct) {
        await db.updateTable('Product').set({ name, barcode, category: categoryName, price, costPrice, taxRate, reorderLevel }).where('id', '=', existingProduct.id).execute();
      } else {
        await db.insertInto('Product').values({ id: randomUUID(),  businessId, sku, barcode, name, category: categoryName, price, costPrice, taxRate, reorderLevel  }).returningAll().executeTakeFirstOrThrow();
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
      const loc = await db.selectFrom('StoreLocation').selectAll().where('businessId', '=', businessId).executeTakeFirst();
      if (loc) targetLocationId = loc.id;
    }

    const products = await (async () => {
      const prods = await db.selectFrom('Product').selectAll().where('businessId', '=', businessId).orderBy('name', 'asc').execute();
      const invs = await db.selectFrom('ProductInventory').selectAll().where('locationId', '=', targetLocationId).where('productId', 'in', prods.length > 0 ? prods.map(p => p.id) : ['']).execute();
      for (const p of prods) {
        p.inventory = invs.filter(i => i.productId === p.id);
      }
      return prods;
    })();

    const workbook = new (await import('exceljs')).default.Workbook();
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
      const loc = await db.selectFrom('StoreLocation').selectAll().where('businessId', '=', businessId).executeTakeFirst();
      if (loc) targetLocationId = loc.id;
    }
    if (!targetLocationId) return res.status(400).json({ error: 'No location found' });

    const workbook = new (await import('exceljs')).default.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.getWorksheet('Stock Audit') || workbook.worksheets[0];

    let count = 0;
    const rows = sheet.getRows(2, sheet.rowCount) || [];
    
    for (const row of rows) {
      const productId = row.getCell(1).text?.trim();
      if (!productId) continue;

      const addAmount = Number(row.getCell(6).value) || 0;
      const deductAmount = Number(row.getCell(7).value) || 0;
      
      const delta = addAmount - deductAmount;
      if (delta === 0) continue; 

      const inv = await db.selectFrom('ProductInventory').selectAll().where('productId', '=', productId).where('locationId', '=', targetLocationId).executeTakeFirst();

      if (inv) {
        await db.updateTable('ProductInventory').set((eb) => ({ stock: eb('stock', '+', delta) })).where('id', '=', inv.id).execute();
      } else {
        await db.insertInto('ProductInventory').values({ id: randomUUID(),  productId, locationId: targetLocationId, stock: delta, reorderLevel: 5  }).returningAll().executeTakeFirstOrThrow();
      }
      
      try {
        const outletId = req.query.outletId || req.body.outletId || inv?.outletId || null;
        await db.insertInto('StockMovement').values({ id: randomUUID(), 
            businessId,
            productId,
            locationId: targetLocationId,
            outletId: String(outletId) !== 'undefined' && outletId !== null ? String(outletId) : null,
            type: delta > 0 ? 'in' : 'out',
            quantity: Math.abs(delta),
            reference: 'Excel Bulk Reconciliation',
            sourceTerminal: 'SERVER',
              timestamp: new Date().toISOString(),
              updatedAt: new Date().toISOString()
             }).execute();
      } catch (e) { }

      count++;
    }

    res.json({ success: true, count, message: `Successfully processed stock adjustments for ${count} products.` });
  } catch (error) {
    console.error('Import reconciliation error:', error);
    res.status(500).json({ error: 'Failed to process stock adjustments' });
  }
});

router.post('/quick-add', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { productId, quantity, locationId } = req.body;
    
    let targetLocationId = locationId;
    if (!targetLocationId) {
      const loc = await db.selectFrom('StoreLocation').selectAll().where('businessId', '=', businessId).executeTakeFirst();
      if (loc) targetLocationId = loc.id;
    }

    if (!targetLocationId) return res.status(400).json({ error: 'No location found' });

    const now = new Date().toISOString();
    // Strictly update Central Store (outletId is null)
    const inv = await db.selectFrom('ProductInventory')
      .selectAll()
      .where('productId', '=', productId)
      .where('outletId', 'is', null)
      .executeTakeFirst();

    if (inv) {
      await db.updateTable('ProductInventory')
        .set((eb) => ({ stock: eb('stock', '+', quantity), updatedAt: now }))
        .where('id', '=', inv.id)
        .execute();
    } else {
      await db.insertInto('ProductInventory').values({
        id: randomUUID(),
        productId,
        locationId: targetLocationId,
        outletId: null,
        stock: quantity,
        reorderLevel: 5,
        updatedAt: now
      }).execute();
    }

    await db.insertInto('StockMovement').values({
        id: `grn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        businessId,
        productId,
        locationId: targetLocationId,
        outletId: null,
        type: 'PURCHASE',
        quantity: quantity,
        reference: 'Stock Received into Central Store',
        sourceTerminal: 'SERVER',
        timestamp: now,
        updatedAt: now
    }).execute();

    res.json({ success: true, message: 'Stock added successfully' });
  } catch (error) {
    console.error('Quick Add error:', error);
    res.status(500).json({ error: 'Failed to add stock' });
  }
});


// Receive stock into Central Store (GRN)
router.post('/receive-stock', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { productId, quantity: rawQty, costPrice, referenceNote, locationId } = req.body;

    const quantity = parseInt(rawQty, 10);
    if (isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive integer' });
    }

    const product = await db.selectFrom('Product').selectAll().where('id', '=', productId).executeTakeFirst();
    if (!product) return res.status(404).json({ error: 'Product not found' });

    let targetLocationId = locationId;
    if (!targetLocationId) {
      const loc = await db.selectFrom('StoreLocation').selectAll().where('businessId', '=', businessId).executeTakeFirst();
      if (loc) targetLocationId = loc.id;
    }
    if (!targetLocationId) return res.status(400).json({ error: 'No location found' });

    const now = new Date().toISOString();
    const centralInv = await db.selectFrom('ProductInventory')
      .selectAll()
      .where('productId', '=', productId)
      .where('outletId', 'is', null)
      .executeTakeFirst();

    let newStock = quantity;
    if (centralInv) {
      newStock = Number(centralInv.stock || 0) + quantity;
      await db.updateTable('ProductInventory')
        .set({ stock: newStock, updatedAt: now })
        .where('id', '=', centralInv.id)
        .execute();
    } else {
      await db.insertInto('ProductInventory').values({
        id: randomUUID(),
        productId,
        locationId: targetLocationId,
        outletId: null,
        stock: quantity,
        reorderLevel: 5,
        updatedAt: now
      }).execute();
    }

    // Update cost price on product if specified
    if (costPrice !== undefined && !isNaN(Number(costPrice)) && Number(costPrice) > 0) {
      await db.updateTable('Product')
        .set({ costPrice: Number(costPrice), updatedAt: now })
        .where('id', '=', productId)
        .execute();
    }

    // Log StockMovement
    await db.insertInto('StockMovement').values({
      id: `grn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      businessId,
      productId,
      locationId: targetLocationId,
      outletId: null,
      type: 'PURCHASE',
      quantity,
      reference: referenceNote || 'Goods Received Note (GRN) into Central Store',
      sourceTerminal: 'SERVER',
      timestamp: now,
      updatedAt: now
    }).execute();

    const io = req.app.get('io');
    if (io) {
      io.emit('stock_updated', { productId, inStoreStock: newStock });
    }

    res.json({ success: true, inStoreStock: newStock, message: 'Stock received into Central Store successfully' });
  } catch (error: any) {
    console.error('Receive stock error:', error);
    res.status(500).json({ error: error.message || 'Failed to receive stock' });
  }
});

export default router;
