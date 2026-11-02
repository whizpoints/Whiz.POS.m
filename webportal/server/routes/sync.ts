import prisma from '../db.js';
import { Router } from 'express';
import * as jwt from 'jsonwebtoken';
import { sendReceiptEmail } from '../services/emailService.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Middleware to authenticate sync requests
const authenticate = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const rawKey = req.headers['x-api-key'] || (authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : null);

  if (!rawKey) {
    return res.status(401).json({ error: 'Missing authorization header or API key' });
  }

  // 1. Check if it's an API Key (Server, Terminal, Business, StoreLocation)
  try {
    const server = await prisma.server.findFirst({ where: { apiKey: rawKey } });
    if (server) {
      req.user = { businessId: server.businessId, serverId: server.id, role: 'SERVER' };
      return next();
    }

    const terminal = await prisma.terminal.findFirst({ where: { apiKey: rawKey } });
    if (terminal) {
      req.user = { businessId: terminal.businessId, terminalId: terminal.id, outletId: terminal.outletId, role: 'TERMINAL' };
      return next();
    }

    const business = await prisma.business.findFirst({ where: { apiKey: rawKey } });
    if (business) {
      req.user = { businessId: business.id, role: 'ADMIN' };
      return next();
    }

    const storeLoc = await prisma.storeLocation.findFirst({ where: { apiKey: rawKey } });
    if (storeLoc) {
      req.user = { businessId: storeLoc.businessId, locationId: storeLoc.id, role: 'LOCATION' };
      return next();
    }
  } catch (dbErr) {
    console.error('[Auth DB Error]', dbErr);
  }

  // 2. Check if it's a valid JWT
  try {
    const payload: any = jwt.verify(rawKey, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (jwtErr) {
    return res.status(401).json({ error: 'Invalid or expired token / API key' });
  }
};

router.use(authenticate);

// GET /api/sync - Return catalog, inventory, users, and setup for POS client
router.get('/', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    let targetOutletId = req.query.outletId || req.headers['x-outlet-id'] || req.headers['X-Outlet-Id'] || req.user.outletId;

    if (!targetOutletId && req.user.terminalId) {
      const terminal = await prisma.terminal.findUnique({ where: { id: req.user.terminalId } });
      if (terminal?.outletId) {
        targetOutletId = terminal.outletId;
      }
    }

    const [allProducts, allUsers, categories, customers, suppliers, business, locations, mpesaConfig] = await Promise.all([
      prisma.product.findMany({ where: { businessId } }),
      prisma.user.findMany({ where: { businessId } }),
      prisma.category.findMany({ where: { businessId } }),
      prisma.customer.findMany({ where: { businessId } }),
      prisma.supplier.findMany({ where: { businessId } }),
      prisma.business.findUnique({ where: { id: businessId } }),
      prisma.storeLocation.findMany({ where: { businessId } }),
      prisma.mpesaConfig.findFirst({ where: { businessId } })
    ]);

    let targetOutlet = null;
    if (targetOutletId) {
      targetOutlet = await prisma.outlet.findUnique({ where: { id: String(targetOutletId) } });
    }

    let finalProducts = [];
    let finalUsers = [];

    if (targetOutletId) {
      const outletInventories = await prisma.productInventory.findMany({
        where: { outletId: String(targetOutletId) }
      });

      const stockMap = new Map();
      for (const inv of outletInventories) {
        stockMap.set(inv.productId, Number(inv.stock) || 0);
      }

      const assignedProductIds = new Set(outletInventories.map(inv => inv.productId));
      finalProducts = allProducts
        .filter(p => assignedProductIds.has(p.id))
        .map(p => ({
          ...p,
          stock: stockMap.get(p.id) ?? 0
        }));

      finalUsers = allUsers.filter(u => 
        u.outletId === targetOutletId || 
        u.role === 'ADMIN' || 
        u.role === 'MANAGER'
      );
    } else {
      // Unscoped / Central Store: strictly return Central Store inventory (outletId is null)
      const inventories = await prisma.productInventory.findMany({
        where: { product: { businessId }, outletId: null }
      });

      const stockMap = new Map();
      for (const inv of inventories) {
        stockMap.set(inv.productId, Number(inv.stock) || 0);
      }

      finalProducts = allProducts.map((p) => ({
        ...p,
        stock: stockMap.has(p.id) ? stockMap.get(p.id) : 0
      }));

      finalUsers = allUsers;
    }

    res.json({
      success: true,
      outletId: targetOutletId || null,
      outletName: targetOutlet?.name || null,
      products: finalProducts,
      users: finalUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        pin: u.pin || null,
        locationId: u.locationId,
        outletId: u.outletId
      })),
      categories: categories.map((c) => c.name),
      creditCustomers: customers,
      loyaltyCustomers: [],
      suppliers,
      expenses: [],
      salaries: [],
      businessSetup: business ? (() => {
        let bSettings: any = {};
        try { bSettings = typeof business.settings === 'string' ? JSON.parse(business.settings) : (business.settings || {}); } catch(e) {}
        const effectivePin = business.kraPin || bSettings.kraPin || bSettings.etimsPin || '';
        const till = mpesaConfig?.tillNumber || bSettings.mpesaTill || bSettings.tillNumber || '';
        const paybill = mpesaConfig?.paybillNumber || bSettings.mpesaPaybill || bSettings.paybillNumber || '';
        const accNum = mpesaConfig?.accountReference || bSettings.mpesaAccountNumber || bSettings.accountNumber || '';

        return {
          ...bSettings,
          id: business.id,
          businessId: business.id,
          businessName: business.name || bSettings.businessName,
          phone: bSettings.phone || business.phone || '',
          email: bSettings.email || business.email || '',
          address: bSettings.address || business.address || '',
          receiptFooter: bSettings.receiptFooter || 'Thank you for your business!',
          receiptFooterNote: bSettings.receiptFooterNote || '',
          servedByLabel: bSettings.servedByLabel || bSettings.servedBy || 'Served by',
          servedBy: bSettings.servedBy || 'Cashier',
          mpesaTill: till,
          tillNumber: till,
          mpesaPaybill: paybill,
          paybillNumber: paybill,
          mpesaAccountNumber: accNum,
          accountNumber: accNum,
          kraPin: effectivePin,
          kraEnabled: bSettings.kraEnabled !== undefined ? Boolean(bSettings.kraEnabled) : (bSettings.etimsEnabled !== undefined ? Boolean(bSettings.etimsEnabled) : false),
          etimsPin: effectivePin,
          etimsToken: bSettings.etimsToken || bSettings.kraToken || '',
          etimsBranch: bSettings.etimsBranch || bSettings.etimsBranchId || '00',
          etimsSerial: bSettings.etimsSerial || bSettings.etimsDeviceSerial || '',
          etimsUrl: bSettings.etimsUrl || 'https://etims-api-sbx.kra.go.ke/etims-api',
          etimsEnv: bSettings.etimsEnv || (bSettings.etimsUrl?.includes('-sbx') ? 'sandbox' : 'production'),
          currency: bSettings.currency || 'KES',
          onScreenKeyboard: bSettings.onScreenKeyboard ?? false,
          autoLogoffEnabled: bSettings.autoLogoffEnabled ?? false,
          autoLogoffMinutes: Number(bSettings.autoLogoffMinutes) || 5,
          printerPaperWidth: Number(bSettings.printerPaperWidth) || 80,
          disableReceiptPrinting: bSettings.disableReceiptPrinting ?? false,
          apiKey: business.apiKey,
          locationId: targetOutlet?.locationId || locations[0]?.id || bSettings.locationId || null,
          outletId: targetOutletId || bSettings.outletId || null,
          outletName: targetOutlet?.name || bSettings.outletName || null,
          locations,
          mpesaConfig: mpesaConfig ? {
            enabled: !!(mpesaConfig.stkEnabled || mpesaConfig.c2bEnabled),
            type: mpesaConfig.merchantType === 'PAYBILL' ? 'Paybill' : 'Till',
            partyB: mpesaConfig.merchantType === 'PAYBILL' ? mpesaConfig.paybillNumber : mpesaConfig.tillNumber,
            shortcode: mpesaConfig.shortcode,
            consumerKey: mpesaConfig.consumerKey,
            consumerSecret: mpesaConfig.consumerSecret,
            passkey: mpesaConfig.passkey,
            environment: mpesaConfig.environment || 'sandbox'
          } : undefined,
          updatedAt: new Date().toISOString(),
          createdAt: business.createdAt || new Date().toISOString()
        };
      })() : {}
    });
  } catch (error: any) {
    console.error('Fetch sync data error:', error);
    res.status(500).json({ error: 'Failed to fetch sync data: ' + (error.message || error) });
  }
});

// Push local sales to cloud

// POST /api/sync - Handle queue operations or wrapped objects
router.post('/', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const body = req.body;

    const defaultLoc = await prisma.storeLocation.findFirst({ where: { businessId } });
    const targetLocationId = defaultLoc?.id || null;
    const targetOutletId = req.headers['x-outlet-id'] || req.query.outletId || req.user.outletId || null;

    const io = req.app.get('io');
    let processedCount = 0;

    const recordTransaction = async (txn: any) => {
      if (!txn || !txn.id) return null;
      const receiptNumber = String(txn.id || txn.receiptNumber);
      const existing = await prisma.receipt.findFirst({ where: { businessId, receiptNumber } });
      const rawStatus = (txn.status || 'COMPLETED').toUpperCase();

      if (existing) {
        if (rawStatus === 'REFUNDED' || rawStatus === 'CANCELLED') {
          await prisma.receipt.update({ where: { id: existing.id }, data: { status: rawStatus as any } });
        }
        return existing;
      }

      if (rawStatus === 'CANCELLED') return null;

      const items = txn.items || [];
      const dbReceipt = await prisma.receipt.create({
        data: {
          id: String(txn.id),
          businessId,
          locationId: txn.locationId || targetLocationId,
          outletId: txn.outletId || targetOutletId || undefined,
          receiptNumber,
          totalAmount: Number(txn.totalAmount || txn.total || 0),
          paymentMethod: String(txn.paymentMethod || 'cash').toLowerCase(),
          customerPhone: txn.customerPhone ? String(txn.customerPhone) : null,
          mpesaCode: txn.mpesaCode ? String(txn.mpesaCode) : null,
          status: (rawStatus === 'PENDING' || rawStatus === 'REFUNDED') ? rawStatus as any : 'COMPLETED',
          createdAt: txn.timestamp ? new Date(txn.timestamp) : new Date(),
          cashierName: txn.cashier || txn.cashierName || null,
          items: {
            create: items.map((item: any) => ({
              productName: item.product?.name || item.productName || item.name || 'Unknown',
              quantity: Number(item.quantity) || 1,
              unitPrice: Number(item.product?.price || item.unitPrice || item.price || 0),
              totalPrice: Number(item.totalPrice || item.total || (Number(item.product?.price || item.unitPrice || item.price || 0) * (Number(item.quantity) || 1)))
            }))
          }
        }
      });

      // Stock deduction & movement
      for (const item of items) {
        const prodId = item.product?.id || item.productId;
        const qty = Number(item.quantity) || 1;
        if (prodId) {
          try {
            await prisma.stockMovement.create({
              data: {
                businessId,
                productId: String(prodId),
                locationId: txn.locationId || targetLocationId,
                outletId: txn.outletId || targetOutletId || undefined,
                type: 'SALE',
                quantity: qty,
                reference: receiptNumber
              }
            });
          } catch(e) {}

          try {
            let inv = null;
            if (targetOutletId) {
              inv = await prisma.productInventory.findFirst({ where: { productId: String(prodId), outletId: targetOutletId } });
            }
            if (!inv && targetLocationId) {
              inv = await prisma.productInventory.findFirst({ where: { productId: String(prodId), locationId: targetLocationId } });
            }
            if (inv) {
              await prisma.productInventory.update({
                where: { id: inv.id },
                data: { stock: Math.max(0, (inv.stock || 0) - qty) }
              });
            }
          } catch(e) {}
        }
      }

      return dbReceipt;
    };

    if (Array.isArray(body)) {
      for (const op of body) {
        if (!op || !op.type) continue;
        if (op.type === 'new-transaction') {
          await recordTransaction(op.data);
          processedCount++;
        } else if (op.type === 'update-transaction') {
          if (op.data?.id && op.data?.updates?.status) {
            await prisma.receipt.updateMany({
              where: { receiptNumber: String(op.data.id) },
              data: { status: op.data.updates.status.toUpperCase() }
            });
            processedCount++;
          }
        }
      }
    } else if (body && (body.transactions || body.receipts)) {
      const txns = body.transactions || body.receipts || [];
      for (const t of txns) {
        await recordTransaction(t);
        processedCount++;
      }
    }

    if (io) {
      io.to(`business_${businessId}`).emit('dashboard_update', { timestamp: new Date().toISOString() });
    }

    return res.json({ success: true, processedCount });
  } catch (err: any) {
    console.error('Cloud Sync POST error:', err);
    return res.status(500).json({ error: 'Cloud Sync failed: ' + (err.message || err) });
  }
});

router.post('/sales', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { receipts } = req.body;

    const createdReceipts = [];

    for (const receipt of receipts) {
      // Create receipt in DB
      const dbReceipt = await prisma.receipt.create({
        data: {
          businessId,
          receiptNumber: receipt.receiptNumber,
          totalAmount: receipt.totalAmount,
          paymentMethod: receipt.paymentMethod,
          customerPhone: receipt.customerPhone,
          status: receipt.status || 'COMPLETED',
          cashierName: receipt.cashier || null,
          items: {
            create: (receipt.items || []).map((item: any) => ({
              productName: item.product?.name || item.productName || 'Unknown',
              quantity: Number(item.quantity) || 1,
              unitPrice: Number(item.product?.price || item.unitPrice || 0),
              totalPrice: Number(item.product?.price || item.unitPrice || 0) * (Number(item.quantity) || 1),
            }))
          }
        }
      });
      createdReceipts.push(dbReceipt);

      // If email provided (or phone logic later), trigger digital receipt
      if (receipt.customerEmail) {
        const business = await prisma.business.findUnique({ where: { id: businessId } });
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

    const io = req.app.get('io');
    if (io) {
       io.to(`business_${businessId}`).emit('cloud_sync_received', { timestamp: new Date().toISOString() });
       io.to(`business_${businessId}`).emit('downward_sync_event', { timestamp: new Date().toISOString() });
       io.to(`business_${businessId}`).emit('dashboard_update', { timestamp: new Date().toISOString() });
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
    
    let defaultLocation = await prisma.storeLocation.findFirst({ where: { businessId } });
    if (!defaultLocation) {
       defaultLocation = await prisma.storeLocation.create({ data: { businessId, name: 'Main Branch' } });
    }
    
    let targetLocationId = defaultLocation.id;
    if (businessSetup?.locationId) {
      const loc = await prisma.storeLocation.findFirst({ where: { id: businessSetup.locationId, businessId } });
      if (loc) targetLocationId = loc.id;
    }

    let targetOutletId = null;
    if (businessSetup?.outletId) {
      const out = await prisma.outlet.findFirst({ where: { id: businessSetup.outletId, locationId: targetLocationId } });
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

        await prisma.user.upsert({
          where: { email: fallbackEmail },
          create: {
            businessId,
            locationId: targetLocationId,
            email: fallbackEmail,
            password: u.pin || 'pos1234',
            name: u.name,
            role: role as any
          },
          update: {
            name: u.name,
            role: role as any,
            locationId: targetLocationId
          }
        });
        syncedUsers++;
      }
    }

    // Sync products (upsert by sku+businessId)
    if (products && Array.isArray(products)) {
      for (const p of products) {
        if (!p.name) continue;
        const sku = String(p.sku || p.barcode || p.id);
        
        const existing = await prisma.product.findFirst({
          where: { businessId, sku }
        });
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
        } else {
          await prisma.product.create({
            data: {
              businessId,
              sku: String(sku),
              barcode: p.barcode ? String(p.barcode) : null,
              name: String(p.name),
              category: p.category ? String(p.category) : null,
              price: Number(p.price) || 0,
              costPrice: Number(p.costPrice) || 0
            }
          });
        }
        
        // Absolute inventory overwrite removed in favor of delta-based inventoryLogs processing
        
        syncedProducts++;
      }
    }

    // Sync sales (transactions)
    if (transactions && Array.isArray(transactions)) {
       for (const t of transactions) {
          // Check if receipt exists
          const existing = await prisma.receipt.findFirst({ where: { businessId, receiptNumber: String(t.id) } });
          const rawStatus = (t.status || '').toUpperCase();
          if (!existing && rawStatus !== 'CANCELLED') {
              let safeStatus = 'COMPLETED';
              if (rawStatus === 'PENDING' || rawStatus === 'REFUNDED') safeStatus = rawStatus;

              await prisma.receipt.create({
                 data: {
                    businessId,
                    locationId: targetLocationId,
                    receiptNumber: String(t.id),
                    totalAmount: Number(t.totalAmount || t.total) || 0,
                    paymentMethod: String(t.paymentMethod || 'CASH'),
                    customerPhone: t.customerPhone ? String(t.customerPhone) : null,
                    mpesaCode: t.mpesaCode ? String(t.mpesaCode) : null,
                    status: safeStatus as any,
                    createdAt: t.timestamp ? new Date(t.timestamp) : undefined,
                    cashierName: t.cashier || null,
                    outletId: targetOutletId || undefined,
                    items: {
                      create: (t.items || []).map((item: any) => ({
                        productName: item.product?.name || item.productName || 'Unknown',
                        quantity: Number(item.quantity) || 1,
                        unitPrice: Number(item.product?.price || item.unitPrice || 0),
                        totalPrice: Number(item.product?.price || item.unitPrice || 0) * (Number(item.quantity) || 1),
                      }))
                    }
                 }
              });
              syncedSales++;
          }
       }
    }

    // Update settings if provided
    if (businessSetup) {
       await prisma.business.update({
          where: { id: businessId },
          data: { settings: typeof businessSetup === 'string' ? businessSetup : JSON.stringify(businessSetup) }
       });

       // Sync M-Pesa config from POS settings
       if (businessSetup.mpesaConfig && businessSetup.mpesaConfig.consumerKey) {
          const mc = businessSetup.mpesaConfig;
          const existingConfig = await prisma.mpesaConfig.findFirst({ where: { businessId, locationId: targetLocationId } });
          
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
             await prisma.mpesaConfig.update({ where: { id: existingConfig.id }, data: configData });
          } else {
             await prisma.mpesaConfig.create({ data: configData });
          }
       } else if (businessSetup.mpesaConsumerKey && businessSetup.mpesaConsumerSecret) {
          // Fallback for legacy POS versions
          const existingConfig = await prisma.mpesaConfig.findFirst({ where: { businessId, locationId: targetLocationId } });
          
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
             await prisma.mpesaConfig.update({ where: { id: existingConfig.id }, data: configData });
          } else {
             await prisma.mpesaConfig.create({ data: configData });
          }
       }
    }

    // Sync Customers
    if (customers && Array.isArray(customers)) {
       for (const c of customers) {
          if (!c.name) continue;
          const existing = await prisma.customer.findFirst({ where: { businessId, name: String(c.name) } });
          if (existing) {
             await prisma.customer.update({
                where: { id: existing.id },
                data: {
                   phone: c.phone ? String(c.phone) : null,
                   email: c.email ? String(c.email) : null
                }
             });
          } else {
             await prisma.customer.create({
                data: {
                   businessId,
                   name: String(c.name),
                   phone: c.phone ? String(c.phone) : null,
                   email: c.email ? String(c.email) : null
                }
             });
          }
          syncedCustomers++;
       }
    }

    // Sync Suppliers
    if (suppliers && Array.isArray(suppliers)) {
       for (const s of suppliers) {
          if (!s.name) continue;
          const existing = await prisma.supplier.findFirst({ where: { businessId, name: String(s.name) } });
          if (existing) {
             await prisma.supplier.update({
                where: { id: existing.id },
                data: {
                   contact: s.phone ? String(s.phone) : (s.contactPerson ? String(s.contactPerson) : null),
                   email: s.email ? String(s.email) : null
                }
             });
          } else {
             await prisma.supplier.create({
                data: {
                   businessId,
                   name: String(s.name),
                   contact: s.phone ? String(s.phone) : (s.contactPerson ? String(s.contactPerson) : null),
                   email: s.email ? String(s.email) : null
                }
             });
          }
          syncedSuppliers++;
       }
    }

      // Sync Inventory Logs to StockMovements
      if (inventoryLogs && Array.isArray(inventoryLogs)) {
        for (const log of inventoryLogs) {
          const existingLog = await prisma.stockMovement.findFirst({
            where: { businessId, reference: String(log.reference || log.id) }
          });

          if (!existingLog) {
            // log.productId from POS might be the SKU or the actual CUID. We must check both.
            const productMatch = await prisma.product.findFirst({ 
              where: { 
                businessId, 
                OR: [
                  { id: String(log.productId) },
                  { sku: String(log.productId) }
                ]
              } 
            });
            if (!productMatch) continue; // Skip if product doesn't exist

            await prisma.stockMovement.create({
              data: {
                businessId,
                productId: productMatch.id,
                locationId: targetLocationId as string,
                outletId: targetOutletId,
                type: log.type || log.reason || 'SALE',
                quantity: Math.abs(Number(log.variance) || 0),
                reference: String(log.reference || log.id),
                timestamp: new Date(log.timestamp || Date.now())
              }
            });

            // Also deduct from absolute stock in ProductInventory
            let inventory = await prisma.productInventory.findFirst({
              where: { 
                productId: productMatch.id, 
                locationId: targetLocationId, 
                outletId: targetOutletId 
              }
            });

            if (!inventory) {
               inventory = await prisma.productInventory.findFirst({
                  where: {
                     productId: productMatch.id,
                     locationId: targetLocationId,
                     outletId: null
                  }
               });
            }

            if (inventory) {
              await prisma.productInventory.update({
                where: { id: inventory.id },
                data: { stock: Math.max(0, inventory.stock + Number(log.variance || 0)) }
              });
            }
            syncedMovements++;
          }
        }
      }

      console.log(`[Background Sync] Success! Users: ${syncedUsers}, Products: ${syncedProducts}, Sales: ${syncedSales}, Customers: ${syncedCustomers}, Suppliers: ${syncedSuppliers}, Movements: ${syncedMovements}`);
      
      const io = req.app.get('io');
      if (io) {
         io.to(`business_${businessId}`).emit('cloud_sync_received', { timestamp: new Date().toISOString() });
         io.to(`business_${businessId}`).emit('downward_sync_event', { timestamp: new Date().toISOString() });
         io.to(`business_${businessId}`).emit('dashboard_update', { timestamp: new Date().toISOString() });
      }
    } catch (error: any) {
      console.error('POS Full Background Sync error:', error);
    }
  })();
});

export default router;
