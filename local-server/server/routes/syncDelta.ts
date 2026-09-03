// @ts-nocheck
import { Router } from 'express';
import db from '../db.js';
import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const router = Router();


// Middleware to authenticate sync requests
const authenticate = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];

  if (apiKey) {
    // Check if it's a Business API Key
    let business = await db.selectFrom('Business').selectAll().where('apiKey', '=', apiKey).executeTakeFirst();
    let outletId = undefined;
    let locationId = undefined;

    // If not a business, check if it's a Terminal API Key
    if (!business) {
      const terminal = await db.selectFrom('Terminal').selectAll().where('apiKey', '=', apiKey).executeTakeFirst();
      if (terminal && terminal.outletId) {
        const outlet = await db.selectFrom('Outlet').selectAll().where('id', '=', terminal.outletId).executeTakeFirst();
        if (outlet) {
          business = await db.selectFrom('Business').selectAll().where('id', '=', outlet.businessId).executeTakeFirst();
          outletId = outlet.id;
          locationId = outlet.locationId;
        }
      }
    }

    if (!business) {
      console.log(`[SYNC ERROR] Invalid API Key: ${apiKey}`);
      return res.status(401).json({ error: 'Invalid API Key' });
    }
    
    req.user = { businessId: business.id, outletId, locationId };
    return next();
  }

  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header or API key' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, (process.env.JWT_SECRET || 'fallback_secret'));
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

  // Endpoint for the admin UI SyncLogs page
  router.get('/logs', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
      const token = authHeader.split(' ')[1];
      const decoded: any = jwt.verify(token, (process.env.JWT_SECRET || 'fallback_secret')); // Will throw if invalid JWT
      const logs = await db.selectFrom('SyncLog')
          .selectAll()
          .where('businessId', '=', decoded.businessId || decoded.id)
          .orderBy('createdAt', 'desc')
          .limit(100)
          .execute();
      res.json({ success: true, logs });
    } catch (err) {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  });

router.use(authenticate);

// 1. GET /api/sync/delta?since={timestamp} (PULL)
router.get('/', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { since, locationId, outletId } = req.query;
    
    if (!since) return res.status(400).json({ error: 'Missing "since" timestamp parameter' });

    const sinceDate = new Date(since);

    
    let usersQuery = db.selectFrom('User').selectAll().where('businessId', '=', businessId).where('updatedAt', '>', sinceDate.toISOString());
    if (req.user.outletId) {
      usersQuery = usersQuery.where((eb) => eb.or([
        eb('outletId', '=', req.user.outletId),
        eb('role', '=', 'ADMIN'),
        eb('role', '=', 'MANAGER')
      ]));
    }
    
    let productsQuery = db.selectFrom('Product').selectAll().where('businessId', '=', businessId);
    if (req.user.outletId) {
      productsQuery = productsQuery.where((eb) => eb.exists(
        eb.selectFrom('ProductInventory')
          .select('id')
          .whereRef('ProductInventory.productId', '=', 'Product.id')
          .where('ProductInventory.outletId', '=', req.user.outletId)
      )).where((eb) => eb.or([
        eb('updatedAt', '>', sinceDate.toISOString()),
        eb.exists(
          eb.selectFrom('ProductInventory')
            .select('id')
            .whereRef('ProductInventory.productId', '=', 'Product.id')
            .where('ProductInventory.outletId', '=', req.user.outletId)
            .where('ProductInventory.updatedAt', '>', sinceDate.toISOString())
        )
      ]));
    } else {
      productsQuery = productsQuery.where('updatedAt', '>', sinceDate.toISOString());
    }

    let inventoryQuery = db.selectFrom('ProductInventory')
        .innerJoin('Product', 'Product.id', 'ProductInventory.productId')
        .selectAll('ProductInventory')
        .where('Product.businessId', '=', businessId)
        .where('ProductInventory.updatedAt', '>', sinceDate.toISOString());
    if (locationId) inventoryQuery = inventoryQuery.where('ProductInventory.locationId', '=', String(locationId));
    if (outletId) inventoryQuery = inventoryQuery.where('ProductInventory.outletId', '=', String(outletId));

    let stockQuery = db.selectFrom('StockMovement').selectAll().where('updatedAt', '>', sinceDate.toISOString());
    if (locationId) stockQuery = stockQuery.where('locationId', '=', String(locationId));
    if (outletId) stockQuery = stockQuery.where((eb) => eb.or([ eb('outletId', '=', String(outletId)), eb('outletId', 'is', null) ]));

    const [
      users, products, categories, rawInventory, stockMovements, customers, suppliers, 
      businessData, outlets, rawOutlets
    ] = await Promise.all([
      usersQuery.execute(),
      productsQuery.execute(),
      db.selectFrom('Category').selectAll().where('businessId', '=', businessId).where('updatedAt', '>', sinceDate.toISOString()).execute(),
      inventoryQuery.execute(),
      stockQuery.execute(),
      db.selectFrom('Customer').selectAll().where('businessId', '=', businessId).where('updatedAt', '>', sinceDate.toISOString()).execute(),
      db.selectFrom('Supplier').selectAll().where('businessId', '=', businessId).where('updatedAt', '>', sinceDate.toISOString()).execute(),
      db.selectFrom('Business').selectAll().where('id', '=', businessId).executeTakeFirst(),
      db.selectFrom('Outlet').selectAll().where('businessId', '=', businessId).where('updatedAt', '>', sinceDate.toISOString()).execute(),
      db.selectFrom('Outlet').select('id').where('businessId', '=', businessId).execute()
    ]);

    const productIdsForInv = rawInventory.map((i) => i.productId);
    const productsForInv = productIdsForInv.length > 0 ? await db.selectFrom('Product').selectAll().where('id', 'in', productIdsForInv).execute() : [];
    const inventory = rawInventory.map((i) => ({ ...i, product: productsForInv.find((p) => p.id === i.productId) }));

    const outletIdsForTerminals = rawOutlets.map((o) => o.id);
    const terminals = outletIdsForTerminals.length > 0 
      ? await db.selectFrom('Terminal').selectAll().where('outletId', 'in', outletIdsForTerminals).where('updatedAt', '>', sinceDate.toISOString()).execute() 
      : [];


    console.log(`[SYNC GET] Outlet: ${req.user.outletId}, Since: ${sinceDate}, Products Found: ${products.length}, Inventory Found: ${inventory.length}`);

    const timestamp = new Date().toISOString();
    const details = `Pulled ${users.length} users, ${products.length} products, ${categories.length} categories, ${stockMovements.length} stock movements`;
    try {
      await db.insertInto('SyncLog')
// @ts-ignore
.values({
          id: randomUUID(),
          businessId,
          outletId: req.user.outletId || null,
          terminal: 'Unknown',
          type: 'PULL',
          status: 'SUCCESS',
          details,
          createdAt: new Date().toISOString()
        }).execute();
    } catch (err) {
      console.error('Failed to write sync log', err);
    }

    res.json({
      success: true,
      timestamp,
      data: {
        users,
        products,
        categories,
        inventory,
        stockMovements,
        customers,
        suppliers,
        transactions: [], // Intentionally empty: fresh terminals do not download historical ledgers
        outlets,
        terminals,
        businessSetup: businessData && new Date(businessData.updatedAt) > sinceDate ? {
          ...(typeof businessData.settings === 'string' ? JSON.parse(businessData.settings) : businessData.settings),
          businessName: businessData.name,
          // Always override locationId with the real StoreLocation ID to prevent stale backup values
          locationId: req.user.locationId || (await db.selectFrom('StoreLocation').select('id').where('businessId', '=', businessId).executeTakeFirst())?.id || undefined
        } : null
      }
    });
  } catch (error) {
    console.error('Delta Pull error:', error);
    res.status(500).json({ error: 'Internal server error during pull sync' });
  }
});

// 2. POST /api/sync/delta (PUSH)
router.post('/', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const {
      users,
      products,
      customers,
      suppliers,
      transactions,
      stockMovements,
      businessSetup
    } = req.body;

    let targetLocationId: string | null = null;
    let targetOutletId: string | null = null;
    
    // Try to resolve from businessSetup in payload
    if (businessSetup?.locationId) {
      const loc = await db.selectFrom('StoreLocation').selectAll().where('id', '=', businessSetup.locationId).where('businessId', '=', businessId).executeTakeFirst();
      if (loc) targetLocationId = loc.id;
    }

    if (businessSetup?.outletId && targetLocationId) {
      const out = await db.selectFrom('Outlet').selectAll().where('id', '=', businessSetup.outletId).where('locationId', '=', targetLocationId).executeTakeFirst();
      if (out) targetOutletId = out.id;
    }

    // Fallback: resolve from the authenticated user's outlet
    if (!targetOutletId && req.user.outletId) {
      const out = await db.selectFrom('Outlet')
        .innerJoin('StoreLocation', 'StoreLocation.id', 'Outlet.locationId')
        .selectAll('Outlet')
        .where('Outlet.id', '=', req.user.outletId)
        .where('StoreLocation.businessId', '=', businessId)
        .executeTakeFirst();
      if (out) {
        targetOutletId = out.id;
        if (!targetLocationId) targetLocationId = out.locationId;
      }
    }

    // Fallback: resolve from the business's first location
    if (!targetLocationId) {
      const loc = await db.selectFrom('StoreLocation').selectAll().where('businessId', '=', businessId).executeTakeFirst();
      if (loc) targetLocationId = loc.id;
    }

    // Fallback: resolve from the business's first outlet
    if (!targetOutletId && targetLocationId) {
      const out = await db.selectFrom('Outlet').selectAll().where('locationId', '=', targetLocationId).executeTakeFirst();
      if (out) targetOutletId = out.id;
    }

    console.log(`[SYNC PUSH] businessId=${businessId}, targetLocationId=${targetLocationId}, targetOutletId=${targetOutletId}, user.outletId=${req.user.outletId}`);

    const results = {
      users: 0,
      products: 0,
      customers: 0,
      suppliers: 0,
      transactions: 0,
      inventory: 0,
      skipped: 0
    };

    // Helper for conflict resolution
    const resolveConflict = (incoming: any, existing: any) => {
      if (!existing || !existing.updatedAt) return true;
      if (!incoming.updatedAt) return true; // If local has no timestamp, assume newer
      return new Date(incoming.updatedAt) > new Date(existing.updatedAt);
    };

    // 1. Users
    if (users && Array.isArray(users)) {
      for (const u of users) {
        if (!u.name) continue;
        const fallbackEmail = u.email || `${u.name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${u.id}@pos.local`;
        
        const existing = await db.selectFrom('User').selectAll().where('email', '=', fallbackEmail).executeTakeFirst();
        if (resolveConflict(u, existing)) {
            let role = 'CASHIER';
            if (u.role === 'SYSTEM_ADMIN' || u.role === 'Admin') role = 'ADMIN';
            else if (u.role === 'STORE_MANAGER' || u.role === 'Manager') role = 'MANAGER';

            await db.insertInto('User')
// @ts-ignore
.values({
                id: u.id || randomUUID(),
                businessId, locationId: targetLocationId, email: fallbackEmail,
                password: u.pin || 'pos1234', name: u.name, role: role as any,
                updatedAt: (u.updatedAt ? new Date(u.updatedAt) : new Date()).toISOString()
              }).onConflict((oc) => oc.column('email').doUpdateSet({
                name: u.name, role: role as any, locationId: targetLocationId,
                updatedAt: (u.updatedAt ? new Date(u.updatedAt) : new Date()).toISOString()
              })).execute();
            results.users++;
        } else {
            results.skipped++;
        }
      }
    }

    // 2. Products
    if (products && Array.isArray(products)) {
      for (const p of products) {
        if (!p.name) continue;
        const sku = String(p.sku || p.barcode || p.id);
        
        const existing = await db.selectFrom('Product').selectAll().where('businessId', '=', businessId).where('sku', '=', sku).executeTakeFirst();
        if (resolveConflict(p, existing)) {
            if (existing) {
              await db.updateTable('Product')
// @ts-ignore
.set({
                  name: String(p.name), category: p.category ? String(p.category) : null,
                  price: Number(p.price) || 0, costPrice: Number(p.costPrice) || 0,
                  barcode: p.barcode ? String(p.barcode) : null,
                  updatedAt: (p.updatedAt ? new Date(p.updatedAt) : new Date()).toISOString()
                }).where('id', '=', existing.id).execute();
            } else {
              await db.insertInto('Product')
// @ts-ignore
.values({id: randomUUID(),
                  businessId, sku: String(sku), barcode: p.barcode ? String(p.barcode) : null,
                  name: String(p.name), category: p.category ? String(p.category) : null,
                  price: Number(p.price) || 0, costPrice: Number(p.costPrice) || 0,
                  updatedAt: (p.updatedAt ? new Date(p.updatedAt) : new Date()).toISOString()
                }).execute();
            }
            results.products++;
        } else {
            results.skipped++;
        }
      }
    }

    // 3. Stock Movements
    if (stockMovements && Array.isArray(stockMovements)) {
       for (const m of stockMovements) {
          const existing = await db.selectFrom('StockMovement').selectAll().where('id', '=', m.id).executeTakeFirst();
          if (!existing) {
             const resolvedLocationId = targetLocationId || m.locationId || null;
             const resolvedOutletId = targetOutletId || m.outletId || null;

             await db.insertInto('StockMovement')
// @ts-ignore
.values({
                   id: m.id,
                   businessId,
                   productId: m.productId,
                   locationId: resolvedLocationId,
                   outletId: resolvedOutletId,
                   type: m.type,
                   quantity: Number(m.quantity),
                   reference: m.reference ? String(m.reference) : null,
                   sourceTerminal: m.sourceTerminal ? String(m.sourceTerminal) : 'POS',
                   timestamp: (m.timestamp ? new Date(m.timestamp) : new Date()).toISOString(),
                   updatedAt: (m.updatedAt ? new Date(m.updatedAt) : new Date()).toISOString()
                }).execute();

             // Update inventory based on movement type
             let invExistingQuery = db.selectFrom('ProductInventory').selectAll().where('productId', '=', m.productId);
             if (resolvedLocationId) invExistingQuery = invExistingQuery.where('locationId', '=', resolvedLocationId);
             else invExistingQuery = invExistingQuery.where('locationId', 'is', null);
             if (resolvedOutletId) invExistingQuery = invExistingQuery.where('outletId', '=', resolvedOutletId);
             else invExistingQuery = invExistingQuery.where('outletId', 'is', null);
             const invExisting = await invExistingQuery.executeTakeFirst();

             let stockChange = Number(m.quantity);
             if (m.type === 'SALE' || m.type === 'TRANSFER_OUT' || m.type === 'ADJUSTMENT_DOWN' || m.type === 'subtract') stockChange = -Math.abs(stockChange);
             else if (m.type === 'TRANSFER_IN' || m.type === 'PO' || m.type === 'INITIAL' || m.type === 'RETURN' || m.type === 'ADJUSTMENT_UP' || m.type === 'add') stockChange = Math.abs(stockChange);

             if (invExisting) {
                await db.updateTable('ProductInventory')
// @ts-ignore
.set((eb) => ({ stock: eb('stock', '+', stockChange), updatedAt: new Date().toISOString() })).where('id', '=', invExisting.id).execute();
             } else {
                await db.insertInto('ProductInventory')
// @ts-ignore
.values({id: randomUUID(),
                      productId: m.productId,
                      locationId: resolvedLocationId,
                      outletId: resolvedOutletId,
                      stock: stockChange,
                      updatedAt: new Date().toISOString()}).execute();
             }
             results.inventory++;
          } else {
             results.skipped++;
          }
       }
    }

    // 4. Transactions (Sales)
    if (transactions && Array.isArray(transactions)) {
       for (const t of transactions) {
          const existing = await db.selectFrom('Receipt').selectAll().where('businessId', '=', businessId).where('receiptNumber', '=', String(t.id)).executeTakeFirst();
          const rawStatus = (t.status || '').toUpperCase();
          if (resolveConflict(t, existing)) {
              if (rawStatus !== 'CANCELLED') {
                  let safeStatus = 'COMPLETED';
                  if (rawStatus === 'PENDING' || rawStatus === 'REFUNDED') safeStatus = rawStatus;

                  if (existing) {
                      await db.updateTable('Receipt')
// @ts-ignore
.set({ status: safeStatus as any, updatedAt: (t.updatedAt ? new Date(t.updatedAt) : new Date()).toISOString() }).where('id', '=', existing.id).execute();
                  } else {
                      const receiptId = String(t.id);
                      await db.insertInto('Receipt')
// @ts-ignore
.values({
                        id: receiptId,

                            businessId, locationId: targetLocationId, outletId: targetOutletId || null,
                            receiptNumber: String(t.id), totalAmount: Number(t.totalAmount || t.total) || 0,
                            paymentMethod: String(t.paymentMethod || 'CASH'), customerPhone: t.customerPhone ? String(t.customerPhone) : null,
                            mpesaCode: t.mpesaCode ? String(t.mpesaCode) : null, status: safeStatus as any,
                            createdAt: t.timestamp ? new Date(t.timestamp).toISOString() : undefined,
                            updatedAt: (t.updatedAt ? new Date(t.updatedAt) : new Date()).toISOString()
                                               }).execute();
                      const createdReceipt = { id: receiptId };
                      
                      if (t.items && Array.isArray(t.items)) {
                          for (const item of t.items) {
                              if (!item.product) continue;
                              await db.insertInto('ReceiptItem')
// @ts-ignore
.values({id: randomUUID(),
                                      receiptId: createdReceipt.id,
                                      productName: item.product.name || 'Unknown Item',
                                      quantity: Number(item.quantity) || 1,
                                      unitPrice: Number(item.product.price) || 0,
                                      totalPrice: (Number(item.quantity) || 1) * (Number(item.product.price) || 0)
                                  }).execute();
                          }
                      }
                  }
                  results.transactions++;
              }
          } else {
              results.skipped++;
          }
       }
    }

    
    // 5. Saved Documents
    if (documents && Array.isArray(documents)) {
       for (const d of documents) {
          if (!d.id) continue;
          const existing = await db.selectFrom('SavedDocument').selectAll().where('businessId', '=', businessId).where('id', '=', String(d.id)).executeTakeFirst();
          if (resolveConflict(d, existing)) {
              if (existing) {
                  await db.updateTable('SavedDocument')
// @ts-ignore
.set({
                      type: d.type || 'INVOICE',
                      date: d.date ? new Date(d.date).toISOString() : new Date().toISOString(),
                      dueDate: d.dueDate ? new Date(d.dueDate).toISOString() : null,
                      customerName: String(d.customerName || d.clientName || 'Walk-in'),
                      customerEmail: d.customerEmail || d.clientEmail || null,
                      customerPhone: d.customerPhone || null,
                      customerAddress: d.customerAddress || d.clientAddress || null,
                      items: JSON.stringify(d.items || []),
                      subtotal: Number(d.subtotal) || 0,
                      tax: Number(d.taxAmount) || 0,
                      total: Number(d.total) || 0,
                      notes: d.notes || null,
                      status: d.status || 'DRAFT',
                      metadata: JSON.stringify({
                        docNumber: d.docNumber,
                        subject: d.subject,
                        bodyText: d.bodyText,
                        partialAmount: d.partialAmount,
                        settlementDate: d.settlementDate,
                        daysNotice: d.daysNotice,
                        paymentMode: d.paymentMode
                      }),
                      updatedAt: (d.updatedAt ? new Date(d.updatedAt) : new Date()).toISOString()
                  }).where('id', '=', existing.id).execute();
              } else {
                  await db.insertInto('SavedDocument')
// @ts-ignore
.values({
                      id: String(d.id),
                      businessId,
                      type: d.type || 'INVOICE',
                      date: d.date ? new Date(d.date).toISOString() : new Date().toISOString(),
                      dueDate: d.dueDate ? new Date(d.dueDate).toISOString() : null,
                      customerName: String(d.customerName || d.clientName || 'Walk-in'),
                      customerEmail: d.customerEmail || d.clientEmail || null,
                      customerPhone: d.customerPhone || null,
                      customerAddress: d.customerAddress || d.clientAddress || null,
                      items: JSON.stringify(d.items || []),
                      subtotal: Number(d.subtotal) || 0,
                      tax: Number(d.taxAmount) || 0,
                      total: Number(d.total) || 0,
                      notes: d.notes || null,
                      status: d.status || 'DRAFT',
                      metadata: JSON.stringify({
                        docNumber: d.docNumber,
                        subject: d.subject,
                        bodyText: d.bodyText,
                        partialAmount: d.partialAmount,
                        settlementDate: d.settlementDate,
                        daysNotice: d.daysNotice,
                        paymentMode: d.paymentMode
                      }),
                      createdAt: (d.date ? new Date(d.date) : new Date()).toISOString(),
                      updatedAt: (d.updatedAt ? new Date(d.updatedAt) : new Date()).toISOString()
                  }).execute();
              }
          }
       }
    }

    // 6. Customers
    if (customers && Array.isArray(customers)) {
       for (const c of customers) {
          if (!c.name) continue;
          const existing = await db.selectFrom('Customer').selectAll().where('businessId', '=', businessId).where('name', '=', String(c.name)).executeTakeFirst();
          if (resolveConflict(c, existing)) {
              if (existing) {
                 await db.updateTable('Customer')
// @ts-ignore
.set({ 
                        phone: c.phone ? String(c.phone) : null, 
                        email: c.email ? String(c.email) : null, 
                        company: c.company ? String(c.company) : null,
                        address: c.address ? String(c.address) : null,
                        taxId: c.taxId ? String(c.taxId) : null,
                        balance: c.balance != null ? Number(c.balance) : undefined,
                        totalCredit: c.totalCredit != null ? Number(c.totalCredit) : undefined,
                        paidAmount: c.paidAmount != null ? Number(c.paidAmount) : undefined,
                        updatedAt: (c.updatedAt ? new Date(c.updatedAt) : new Date()).toISOString() 
                    }).where('id', '=', existing.id).execute();
              } else {
                 await db.insertInto('Customer')
// @ts-ignore
.values({id: randomUUID(), 
                        businessId, 
                        name: String(c.name), 
                        phone: c.phone ? String(c.phone) : null, 
                        email: c.email ? String(c.email) : null,
                        company: c.company ? String(c.company) : null,
                        address: c.address ? String(c.address) : null,
                        taxId: c.taxId ? String(c.taxId) : null,
                        balance: c.balance != null ? Number(c.balance) : 0,
                        totalCredit: c.totalCredit != null ? Number(c.totalCredit) : 0,
                        paidAmount: c.paidAmount != null ? Number(c.paidAmount) : 0,
                        isCredit: true,
                        updatedAt: (c.updatedAt ? new Date(c.updatedAt) : new Date()).toISOString() 
                    }).execute();
              }
              results.customers++;
          } else {
              results.skipped++;
          }
       }
    }
    
    // Update business settings safely by merging
    if (businessSetup) {
       const b = await db.selectFrom('Business').selectAll().where('id', '=', businessId).executeTakeFirst();
       if (b) {
           let currentSettings = {};
           if (b.settings) {
               try {
                   currentSettings = typeof b.settings === 'string' ? JSON.parse(b.settings) : b.settings;
               } catch (e) {}
           }
           // Ensure businessSetup is an object
           const incomingSetup = typeof businessSetup === 'string' ? JSON.parse(businessSetup) : businessSetup;
           
             // Prevent terminals from poisoning the server with their local terminal-specific properties
             delete incomingSetup.apiKey;
             delete incomingSetup.terminalName;
             delete incomingSetup.outletId;
             delete incomingSetup.deviceRole;
             delete incomingSetup.lanAdminIp;
             delete incomingSetup.apiUrl;
             delete incomingSetup.isLoggedIn;
             delete incomingSetup.isSetup;

             const mergedSettings = { ...currentSettings, ...incomingSetup };
           
           await db.updateTable('Business')
// @ts-ignore
.set({ settings: JSON.stringify(mergedSettings), updatedAt: new Date().toISOString() }).where('id', '=', businessId).execute();
       }
    }

      try {
        await db.insertInto('SyncLog')
// @ts-ignore
.values({
            id: randomUUID(),
            businessId,
            outletId: targetOutletId || null,
            terminal: 'Unknown',
            type: 'PUSH',
            status: 'SUCCESS',
            details: `Pushed ${results.users} users, ${results.products} products, ${results.inventory} stock movements, ${results.transactions} transactions`,
            createdAt: new Date().toISOString()
          }).execute();
      } catch (err) {
        console.error('Failed to write sync log', err);
      }

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        message: 'Delta sync processed successfully',
        results
      });
  } catch (error) {
    console.error('Delta Push error:', error);
    res.status(500).json({ error: 'Internal server error during push sync' });
  }
});

export default router;




