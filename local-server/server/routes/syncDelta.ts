import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import prisma from '../prisma.js';
import * as jwt from 'jsonwebtoken';

const router = Router();
// const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Middleware to authenticate sync requests
const authenticate = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];

  if (apiKey) {
    // Check if it's a Business API Key
    let business = await prisma.business.findFirst({ where: { apiKey } });
    let outletId = undefined;
    let locationId = undefined;

    // If not a business, check if it's a Terminal API Key
    if (!business) {
      const terminal = await prisma.terminal.findFirst({ where: { apiKey } });
      if (terminal && terminal.outletId) {
        const outlet = await prisma.outlet.findFirst({ where: { id: terminal.outletId } });
        if (outlet) {
          business = await prisma.business.findUnique({ where: { id: outlet.businessId } });
          outletId = outlet.id;
          locationId = outlet.locationId;
        }
      }
    }

    if (!business) {
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
    const payload = jwt.verify(token, JWT_SECRET);
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
      const decoded: any = jwt.verify(token, JWT_SECRET); // Will throw if invalid JWT
      const logs = await prisma.syncLog.findMany({
          where: { businessId: decoded.businessId || decoded.id },
          orderBy: { createdAt: 'desc' },
          take: 100
      });
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

    const [
      users, products, categories, inventory, stockMovements, customers, suppliers, 
      businessData, outlets, terminals
    ] = await Promise.all([
      prisma.user.findMany({ 
        where: { 
          businessId, 
          updatedAt: { gt: sinceDate },
          ...(req.user.outletId ? { OR: [{ outletId: req.user.outletId }, { role: 'ADMIN' }, { role: 'MANAGER' }] } : {})
        } 
      }),
      prisma.product.findMany({ 
        where: { 
          businessId,
          ...(req.user.outletId ? { inventory: { some: { outletId: req.user.outletId } } } : {}),
          OR: [
            { updatedAt: { gt: sinceDate } },
            ...(req.user.outletId ? [{ inventory: { some: { outletId: req.user.outletId, updatedAt: { gt: sinceDate } } } }] : [])
          ]
        } 
      }),
      prisma.category.findMany({ where: { businessId, updatedAt: { gt: sinceDate } } }),
      prisma.productInventory.findMany({ 
          where: { 
              locationId: locationId ? String(locationId) : undefined,
              outletId: outletId ? String(outletId) : undefined,
              updatedAt: { gt: sinceDate },
              product: { businessId } // Ensure it belongs to the business
          },
          include: { product: true }
      }),
      prisma.stockMovement.findMany({
          where: {
              locationId: locationId ? String(locationId) : undefined,
              ...(outletId ? { OR: [{ outletId: String(outletId) }, { outletId: null }] } : {}),
              updatedAt: { gt: sinceDate },
          }
      }),
      prisma.customer.findMany({ where: { businessId, updatedAt: { gt: sinceDate } } }),
      prisma.supplier.findMany({ where: { businessId, updatedAt: { gt: sinceDate } } }),
      prisma.business.findUnique({ where: { id: businessId } }),
      prisma.outlet.findMany({ where: { businessId, updatedAt: { gt: sinceDate } } }),
      prisma.outlet.findMany({ where: { businessId }, select: { id: true } }).then(outlets => 
        prisma.terminal.findMany({ 
          where: { outletId: { in: outlets.map(o => o.id) }, updatedAt: { gt: sinceDate } } 
        })
      )
    ]);

    console.log(`[SYNC GET] Outlet: ${req.user.outletId}, Since: ${sinceDate}, Products Found: ${products.length}, Inventory Found: ${inventory.length}`);

    const timestamp = new Date().toISOString();
    const details = `Pulled ${users.length} users, ${products.length} products, ${categories.length} categories, ${stockMovements.length} stock movements`;
    try {
      await prisma.syncLog.create({
        data: {
          businessId,
          outletId: req.user.outletId || null,
          terminal: 'Unknown',
          type: 'PULL',
          status: 'SUCCESS',
          details,
        }
      });
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
        businessSetup: businessData && businessData.updatedAt > sinceDate ? {
          ...(typeof businessData.settings === 'string' ? JSON.parse(businessData.settings) : businessData.settings),
          businessName: businessData.name 
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
      const loc = await prisma.storeLocation.findFirst({ where: { id: businessSetup.locationId, businessId } });
      if (loc) targetLocationId = loc.id;
    }

    if (businessSetup?.outletId && targetLocationId) {
      const out = await prisma.outlet.findFirst({ where: { id: businessSetup.outletId, locationId: targetLocationId } });
      if (out) targetOutletId = out.id;
    }

    // Fallback: resolve from the authenticated user's outlet
    if (!targetOutletId && req.user.outletId) {
      const out = await prisma.outlet.findFirst({ where: { id: req.user.outletId, location: { businessId } }, include: { location: true } });
      if (out) {
        targetOutletId = out.id;
        if (!targetLocationId) targetLocationId = out.locationId;
      }
    }

    // Fallback: resolve from the business's first location
    if (!targetLocationId) {
      const loc = await prisma.storeLocation.findFirst({ where: { businessId } });
      if (loc) targetLocationId = loc.id;
    }

    // Fallback: resolve from the business's first outlet
    if (!targetOutletId && targetLocationId) {
      const out = await prisma.outlet.findFirst({ where: { locationId: targetLocationId } });
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
        
        const existing = await prisma.user.findUnique({ where: { email: fallbackEmail } });
        if (resolveConflict(u, existing)) {
            let role = 'CASHIER';
            if (u.role === 'SYSTEM_ADMIN' || u.role === 'Admin') role = 'ADMIN';
            else if (u.role === 'STORE_MANAGER' || u.role === 'Manager') role = 'MANAGER';

            await prisma.user.upsert({
              where: { email: fallbackEmail },
              create: {
                businessId, locationId: targetLocationId, email: fallbackEmail,
                password: u.pin || 'pos1234', name: u.name, role: role as any,
                updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date()
              },
              update: {
                name: u.name, role: role as any, locationId: targetLocationId,
                updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date()
              }
            });
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
        
        const existing = await prisma.product.findFirst({ where: { businessId, sku } });
        if (resolveConflict(p, existing)) {
            if (existing) {
              await prisma.product.update({
                where: { id: existing.id },
                data: {
                  name: String(p.name), category: p.category ? String(p.category) : null,
                  price: Number(p.price) || 0, costPrice: Number(p.costPrice) || 0,
                  barcode: p.barcode ? String(p.barcode) : null,
                  updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date()
                }
              });
            } else {
              await prisma.product.create({
                data: {
                  businessId, sku: String(sku), barcode: p.barcode ? String(p.barcode) : null,
                  name: String(p.name), category: p.category ? String(p.category) : null,
                  price: Number(p.price) || 0, costPrice: Number(p.costPrice) || 0,
                  updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date()
                }
              });
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
          const existing = await prisma.stockMovement.findUnique({ where: { id: m.id } });
          if (!existing) {
             const resolvedLocationId = targetLocationId || m.locationId || null;
             const resolvedOutletId = targetOutletId || m.outletId || null;

             await prisma.stockMovement.create({
                data: {
                   id: m.id,
                   businessId,
                   productId: m.productId,
                   locationId: resolvedLocationId,
                   outletId: resolvedOutletId,
                   type: m.type,
                   quantity: Number(m.quantity),
                   reference: m.reference ? String(m.reference) : null,
                   sourceTerminal: m.sourceTerminal ? String(m.sourceTerminal) : 'POS',
                   timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
                   updatedAt: m.updatedAt ? new Date(m.updatedAt) : new Date()
                }
             });

             // Update inventory based on movement type
             const invExisting = await prisma.productInventory.findFirst({
                where: { productId: m.productId, locationId: resolvedLocationId, outletId: resolvedOutletId }
             });

             let stockChange = Number(m.quantity);
             if (m.type === 'SALE' || m.type === 'TRANSFER_OUT' || m.type === 'ADJUSTMENT_DOWN' || m.type === 'subtract') stockChange = -Math.abs(stockChange);
             else if (m.type === 'TRANSFER_IN' || m.type === 'PO' || m.type === 'INITIAL' || m.type === 'RETURN' || m.type === 'ADJUSTMENT_UP' || m.type === 'add') stockChange = Math.abs(stockChange);

             if (invExisting) {
                await prisma.productInventory.update({
                   where: { id: invExisting.id },
                   data: { stock: { increment: stockChange }, updatedAt: new Date() }
                });
             } else {
                await prisma.productInventory.create({
                   data: {
                      productId: m.productId,
                      locationId: resolvedLocationId,
                      outletId: resolvedOutletId,
                      stock: stockChange,
                      updatedAt: new Date()
                   }
                });
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
          const existing = await prisma.receipt.findFirst({ where: { businessId, receiptNumber: String(t.id) } });
          const rawStatus = (t.status || '').toUpperCase();
          if (resolveConflict(t, existing)) {
              if (rawStatus !== 'CANCELLED') {
                  let safeStatus = 'COMPLETED';
                  if (rawStatus === 'PENDING' || rawStatus === 'REFUNDED') safeStatus = rawStatus;

                  if (existing) {
                      await prisma.receipt.update({
                         where: { id: existing.id },
                         data: { status: safeStatus as any, updatedAt: t.updatedAt ? new Date(t.updatedAt) : new Date() }
                      });
                  } else {
                      const createdReceipt = await prisma.receipt.create({
                         data: {
                            businessId, locationId: targetLocationId, outletId: targetOutletId || null,
                            receiptNumber: String(t.id), totalAmount: Number(t.totalAmount || t.total) || 0,
                            paymentMethod: String(t.paymentMethod || 'CASH'), customerPhone: t.customerPhone ? String(t.customerPhone) : null,
                            mpesaCode: t.mpesaCode ? String(t.mpesaCode) : null, status: safeStatus as any,
                            createdAt: t.timestamp ? new Date(t.timestamp) : undefined,
                            updatedAt: t.updatedAt ? new Date(t.updatedAt) : new Date()
                         }
                      });
                      
                      if (t.items && Array.isArray(t.items)) {
                          for (const item of t.items) {
                              if (!item.product) continue;
                              await prisma.receiptItem.create({
                                  data: {
                                      receiptId: createdReceipt.id,
                                      productName: item.product.name || 'Unknown Item',
                                      quantity: Number(item.quantity) || 1,
                                      unitPrice: Number(item.product.price) || 0,
                                      totalPrice: (Number(item.quantity) || 1) * (Number(item.product.price) || 0)
                                  }
                              });
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

    // 4. Customers
    if (customers && Array.isArray(customers)) {
       for (const c of customers) {
          if (!c.name) continue;
          const existing = await prisma.customer.findFirst({ where: { businessId, name: String(c.name) } });
          if (resolveConflict(c, existing)) {
              if (existing) {
                 await prisma.customer.update({
                    where: { id: existing.id },
                    data: { phone: c.phone ? String(c.phone) : null, email: c.email ? String(c.email) : null, updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date() }
                 });
              } else {
                 await prisma.customer.create({
                    data: { businessId, name: String(c.name), phone: c.phone ? String(c.phone) : null, email: c.email ? String(c.email) : null, updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date() }
                 });
              }
              results.customers++;
          } else {
              results.skipped++;
          }
       }
    }
    
    // Update business settings safely by merging
    if (businessSetup) {
       const b = await prisma.business.findUnique({ where: { id: businessId } });
       if (b) {
           let currentSettings = {};
           if (b.settings) {
               try {
                   currentSettings = typeof b.settings === 'string' ? JSON.parse(b.settings) : b.settings;
               } catch (e) {}
           }
           // Ensure businessSetup is an object
           const incomingSetup = typeof businessSetup === 'string' ? JSON.parse(businessSetup) : businessSetup;
           const mergedSettings = { ...currentSettings, ...incomingSetup };
           
           await prisma.business.update({
              where: { id: businessId },
              data: { 
                  settings: JSON.stringify(mergedSettings), 
                  updatedAt: new Date() 
              }
           });
       }
    }

      try {
        await prisma.syncLog.create({
          data: {
            businessId,
            outletId: targetOutletId || null,
            terminal: 'Unknown',
            type: 'PUSH',
            status: 'SUCCESS',
            details: `Pushed ${results.users} users, ${results.products} products, ${results.inventory} stock movements, ${results.transactions} transactions`,
          }
        });
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

