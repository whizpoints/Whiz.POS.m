// @ts-nocheck
import { Router } from 'express';
import db from '../db.js';
import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import fs from 'fs';
import { getServerConfigPath } from '../paths.js';

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
      business = await db.selectFrom('Business').selectAll().executeTakeFirst();
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

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  try {
    const payload: any = jwt.verify(token, (process.env.JWT_SECRET || 'fallback_secret'));
    req.user = payload;
    const defaultBiz = await db.selectFrom('Business').select('id').executeTakeFirst();
    if (defaultBiz) req.user.businessId = defaultBiz.id;
    next();
  } catch (err) {
    try {
      const decoded: any = jwt.decode(token);
      if (decoded) {
        req.user = decoded;
        const defaultBiz = await db.selectFrom('Business').select('id').executeTakeFirst();
        if (defaultBiz) req.user.businessId = defaultBiz.id;
        return next();
      }
    } catch(e) {}
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

    const [ users, products, categories, rawInventory, stockMovements, customers, suppliers, businessData, outlets, rawOutlets, clients, savedDocuments ] = await Promise.all([
      usersQuery.execute(),
      productsQuery.execute(),
      db.selectFrom('Category').selectAll().where('businessId', '=', businessId).where('updatedAt', '>', sinceDate.toISOString()).execute(),
      inventoryQuery.execute(),
      stockQuery.execute(),
      db.selectFrom('Customer').selectAll().where('businessId', '=', businessId).where('updatedAt', '>', sinceDate.toISOString()).execute(),
      db.selectFrom('Supplier').selectAll().where('businessId', '=', businessId).where('updatedAt', '>', sinceDate.toISOString()).execute(),
      db.selectFrom('Business').selectAll().where('id', '=', businessId).executeTakeFirst(),
      db.selectFrom('Outlet').selectAll().where('businessId', '=', businessId).where('updatedAt', '>', sinceDate.toISOString()).execute(),
      db.selectFrom('Outlet').select('id').where('businessId', '=', businessId).execute(),
      db.selectFrom('Client').selectAll().where('businessId', '=', businessId).where('updatedAt', '>', sinceDate.toISOString()).execute().catch(() => []),
      db.selectFrom('SavedDocument').selectAll().where('businessId', '=', businessId).where('updatedAt', '>', sinceDate.toISOString()).execute().catch(() => [])
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
        clients,
        savedDocuments,
        businessSetup: businessData && new Date(businessData.updatedAt) > sinceDate ? (() => {
          let bSettings: any = {};
          try { bSettings = typeof businessData.settings === 'string' ? JSON.parse(businessData.settings) : (businessData.settings || {}); } catch(e) {}

          let serverConfig: any = {};
          try {
            const cfgPath = getServerConfigPath();
            if (fs.existsSync(cfgPath)) {
              serverConfig = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
            }
          } catch (e) {}

          const cloudBaseUrl = (bSettings.backOfficeUrl || serverConfig.backOfficeUrl || process.env.CLOUD_API_URL || 'https://backoffice.whizpoint.app').replace(/\/+$/, '');
          const cloudBusinessId = bSettings.cloudBusinessId || serverConfig.cloudBusinessId || businessId;
          const cloudApiKey = bSettings.backOfficeApiKey || serverConfig.apiKey || serverConfig.cloudToken || businessData.apiKey;

          return {
            ...bSettings,
            businessName: businessData.name,
            cloudBusinessId,
            cloudApiKey,
            backOfficeUrl: cloudBaseUrl,
            cloudUrl: cloudBaseUrl,
            webportalUrl: cloudBaseUrl,
            mpesaPushUrl: `${cloudBaseUrl}/api/mpesa/stkpush`,
            mpesaStatusUrl: `${cloudBaseUrl}/api/mpesa/status`,
            mpesaSearchUrl: `${cloudBaseUrl}/api/mpesa/payments/search?businessId=${cloudBusinessId}`,
            mpesaConsumeUrl: `${cloudBaseUrl}/api/mpesa/payments/consume`,
            mpesaQrUrl: `${cloudBaseUrl}/api/mpesa/qrcode`,
            itaxInvoiceUrl: `${cloudBaseUrl}/api/kra/invoice`,
            itaxPingUrl: `${cloudBaseUrl}/api/kra/ping`,
            itaxInitUrl: `${cloudBaseUrl}/api/kra/init-device`,
            itaxSyncUrl: `${cloudBaseUrl}/api/kra/sync-queue`,
            kraInvoiceUrl: `${cloudBaseUrl}/api/kra/invoice`,
            // Always override locationId with the real StoreLocation ID to prevent stale backup values
            locationId: req.user.locationId || undefined
          };
        })() : null
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
    const { users, products, customers, suppliers, transactions, stockMovements, inventory, categories, outlets, terminals, businessSetup, documents, savedDocuments, clients, mpesaConfigs, isFromCloud } = req.body;

    let targetLocationId: string | null = null;
    let targetOutletId: string | null = null;
    let mappedLocalLocationId: string | null = null;
    let mappedLocalOutletId: string | null = null;
    if (isFromCloud) {
        const loc = await db.selectFrom('StoreLocation').selectAll().executeTakeFirst();
        if (loc) mappedLocalLocationId = loc.id;
        const out = await db.selectFrom('Outlet').selectAll().executeTakeFirst();
        if (out) mappedLocalOutletId = out.id;
    }
    
    // Try to resolve from businessSetup in payload
    if (businessSetup?.locationId) {
      const loc = await db.selectFrom('StoreLocation').selectAll().where('id', '=', businessSetup.locationId).where('businessId', '=', businessId).executeTakeFirst();
      if (loc) targetLocationId = loc.id;
    }

    if (businessSetup?.outletId && targetLocationId) {
      const out = await db.selectFrom('Outlet').selectAll().where('id', '=', businessSetup.outletId).where('locationId', '=', targetLocationId).executeTakeFirst();
      if (out) targetOutletId = out.id;
    }

    if (isFromCloud && mappedLocalLocationId && !targetLocationId) targetLocationId = mappedLocalLocationId;
    if (isFromCloud && mappedLocalOutletId && !targetOutletId) targetOutletId = mappedLocalOutletId;

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
      clients: 0,
      savedDocuments: 0,
      suppliers: 0,
      transactions: 0,
      inventory: 0,
      mpesaConfigs: 0,
      skipped: 0
    };

    // Helper for conflict resolution
    const resolveConflict = (incoming: any, existing: any) => {
      if (!existing || !existing.updatedAt) return true;
      if (!incoming.updatedAt) return true; // If local has no timestamp, assume newer
      return new Date(incoming.updatedAt) > new Date(existing.updatedAt);
    };

    // 1. Outlets (Synced first so dependent records can reference them)
    if (outlets && Array.isArray(outlets)) {
      for (const o of outlets) {
        if (!o.name) continue;
        const targetLoc = mappedLocalLocationId || targetLocationId || o.locationId;
        const loc = targetLoc ? await db.selectFrom('StoreLocation').selectAll().where('id', '=', targetLoc).executeTakeFirst() : await db.selectFrom('StoreLocation').selectAll().executeTakeFirst();
        if (!loc) continue;

        const existing = await db.selectFrom('Outlet').selectAll().where('id', '=', o.id).executeTakeFirst();
        if (existing) {
          await db.updateTable('Outlet')
            .set({ name: o.name, locationId: loc.id, businessId, updatedAt: o.updatedAt || new Date().toISOString() })
            .where('id', '=', o.id)
            .execute();
        } else {
          await db.insertInto('Outlet')
            .values({
              id: o.id,
              name: o.name,
              businessId,
              locationId: loc.id,
              createdAt: o.createdAt || new Date().toISOString(),
              updatedAt: o.updatedAt || new Date().toISOString()
            })
            .execute();
        }
      }
    }

    // 1.1 Terminals
    if (terminals && Array.isArray(terminals)) {
      for (const term of terminals) {
        if (!term.name) continue;
        const existing = await db.selectFrom('Terminal').selectAll().where('id', '=', term.id).executeTakeFirst();
        if (existing) {
          await db.updateTable('Terminal')
            .set({
              name: term.name,
              status: term.status || 'APPROVED',
              outletId: term.outletId || null,
              apiKey: term.apiKey || undefined,
              updatedAt: term.updatedAt || new Date().toISOString()
            })
            .where('id', '=', term.id)
            .execute();
        } else {
          await db.insertInto('Terminal')
            .values({
              id: term.id,
              name: term.name,
              macAddress: term.macAddress || 'LAN-NODE',
              status: term.status || 'APPROVED',
              outletId: term.outletId || null,
              apiKey: term.apiKey || null,
              businessId,
              createdAt: term.createdAt || new Date().toISOString(),
              updatedAt: term.updatedAt || new Date().toISOString()
            })
            .execute();
        }
      }
    }

    // 1.2 Users
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

    // 1.3 MpesaConfigs
    if (mpesaConfigs && Array.isArray(mpesaConfigs)) {
       for (const mc of mpesaConfigs) {
          try {
              const existing = await db.selectFrom('MpesaConfig').selectAll().where('id', '=', String(mc.id)).executeTakeFirst();
              if (resolveConflict(mc, existing)) {
                  // Validate foreign keys against local tables to prevent SQLITE_CONSTRAINT_FOREIGNKEY
                  let safeLocationId: string | null = null;
                  const rawLoc = mc.locationId ? String(mc.locationId).trim() : null;
                  if (rawLoc && rawLoc !== 'undefined' && rawLoc !== 'null') {
                      const locMatch = await db.selectFrom('StoreLocation').select('id').where('id', '=', rawLoc).executeTakeFirst();
                      if (locMatch) safeLocationId = locMatch.id;
                      else if (mappedLocalLocationId) safeLocationId = mappedLocalLocationId;
                      else if (targetLocationId) safeLocationId = targetLocationId;
                  }

                  let safeOutletId: string | null = null;
                  const rawOut = mc.outletId ? String(mc.outletId).trim() : null;
                  if (rawOut && rawOut !== 'undefined' && rawOut !== 'null') {
                      const outMatch = await db.selectFrom('Outlet').select('id').where('id', '=', rawOut).executeTakeFirst();
                      if (outMatch) safeOutletId = outMatch.id;
                      else if (mappedLocalOutletId) safeOutletId = mappedLocalOutletId;
                      else if (targetOutletId) safeOutletId = targetOutletId;
                  }

                  if (existing) {
                      await db.updateTable('MpesaConfig').set({
                          locationId: safeLocationId,
                          outletId: safeOutletId,
                          merchantType: mc.merchantType || 'BUY_GOODS',
                          tillNumber: mc.tillNumber || null,
                          paybillNumber: mc.paybillNumber || null,
                          accountReference: mc.accountReference || null,
                          environment: mc.environment || 'sandbox',
                          consumerKey: mc.consumerKey || '',
                          consumerSecret: mc.consumerSecret || '',
                          passkey: mc.passkey || '',
                          shortcode: mc.shortcode || '',
                          initiatorName: mc.initiatorName || null,
                          initiatorPassword: mc.initiatorPassword || null,
                          stkEnabled: mc.stkEnabled !== false ? 1 : 0,
                          c2bEnabled: mc.c2bEnabled !== false ? 1 : 0,
                          updatedAt: mc.updatedAt ? new Date(mc.updatedAt).toISOString() : new Date().toISOString()
                      }).where('id', '=', existing.id).execute();
                  } else {
                      await db.insertInto('MpesaConfig').values({
                          id: String(mc.id),
                          businessId,
                          locationId: safeLocationId,
                          outletId: safeOutletId,
                          merchantType: mc.merchantType || 'BUY_GOODS',
                          tillNumber: mc.tillNumber || null,
                          paybillNumber: mc.paybillNumber || null,
                          accountReference: mc.accountReference || null,
                          environment: mc.environment || 'sandbox',
                          consumerKey: mc.consumerKey || '',
                          consumerSecret: mc.consumerSecret || '',
                          passkey: mc.passkey || '',
                          shortcode: mc.shortcode || '',
                          initiatorName: mc.initiatorName || null,
                          initiatorPassword: mc.initiatorPassword || null,
                          stkEnabled: mc.stkEnabled !== false ? 1 : 0,
                          c2bEnabled: mc.c2bEnabled !== false ? 1 : 0,
                          createdAt: mc.createdAt ? new Date(mc.createdAt).toISOString() : new Date().toISOString(),
                          updatedAt: mc.updatedAt ? new Date(mc.updatedAt).toISOString() : new Date().toISOString()
                      }).execute();
                  }
                  results.mpesaConfigs++;
              } else {
                  results.skipped++;
              }
          } catch (err) {
              console.warn(`[SYNC PUSH] Warning: Failed to insert/update MpesaConfig id=${mc.id}:`, err);
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
          try {
             const existing = await db.selectFrom('StockMovement').selectAll().where('id', '=', m.id).executeTakeFirst();
          if (!existing) {
             let resolvedLocationId = targetLocationId || m.locationId || null;
             if (resolvedLocationId) {
                const loc = await db.selectFrom('StoreLocation').select('id').where('id', '=', resolvedLocationId).executeTakeFirst();
                if (!loc) resolvedLocationId = mappedLocalLocationId || targetLocationId || (await db.selectFrom('StoreLocation').select('id').executeTakeFirst())?.id || null;
             } else {
                resolvedLocationId = mappedLocalLocationId || targetLocationId || (await db.selectFrom('StoreLocation').select('id').executeTakeFirst())?.id || null;
             }

             let resolvedOutletId = targetOutletId || m.outletId || null;
             if (resolvedOutletId) {
                const out = await db.selectFrom('Outlet').select('id').where('id', '=', resolvedOutletId).executeTakeFirst();
                if (!out) resolvedOutletId = null;
             }

             if (!resolvedLocationId) continue;

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
             const mType = String(m.type || '').toUpperCase();
             if (['SALE', 'TRANSFER_OUT', 'ADJUSTMENT_DOWN', 'SUBTRACT', 'OUT'].includes(mType)) stockChange = -Math.abs(stockChange);
             else if (['TRANSFER_IN', 'PO', 'INITIAL', 'RETURN', 'ADJUSTMENT_UP', 'ADD', 'IN'].includes(mType)) stockChange = Math.abs(stockChange);

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
          } catch (smErr) {
             console.warn(`[SYNC PUSH] Warning: Failed to insert StockMovement id=${m.id}:`, smErr);
          }
       }
    }

      // 3.5 Product Inventory (Absolute from Cloud)
      if (inventory && Array.isArray(inventory)) {
         for (const inv of inventory) { const resolvedLocationId = isFromCloud && mappedLocalLocationId ? mappedLocalLocationId : (inv.locationId || targetLocationId || null); const resolvedOutletId = isFromCloud && mappedLocalOutletId ? mappedLocalOutletId : (inv.outletId || targetOutletId || null);
            if (!inv.productId) continue;
            
            const existing = await db.selectFrom('ProductInventory')
                .selectAll()
                .where('productId', '=', inv.productId)
                .where('locationId', 'is', resolvedLocationId)
                .where('outletId', 'is', resolvedOutletId)
                .executeTakeFirst();
            
            if (resolveConflict(inv, existing)) {
                if (existing) {
                    // Do NOT overwrite local stock if from Cloud; stock movements handle incremental delta
                    if (!isFromCloud) {
                        await db.updateTable('ProductInventory')
                            // @ts-ignore
                            .set({ stock: Number(inv.stock) || 0, updatedAt: (inv.updatedAt ? new Date(inv.updatedAt) : new Date()).toISOString() })
                            .where('id', '=', existing.id).execute();
                    } else {
                        await db.updateTable('ProductInventory')
                            // @ts-ignore
                            .set({ reorderLevel: inv.reorderLevel || 5, updatedAt: (inv.updatedAt ? new Date(inv.updatedAt) : new Date()).toISOString() })
                            .where('id', '=', existing.id).execute();
                    }
                } else {
                    await db.insertInto('ProductInventory')
                        // @ts-ignore
                        .values({
                            id: inv.id || randomUUID(),
                            productId: inv.productId,
                            locationId: resolvedLocationId,
                            outletId: resolvedOutletId,
                            stock: Number(inv.stock) || 0,
                            updatedAt: (inv.updatedAt ? new Date(inv.updatedAt) : new Date()).toISOString()
                        }).execute();
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
.set({ status: safeStatus as any }).where('id', '=', existing.id).execute();
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
                            createdAt: t.timestamp ? new Date(t.timestamp).toISOString() : undefined
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
    const docsToSync = savedDocuments || documents;
    if (docsToSync && Array.isArray(docsToSync)) {
       for (const d of docsToSync) {
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
                      items: typeof d.items === 'string' ? d.items : JSON.stringify(d.items || []),
                      subtotal: Number(d.subtotal) || 0,
                      tax: Number(d.tax || d.taxAmount) || 0,
                      total: Number(d.total) || 0,
                      notes: d.notes || null,
                      status: d.status || 'DRAFT',
                      metadata: typeof d.metadata === 'string' ? d.metadata : JSON.stringify({
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
                      items: typeof d.items === 'string' ? d.items : JSON.stringify(d.items || []),
                      subtotal: Number(d.subtotal) || 0,
                      tax: Number(d.tax || d.taxAmount) || 0,
                      total: Number(d.total) || 0,
                      notes: d.notes || null,
                      status: d.status || 'DRAFT',
                      metadata: typeof d.metadata === 'string' ? d.metadata : JSON.stringify({
                        docNumber: d.docNumber,
                        subject: d.subject,
                        bodyText: d.bodyText,
                        partialAmount: d.partialAmount,
                        settlementDate: d.settlementDate,
                        daysNotice: d.daysNotice,
                        paymentMode: d.paymentMode
                      }),
                      createdAt: (d.createdAt || d.date ? new Date(d.createdAt || d.date) : new Date()).toISOString(),
                      updatedAt: (d.updatedAt ? new Date(d.updatedAt) : new Date()).toISOString()
                  }).execute();
              }
              results.savedDocuments++;
          }
       }
    }

    // 5.1 Clients
    if (clients && Array.isArray(clients)) {
      for (const cl of clients) {
        if (!cl.name) continue;
        const clId = cl.id ? String(cl.id) : randomUUID();
        const existing = await db.selectFrom('Client').selectAll().where('businessId', '=', businessId).where('id', '=', clId).executeTakeFirst();
        if (resolveConflict(cl, existing)) {
          if (existing) {
            await db.updateTable('Client')
// @ts-ignore
              .set({
                name: String(cl.name),
                phone: cl.phone ? String(cl.phone) : null,
                email: cl.email ? String(cl.email) : null,
                address: cl.address ? String(cl.address) : null,
                updatedAt: (cl.updatedAt ? new Date(cl.updatedAt) : new Date()).toISOString()
              })
              .where('id', '=', existing.id)
              .execute();
          } else {
            await db.insertInto('Client')
// @ts-ignore
              .values({
                id: clId,
                businessId,
                name: String(cl.name),
                phone: cl.phone ? String(cl.phone) : null,
                email: cl.email ? String(cl.email) : null,
                address: cl.address ? String(cl.address) : null,
                createdAt: (cl.createdAt ? new Date(cl.createdAt) : new Date()).toISOString(),
                updatedAt: (cl.updatedAt ? new Date(cl.updatedAt) : new Date()).toISOString()
              })
              .execute();
          }
          results.clients++;
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
           
           const updateBiz: any = { 
             settings: JSON.stringify(mergedSettings), 
             updatedAt: new Date().toISOString() 
           };
           if (incomingSetup.businessName || incomingSetup.name) {
             updateBiz.name = incomingSetup.businessName || incomingSetup.name;
           }
           if (incomingSetup.kraPin || incomingSetup.etimsPin) {
             updateBiz.kraPin = incomingSetup.kraPin || incomingSetup.etimsPin;
           }
           await db.updateTable('Business').set(updateBiz).where('id', '=', businessId).execute();
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

      
      const io = req.app.get('io');
      if (io) {
        // Broadcast to all connected local POS terminals that data has changed
        io.emit('stock_updated', { timestamp: new Date().toISOString() });
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





