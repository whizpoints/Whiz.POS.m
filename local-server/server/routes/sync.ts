import { Router } from 'express';
import db from '../db.js';
import { randomUUID } from 'crypto';
import * as jwt from 'jsonwebtoken';
import { sendReceiptEmail } from '../services/emailService.js';

const router = Router();
// const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Middleware to authenticate sync requests
const authenticate = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];

  if (apiKey) {
    const business = await db.selectFrom('Business').selectAll().where('apiKey', '=', apiKey).executeTakeFirst();
    if (!business) {
      console.log(`[Auth] Invalid API Key provided: ${apiKey}`);
      return res.status(401).json({ error: 'Invalid API Key' });
    }
    req.user = { businessId: business.id };
    return next();
  }

  if (!authHeader) {
    console.log('[Auth] Missing authorization header or API key');
    return res.status(401).json({ error: 'Missing authorization header or API key' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    console.log(`[Auth] JWT Verify failed for token: ${token}`);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

router.use(authenticate);

// Push local sales to cloud
router.post('/sales', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { receipts } = req.body;

    const createdReceipts = [];

    for (const receipt of receipts) {
      // Create receipt in DB
      const receiptId = randomUUID();
      const dbReceipt = await db.insertInto('Receipt').values({
        id: receiptId,
          businessId,
          receiptNumber: receipt.receiptNumber,
          totalAmount: receipt.totalAmount,
          paymentMethod: receipt.paymentMethod,
          customerPhone: receipt.customerPhone,
          status: receipt.status || 'COMPLETED',
          cashierName: receipt.cashier || null
      }).returningAll().executeTakeFirstOrThrow();
      
      const receiptItemsToInsert = (receipt.items || []).map((item: any) => ({
        id: randomUUID(),
        receiptId,

              productName: item.product?.name || item.productName || 'Unknown',
              quantity: Number(item.quantity) || 1,
              unitPrice: Number(item.product?.price || item.unitPrice || 0),
              totalPrice: Number(item.product?.price || item.unitPrice || 0) * (Number(item.quantity) || 1),
            
      }));
      if (receiptItemsToInsert.length > 0) {
        await db.insertInto('ReceiptItem').values(receiptItemsToInsert).execute();
      }
      createdReceipts.push(dbReceipt);

      // If email provided (or phone logic later), trigger digital receipt
      if (receipt.customerEmail) {
        const business = await db.selectFrom('Business').selectAll().where('id', '=', businessId).executeTakeFirst();
        const receiptUrl = `${process.env.S3_PUBLIC_URL}/receipts/${dbReceipt.id}.pdf`;
        
        await sendReceiptEmail(
          receipt.customerEmail,
          receipt.customerName || 'Customer',
          receipt.receiptNumber,
          receipt.totalAmount,
          receiptUrl,
          business?.email || process.env.BREVO_RECEIPTS_FROM_EMAIL!
        );
      }
    }

    res.json({ success: true, syncedCount: createdReceipts.length });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Internal server error during sync' });
  }
});

// Push full POS data to cloud
router.post('/full', (req: any, res: any) => {
  const { businessId } = req.user;
  const { users, products, transactions, businessSetup, customers, suppliers, inventoryLogs } = req.body;

  // IMMEDIATELY RETURN to prevent ngrok/Cloudflare 524 timeouts for massive data syncs
  res.status(202).json({ success: true, message: "Sync accepted and processing in background" });

  // Process data in background
  (async () => {
    try {
      let syncedUsers = 0;
      let syncedProducts = 0;
      let syncedSales = 0;
      let syncedCustomers = 0;
      let syncedSuppliers = 0;
      let syncedMovements = 0;
    
    let defaultLocation = await db.selectFrom('StoreLocation').selectAll().where('businessId', '=', businessId).executeTakeFirst();
    if (!defaultLocation) {
       defaultLocation = await db.insertInto('StoreLocation').values({ id: randomUUID(), businessId, name: 'Main Branch' }).returningAll().executeTakeFirstOrThrow();
    }
    
    let targetLocationId = defaultLocation.id;
    if (businessSetup?.locationId) {
      const loc = await db.selectFrom('StoreLocation').selectAll().where('id', '=', businessSetup.locationId).where('businessId', '=', businessId).executeTakeFirst();
      if (loc) targetLocationId = loc.id;
    }

    let targetOutletId = null;
    if (businessSetup?.outletId) {
      const out = await db.selectFrom('Outlet').selectAll().where('id', '=', businessSetup.outletId).where('locationId', '=', targetLocationId).executeTakeFirst();
      if (out) targetOutletId = out.id;
    }

    // Sync users (upsert by email)
    if (users && Array.isArray(users)) {
      for (const u of users) {
        if (!u.name) continue;
        const fallbackEmail = u.email || `${u.name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${u.id}@pos.local`;
        
        // Map POS roles to Cloud Roles
        let role = 'CASHIER';
        if (u.role === 'SYSTEM_ADMIN' || u.role === 'Admin') role = 'ADMIN';
        else if (u.role === 'STORE_MANAGER' || u.role === 'Manager') role = 'MANAGER';

        const existingUser = await db.selectFrom('User').selectAll().where('email', '=', fallbackEmail).executeTakeFirst();
        if (existingUser) {
          await db.updateTable('User').set({
            name: u.name,
            role: role as any,
            locationId: targetLocationId
          }).where('email', '=', fallbackEmail).execute();
        } else {
          await db.insertInto('User').values({ id: randomUUID(),
            businessId,
            locationId: targetLocationId,
            email: fallbackEmail,
            password: u.pin || 'pos1234',
            name: u.name,
            role: role as any
          }).execute();
        }
        syncedUsers++;
      }
    }

    // Sync products (upsert by sku+businessId)
    if (products && Array.isArray(products)) {
      for (const p of products) {
        if (!p.name) continue;
        const sku = String(p.sku || p.barcode || p.id);
        
        const existing = await db.selectFrom('Product').selectAll().where('businessId', '=', businessId).where('sku', '=', sku).executeTakeFirst();
        if (existing) {
          await db.updateTable('Product').set({
              name: String(p.name),
              category: p.category ? String(p.category) : null,
              price: Number(p.price) || 0,
              costPrice: Number(p.costPrice) || 0,
              barcode: p.barcode ? String(p.barcode) : null
            }).where('id', '=', existing.id).execute();
        } else {
          await db.insertInto('Product').values({ id: randomUUID(),
              businessId,
              sku: String(sku),
              barcode: p.barcode ? String(p.barcode) : null,
              name: String(p.name),
              category: p.category ? String(p.category) : null,
              price: Number(p.price) || 0,
              costPrice: Number(p.costPrice) || 0
            }).returningAll().executeTakeFirstOrThrow();
        }
        
        // Find newly inserted or updated product ID
        const finalProduct = await db.selectFrom('Product').selectAll().where('businessId', '=', businessId).where('sku', '=', sku).executeTakeFirst();
        if (finalProduct) {
          const existingInventory = await db.selectFrom('ProductInventory').selectAll().where('productId', '=', finalProduct.id).where('locationId', '=', targetLocationId).where('outletId', targetOutletId ? '=' : 'is', targetOutletId ? targetOutletId : null).executeTakeFirst();

          if (existingInventory) {
            await db.updateTable('ProductInventory').set({ stock: Number(p.stock) || 0 }).where('id', '=', existingInventory.id).execute();
          } else {
            await db.insertInto('ProductInventory').values({ id: randomUUID(), 
                productId: finalProduct.id, 
                locationId: targetLocationId, 
                outletId: targetOutletId || null, 
                stock: Number(p.stock) || 0 
              }).returningAll().executeTakeFirstOrThrow();
          }
        }
        
        syncedProducts++;
      }
    }

    // Sync sales (transactions)
    if (transactions && Array.isArray(transactions)) {
       for (const t of transactions) {
          // Check if receipt exists
          const existing = await db.selectFrom('Receipt').selectAll().where('businessId', '=', businessId).where('receiptNumber', '=', String(t.id)).executeTakeFirst();
          const rawStatus = (t.status || '').toUpperCase();
          if (!existing && rawStatus !== 'CANCELLED') {
              require('fs').appendFileSync('sync-debug.log', JSON.stringify(t) + '\n');
              let safeStatus = 'COMPLETED';
              if (rawStatus === 'PENDING' || rawStatus === 'REFUNDED') safeStatus = rawStatus;

              const receiptId = randomUUID();
              await db.insertInto('Receipt').values({ id: receiptId,
                    businessId,
                    locationId: targetLocationId,
                    outletId: targetOutletId || undefined,
                    receiptNumber: String(t.id),
                    totalAmount: Number(t.totalAmount || t.total) || 0,
                    paymentMethod: String(t.paymentMethod || 'CASH'),
                    customerPhone: t.customerPhone ? String(t.customerPhone) : null,
                    mpesaCode: t.mpesaCode ? String(t.mpesaCode) : null,
                    status: safeStatus as any,
                    createdAt: t.timestamp ? new Date(t.timestamp) : undefined,
                    cashierName: t.cashier || null
              }).returningAll().executeTakeFirstOrThrow();
              const receiptItemsToInsert = (t.items || []).map((item: any) => ({
                id: randomUUID(),
                receiptId,

                        productName: item.product?.name || item.productName || 'Unknown',
                        quantity: Number(item.quantity) || 1,
                        unitPrice: Number(item.product?.price || item.unitPrice || 0),
                        totalPrice: Number(item.product?.price || item.unitPrice || 0) * (Number(item.quantity) || 1),
                      
              }));
              if (receiptItemsToInsert.length > 0) {
                await db.insertInto('ReceiptItem').values(receiptItemsToInsert).execute();
              }
              syncedSales++;
          }
       }
    }

    // Update settings if provided
    if (businessSetup) {
       await db.updateTable('Business').set({ settings: JSON.stringify(businessSetup) }).where('id', '=', businessId).execute();

       // Sync M-Pesa config from POS settings
       if (businessSetup.mpesaConfig && businessSetup.mpesaConfig.consumerKey) {
          const mc = businessSetup.mpesaConfig;
          const existingConfig = await db.selectFrom('MpesaConfig').selectAll().where('businessId', '=', businessId).where('locationId', '=', targetLocationId).executeTakeFirst();
          
          const configData = {
                businessId,
                locationId: targetLocationId,
                merchantType: mc.type === 'Paybill' ? 'PAYBILL' : 'BUY_GOODS',
                tillNumber: mc.type === 'Till' ? String(mc.partyB || mc.shortcode || '') : null,
                paybillNumber: mc.type === 'Paybill' ? String(mc.partyB || mc.shortcode || '') : null,
                accountReference: String(businessSetup.mpesaAccountNumber || ''),
                environment: mc.environment?.toLowerCase() === 'live' || mc.environment?.toLowerCase() === 'production' ? 'production' : 'sandbox',
                consumerKey: String(mc.consumerKey),
                consumerSecret: String(mc.consumerSecret),
                passkey: String(mc.passkey || ''),
                shortcode: String(mc.shortcode || mc.partyB || ''),
                initiatorName: mc.initiatorName ? String(mc.initiatorName) : null,
                initiatorPassword: mc.initiatorPassword ? String(mc.initiatorPassword) : null
          };

          if (existingConfig) {
             await db.updateTable('MpesaConfig').set(configData).where('id', '=', existingConfig.id).execute();
          } else {
             await db.insertInto('MpesaConfig').values({ id: randomUUID(), ...configData }).returningAll().executeTakeFirstOrThrow();
          }
       } else if (businessSetup.mpesaConsumerKey && businessSetup.mpesaConsumerSecret) {
          // Fallback for legacy POS versions
          const existingConfig = await db.selectFrom('MpesaConfig').selectAll().where('businessId', '=', businessId).where('locationId', '=', targetLocationId).executeTakeFirst();
          
          const configData = {
                businessId,
                locationId: targetLocationId,
                merchantType: businessSetup.mpesaPaybill ? 'PAYBILL' : 'BUY_GOODS',
                tillNumber: String(businessSetup.mpesaTill || ''),
                paybillNumber: String(businessSetup.mpesaPaybill || ''),
                accountReference: String(businessSetup.mpesaAccountNumber || ''),
                environment: businessSetup.mpesaEnv === 'live' ? 'production' : 'sandbox',
                consumerKey: String(businessSetup.mpesaConsumerKey),
                consumerSecret: String(businessSetup.mpesaConsumerSecret),
                passkey: String(businessSetup.mpesaPasskey || ''),
                shortcode: String(businessSetup.mpesaTill || businessSetup.mpesaPaybill || '')
          };

          if (existingConfig) {
             await db.updateTable('MpesaConfig').set(configData).where('id', '=', existingConfig.id).execute();
          } else {
             await db.insertInto('MpesaConfig').values({ id: randomUUID(), ...configData }).returningAll().executeTakeFirstOrThrow();
          }
       }
    }

    // Sync Customers
    if (customers && Array.isArray(customers)) {
       for (const c of customers) {
          if (!c.name) continue;
          const existing = await db.selectFrom('Customer').selectAll().where('businessId', '=', businessId).where('name', '=', String(c.name)).executeTakeFirst();
          if (existing) {
             await db.updateTable('Customer').set({
                   phone: c.phone ? String(c.phone) : null,
                   email: c.email ? String(c.email) : null
                }).where('id', '=', existing.id).execute();
          } else {
             await db.insertInto('Customer').values({ id: randomUUID(),
                   businessId,
                   name: String(c.name),
                   phone: c.phone ? String(c.phone) : null,
                   email: c.email ? String(c.email) : null
                }).returningAll().executeTakeFirstOrThrow();
          }
          syncedCustomers++;
       }
    }

    // Sync Suppliers
    if (suppliers && Array.isArray(suppliers)) {
       for (const s of suppliers) {
          if (!s.name) continue;
          const existing = await db.selectFrom('Supplier').selectAll().where('businessId', '=', businessId).where('name', '=', String(s.name)).executeTakeFirst();
          if (existing) {
             await db.updateTable('Supplier').set({
                   contact: s.phone ? String(s.phone) : (s.contactPerson ? String(s.contactPerson) : null),
                   email: s.email ? String(s.email) : null
                }).where('id', '=', existing.id).execute();
          } else {
             await db.insertInto('Supplier').values({ id: randomUUID(),
                   businessId,
                   name: String(s.name),
                   contact: s.phone ? String(s.phone) : (s.contactPerson ? String(s.contactPerson) : null),
                   email: s.email ? String(s.email) : null
                }).returningAll().executeTakeFirstOrThrow();
          }
          syncedSuppliers++;
       }
    }

      // Sync Inventory Logs to StockMovements
      if (inventoryLogs && Array.isArray(inventoryLogs)) {
        for (const log of inventoryLogs) {
          const existingLog = await db.selectFrom('StockMovement').selectAll().where('businessId', '=', businessId).where('reference', '=', String(log.reference || log.id)).executeTakeFirst();

          if (!existingLog) {
            await db.insertInto('StockMovement').values({ id: randomUUID(),
                businessId,
                productId: String(log.productId),
                locationId: targetLocationId,
                outletId: targetOutletId,
                type: log.type || log.reason || 'SALE',
                quantity: Math.abs(Number(log.variance) || 0),
                reference: String(log.reference || log.id),
                timestamp: new Date(log.timestamp || Date.now())
              }).returningAll().executeTakeFirstOrThrow();

            // Also deduct from absolute stock in ProductInventory
            let inventory = await db.selectFrom('ProductInventory').selectAll().where('productId', '=', String(log.productId)).where('locationId', '=', targetLocationId).where('outletId', targetOutletId ? '=' : 'is', targetOutletId ? targetOutletId : null).executeTakeFirst();

            if (!inventory) {
               inventory = await db.selectFrom('ProductInventory').selectAll().where('productId', '=', String(log.productId)).where('locationId', '=', targetLocationId).where('outletId', 'is', null).executeTakeFirst();
            }

            if (inventory) {
              await db.updateTable('ProductInventory').set({ stock: Math.max(0, inventory.stock + Number(log.variance || 0)) }).where('id', '=', inventory.id).execute();
            }
            syncedMovements++;
          }
        }
      }

      console.log(`[Background Sync] Success! Users: ${syncedUsers}, Products: ${syncedProducts}, Sales: ${syncedSales}, Customers: ${syncedCustomers}, Suppliers: ${syncedSuppliers}, Movements: ${syncedMovements}`);
    } catch (error: any) {
      console.error('POS Full Background Sync error:', error);
    }
  })();
});

export default router;

