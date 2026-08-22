import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Middleware to authenticate sync requests
const authenticate = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];

  if (apiKey) {
    const business = await prisma.business.findFirst({ where: { apiKey } });
    if (!business) {
      return res.status(401).json({ error: 'Invalid API Key' });
    }
    req.user = { businessId: business.id };
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

router.use(authenticate);

// 1. GET /api/sync/delta?since={timestamp} (PULL)
router.get('/', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { since, locationId, outletId } = req.query;
    
    if (!since) return res.status(400).json({ error: 'Missing "since" timestamp parameter' });

    const sinceDate = new Date(since);

    const [
      users,
      products,
      inventory,
      customers,
      suppliers,
      transactions,
      business
    ] = await Promise.all([
      prisma.user.findMany({ where: { businessId, updatedAt: { gt: sinceDate } } }),
      prisma.product.findMany({ where: { businessId, updatedAt: { gt: sinceDate } } }),
      prisma.productInventory.findMany({ 
          where: { 
              locationId: locationId ? String(locationId) : undefined,
              outletId: outletId ? String(outletId) : undefined,
              updatedAt: { gt: sinceDate },
              product: { businessId } // Ensure it belongs to the business
          },
          include: { product: true }
      }),
      prisma.customer.findMany({ where: { businessId, updatedAt: { gt: sinceDate } } }),
      prisma.supplier.findMany({ where: { businessId, updatedAt: { gt: sinceDate } } }),
      prisma.receipt.findMany({ where: { businessId, updatedAt: { gt: sinceDate } } }),
      prisma.business.findUnique({ where: { id: businessId } })
    ]);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        users,
        products,
        inventory,
        customers,
        suppliers,
        transactions,
        businessSetup: business && business.updatedAt > sinceDate ? {
          ...(typeof business.settings === 'string' ? JSON.parse(business.settings) : business.settings),
          businessName: business.name
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
      inventoryLogs,
      businessSetup
    } = req.body;

    let targetLocationId = undefined;
    let targetOutletId = undefined;
    
    if (businessSetup?.locationId) {
      const loc = await prisma.storeLocation.findFirst({ where: { id: businessSetup.locationId, businessId } });
      if (loc) targetLocationId = loc.id;
    }

    if (businessSetup?.outletId && targetLocationId) {
      const out = await prisma.outlet.findFirst({ where: { id: businessSetup.outletId, locationId: targetLocationId } });
      if (out) targetOutletId = out.id;
    }

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

        // Handle Inventory Stock removed - moving to inventoryLogs processing
      }
    }
    // 2.5 Inventory Logs
    if (inventoryLogs && Array.isArray(inventoryLogs)) {
      for (const log of inventoryLogs) {
        if (!log.productId) continue;
        
        const existing = await prisma.stockMovement.findFirst({ where: { businessId, id: String(log.id) } });
        if (!existing) {
          const productMatch = await prisma.product.findFirst({ 
            where: { 
              businessId, 
              OR: [{ id: String(log.productId) }, { sku: String(log.productId) }]
            } 
          });
          if (!productMatch) continue;

          await prisma.stockMovement.create({
            data: {
              id: String(log.id),
              businessId,
              productId: productMatch.id,
              locationId: targetLocationId || '',
              outletId: targetOutletId || null,
              type: log.type || log.reason || 'SALE',
              quantity: Math.abs(Number(log.variance) || 0),
              reference: String(log.reference || log.id),
              timestamp: new Date(log.timestamp || Date.now())
            }
          });

          const inventories = await prisma.productInventory.findMany({
            where: { 
              productId: productMatch.id, 
              locationId: targetLocationId, 
              OR: [{ outletId: targetOutletId || null }, { outletId: null }]
            }
          });

          let inventoryToUpdate = inventories.find(i => i.outletId === (targetOutletId || null)) || inventories.find(i => i.outletId === null);
          
          if (!inventoryToUpdate) {
             inventoryToUpdate = await prisma.productInventory.create({
                data: {
                   productId: productMatch.id,
                   locationId: targetLocationId || '',
                   outletId: null,
                   stock: 0,
                   reorderLevel: 5
                }
             });
          }

          if (inventoryToUpdate) {
            await prisma.productInventory.update({
              where: { id: inventoryToUpdate.id },
              data: { 
                stock: { increment: Number(log.variance || 0) },
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

    // 3. Transactions (Sales)
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
                      await prisma.receipt.create({
                         data: {
                            businessId, locationId: targetLocationId, outletId: targetOutletId || null,
                            receiptNumber: String(t.id), totalAmount: Number(t.totalAmount || t.total) || 0,
                            paymentMethod: String(t.paymentMethod || 'CASH'), customerPhone: t.customerPhone ? String(t.customerPhone) : null,
                            mpesaCode: t.mpesaCode ? String(t.mpesaCode) : null, status: safeStatus as any,
                            createdAt: t.timestamp ? new Date(t.timestamp) : undefined,
                            updatedAt: t.updatedAt ? new Date(t.updatedAt) : new Date()
                         }
                      });
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
           let currentSettings = typeof b.settings === 'object' && b.settings !== null ? b.settings : {};
           const incomingSetup = typeof businessSetup === 'string' ? JSON.parse(businessSetup) : businessSetup;
           const mergedSettings = { ...currentSettings, ...incomingSetup };
           
           await prisma.business.update({
              where: { id: businessId },
              data: { 
                  settings: mergedSettings, 
                  updatedAt: new Date() 
              }
           });
       }
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
