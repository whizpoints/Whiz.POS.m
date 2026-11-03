import prisma from '../db.js';
import { Router } from 'express';
import * as jwt from 'jsonwebtoken';

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

// 1. GET /api/sync/delta?since={timestamp} (PULL)
router.get('/', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { since, locationId, outletId } = req.query;
    
    if (!since) return res.status(400).json({ error: 'Missing "since" timestamp parameter' });

    const sinceDate = new Date(since);

    let targetScopeId = undefined;
    if (locationId) {
      const loc = await prisma.storeLocation.findUnique({ where: { id: String(locationId) } });
      if (loc && loc.scopeId) targetScopeId = loc.scopeId;
    }
    if (outletId) {
      const out = await prisma.outlet.findUnique({ where: { id: String(outletId) } });
      if (out && out.scopeId) targetScopeId = out.scopeId;
    }

    const userWhere: any = { businessId, updatedAt: { gt: sinceDate } };
    if (outletId) {
      userWhere.OR = [
        { outletId: String(outletId) },
        { role: 'ADMIN' },
        { role: 'MANAGER' }
      ];
    }

    const [
      users,
      products,
      inventory,
      customers,
      suppliers,
      transactions,
      business,
      mpesaConfigs,
      stockMovements,
      outlets,
      clients,
      savedDocuments
    ] = await Promise.all([
      prisma.user.findMany({ where: userWhere }),
      prisma.product.findMany({ 
        where: { 
          businessId, 
          updatedAt: { gt: sinceDate },
          ...(outletId ? {
            inventory: {
              some: { outletId: String(outletId) }
            }
          } : {})
        } 
      }),
      prisma.productInventory.findMany({ 
          where: { 
              product: { businessId },
              updatedAt: { gt: sinceDate },
              ...((locationId || outletId || targetScopeId) ? {
                OR: [
                  ...(targetScopeId ? [{ scopeId: targetScopeId }] : []),
                  ...(locationId ? [{ locationId: String(locationId) }] : []),
                  ...(outletId ? [{ outletId: String(outletId) }] : [])
                ]
              } : {})
          },
          include: { product: true }
      }),
      prisma.customer.findMany({ where: { businessId, updatedAt: { gt: sinceDate } } }),
      prisma.supplier.findMany({ where: { businessId, updatedAt: { gt: sinceDate } } }),
      prisma.receipt.findMany({ where: { businessId, updatedAt: { gt: sinceDate } } }),
      prisma.business.findUnique({ where: { id: businessId } }),
      prisma.mpesaConfig.findMany({ where: { businessId, updatedAt: { gt: sinceDate } } }),
      prisma.stockMovement.findMany({ where: { businessId, updatedAt: { gt: sinceDate } } }),
      prisma.outlet.findMany({ where: { businessId, updatedAt: { gt: sinceDate } } }),
      prisma.client.findMany({ where: { businessId, updatedAt: { gt: sinceDate } } }),
      prisma.savedDocument.findMany({ where: { businessId, updatedAt: { gt: sinceDate } } })
    ]);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        users,
        products,
        inventory,
        stockMovements,
        outlets,
        customers,
        suppliers,
        transactions,
        mpesaConfigs,
        clients,
        savedDocuments,
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
      stockMovements,
      outlets,
      terminals,
      businessSetup,
      clients,
      savedDocuments,
      documents
    } = req.body;

    let targetLocationId = undefined;
    let targetOutletId = undefined;
    let targetScopeId = undefined;
    
    if (businessSetup?.locationId) {
      const loc = await prisma.storeLocation.findFirst({ where: { id: businessSetup.locationId, businessId } });
      if (loc) {
        targetLocationId = loc.id;
        targetScopeId = loc.scopeId;
      }
    }

    if (businessSetup?.outletId && targetLocationId) {
      const out = await prisma.outlet.findFirst({ where: { id: businessSetup.outletId, locationId: targetLocationId } });
      if (out) {
        targetOutletId = out.id;
        if (out.scopeId) targetScopeId = out.scopeId;
      }
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

    // 1.5 Outlets
    if (outlets && Array.isArray(outlets)) {
      for (const o of outlets) {
        if (!o.name) continue;
        const targetLocId = targetLocationId || o.locationId;
        const loc = (targetLocId && targetLocId !== 'ALL')
          ? (await prisma.storeLocation.findFirst({ where: { id: targetLocId, businessId } }) || await prisma.storeLocation.findFirst({ where: { businessId } }))
          : await prisma.storeLocation.findFirst({ where: { businessId } });
        if (!loc) continue;

        await prisma.outlet.upsert({
          where: { id: o.id },
          create: {
            id: o.id,
            businessId,
            locationId: loc.id,
            name: o.name,
            createdAt: o.createdAt ? new Date(o.createdAt) : new Date(),
            updatedAt: o.updatedAt ? new Date(o.updatedAt) : new Date()
          },
          update: {
            name: o.name,
            locationId: loc.id,
            updatedAt: o.updatedAt ? new Date(o.updatedAt) : new Date()
          }
        });
      }
    }

    // 1.6 Terminals
    if (terminals && Array.isArray(terminals)) {
      for (const term of terminals) {
        if (!term.name) continue;
        await prisma.terminal.upsert({
          where: { id: term.id },
          create: {
            id: term.id,
            businessId,
            outletId: term.outletId || null,
            name: term.name,
            macAddress: term.macAddress || 'LAN-NODE',
            status: term.status || 'APPROVED',
            apiKey: term.apiKey || null,
            createdAt: term.createdAt ? new Date(term.createdAt) : new Date(),
            updatedAt: term.updatedAt ? new Date(term.updatedAt) : new Date()
          },
          update: {
            name: term.name,
            status: term.status || 'APPROVED',
            outletId: term.outletId || null,
            apiKey: term.apiKey || undefined,
            updatedAt: term.updatedAt ? new Date(term.updatedAt) : new Date()
          }
        });
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
              const newProd = await prisma.product.create({
                data: {
                  businessId, sku: String(sku), barcode: p.barcode ? String(p.barcode) : null,
                  name: String(p.name), category: p.category ? String(p.category) : null,
                  price: Number(p.price) || 0, costPrice: Number(p.costPrice) || 0,
                  updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date()
                }
              });

              if (targetLocationId && (p.stock !== undefined || p.initialStock !== undefined)) {
                await prisma.productInventory.create({
                  data: {
                    productId: newProd.id,
                    locationId: targetLocationId,
                    outletId: targetScopeId ? null : (targetOutletId || null),
                    scopeId: targetScopeId || null,
                    stock: Number(p.stock ?? p.initialStock ?? 0),
                    reorderLevel: Number(p.minStockLevel || 5)
                  }
                }).catch(() => {});
              }
            }
            results.products++;
        } else {
            results.skipped++;
        }
      }
    }
    
    // 2.5 Inventory Logs & Stock Movements
    const incomingMovements = (stockMovements && Array.isArray(stockMovements) ? stockMovements.map(m => ({ ...m, variance: m.quantity })) : []).concat(
      inventoryLogs && Array.isArray(inventoryLogs) ? inventoryLogs : []
    );
    if (incomingMovements.length > 0) {
      for (const log of incomingMovements) {
        if (!log.productId) continue;

        const movementType = String(log.type || log.reason || 'SALE').toUpperCase();
        const isDeduction = ['SALE', 'TRANSFER_OUT', 'ADJUSTMENT_DOWN', 'SUBTRACT', 'OUT'].includes(movementType);
        const isAddition = ['TRANSFER_IN', 'PO', 'INITIAL', 'RETURN', 'ADJUSTMENT_UP', 'ADD', 'IN'].includes(movementType);

        let rawQty = Number(log.variance !== undefined ? log.variance : log.quantity);
        if (isNaN(rawQty)) rawQty = 0;

        let delta = 0;
        if (isDeduction) {
          delta = -Math.abs(rawQty);
        } else if (isAddition) {
          delta = Math.abs(rawQty);
        } else {
          delta = rawQty;
        }

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
              locationId: targetLocationId || log.locationId || '',
              outletId: targetOutletId || log.outletId || null,
              serverId: log.serverId || req.user.serverId || null,
              terminalId: log.terminalId || null,
              type: movementType,
              quantity: Math.abs(rawQty),
              reference: String(log.reference || log.id),
              timestamp: new Date(log.timestamp || Date.now())
            }
          });

          const inventories = await prisma.productInventory.findMany({
            where: { 
              productId: productMatch.id, 
              OR: [
                 ...(targetScopeId ? [{ scopeId: targetScopeId }] : []),
                 { locationId: targetLocationId, OR: [{ outletId: targetOutletId || null }, { outletId: null }] }
              ]
            }
          });

          let inventoryToUpdate = targetScopeId 
               ? inventories.find(i => i.scopeId === targetScopeId)
               : (inventories.find(i => i.outletId === (targetOutletId || null)) || inventories.find(i => i.outletId === null));
          
          if (!inventoryToUpdate) {
             inventoryToUpdate = await prisma.productInventory.create({
                data: {
                   productId: productMatch.id,
                   locationId: targetLocationId || '',
                   outletId: targetScopeId ? null : (targetOutletId || null),
                   scopeId: targetScopeId || null,
                   stock: 0,
                   reorderLevel: 5
                }
             });
          }

          if (inventoryToUpdate) {
            await prisma.productInventory.update({
              where: { id: inventoryToUpdate.id },
              data: { 
                stock: { increment: delta },
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
          const existing = await prisma.receipt.findUnique({ where: { id: String(t.id) } });
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
                      try {
                          const createdReceipt = await prisma.receipt.create({
                             data: {
                                id: String(t.id),
                                businessId, 
                                locationId: targetLocationId || t.locationId || null, 
                                outletId: null,
                                serverId: t.serverId || req.user.serverId || null,
                                terminalId: t.terminalId || null,
                                receiptNumber: String(t.id), totalAmount: Number(t.totalAmount || t.total) || 0,
                                paymentMethod: String(t.paymentMethod || "CASH"), customerPhone: t.customerPhone ? String(t.customerPhone) : null,
                                mpesaCode: t.mpesaCode ? String(t.mpesaCode) : null, status: safeStatus as any,
                                createdAt: t.timestamp ? new Date(t.timestamp) : undefined,
                                updatedAt: t.updatedAt ? new Date(t.updatedAt) : new Date()
                             }
                          });
                          
                          if (t.items && Array.isArray(t.items)) {
                              const receiptItemsToCreate = t.items.map((item: any) => ({
                                  receiptId: createdReceipt.id,
                                  productName: item.productName || item.product?.name || "Unknown Item",
                                  quantity: Number(item.quantity) || 1,
                                  unitPrice: Number(item.unitPrice || item.product?.price) || 0,
                                  totalPrice: Number(item.totalPrice || (Number(item.quantity) || 1) * (Number(item.unitPrice || item.product?.price) || 0))
                              }));
                              
                              if (receiptItemsToCreate.length > 0) {
                                  await prisma.receiptItem.createMany({
                                      data: receiptItemsToCreate
                                  });
                              }
                          }
                      } catch (createErr: any) {
                          if (createErr && (createErr.code === "P2002" || String(createErr).includes("UNIQUE constraint"))) {
                              await prisma.receipt.update({
                                 where: { id: String(t.id) },
                                 data: { status: safeStatus as any, updatedAt: t.updatedAt ? new Date(t.updatedAt) : new Date() }
                              });
                          } else {
                              console.warn("[SyncDelta] Error creating receipt:", createErr);
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

    // 5. Clients
    if (clients && Array.isArray(clients)) {
      for (const c of clients) {
        if (!c.id || !c.name) continue;
        const existing = await prisma.client.findFirst({ where: { id: String(c.id), businessId } });
        if (existing) {
          if (!existing.updatedAt || new Date(c.updatedAt || 0) > new Date(existing.updatedAt)) {
            await prisma.client.update({
              where: { id: existing.id },
              data: {
                name: String(c.name),
                phone: c.phone ? String(c.phone) : null,
                email: c.email ? String(c.email) : null,
                address: c.address ? String(c.address) : null,
                updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date()
              }
            });
          }
        } else {
          await prisma.client.create({
            data: {
              id: String(c.id),
              businessId,
              name: String(c.name),
              phone: c.phone ? String(c.phone) : null,
              email: c.email ? String(c.email) : null,
              address: c.address ? String(c.address) : null,
              createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
              updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date()
            }
          });
        }
      }
    }

    // 6. Saved Documents
    const docsToSync = savedDocuments || documents;
    if (docsToSync && Array.isArray(docsToSync)) {
      for (const d of docsToSync) {
        if (!d.id || !d.type) continue;
        const existing = await prisma.savedDocument.findFirst({ where: { id: String(d.id), businessId } });
        const docPayload = {
          businessId,
          type: String(d.type),
          date: d.date ? new Date(d.date) : new Date(),
          dueDate: d.dueDate ? new Date(d.dueDate) : null,
          customerName: String(d.customerName || d.clientCompany || d.clientName || 'Unknown'),
          customerEmail: d.customerEmail ? String(d.customerEmail) : null,
          customerPhone: d.customerPhone ? String(d.customerPhone) : null,
          customerAddress: d.customerAddress ? String(d.customerAddress) : null,
          items: typeof d.items === 'string' ? d.items : JSON.stringify(d.items || []),
          subtotal: Number(d.subtotal) || 0,
          tax: Number(d.tax) || Number(d.taxAmount) || 0,
          total: Number(d.total) || 0,
          notes: d.notes ? String(d.notes) : null,
          status: String(d.status || 'DRAFT'),
          metadata: typeof d.metadata === 'string' ? d.metadata : JSON.stringify(d.metadata || d.data || {}),
          updatedAt: d.updatedAt ? new Date(d.updatedAt) : new Date()
        };

        if (existing) {
          if (!existing.updatedAt || new Date(d.updatedAt || 0) > new Date(existing.updatedAt)) {
            await prisma.savedDocument.update({
              where: { id: existing.id },
              data: docPayload
            });
          }
        } else {
          await prisma.savedDocument.create({
            data: {
              id: String(d.id),
              ...docPayload,
              createdAt: d.createdAt ? new Date(d.createdAt) : new Date()
            }
          });
        }
      }
    }
    
    // Update business settings safely by merging
    if (businessSetup) {
       const b = await prisma.business.findUnique({ where: { id: businessId } });
       if (b) {
           let currentSettings: any = {};
           try {
             if (typeof b.settings === 'string') currentSettings = JSON.parse(b.settings || '{}');
             else if (typeof b.settings === 'object' && b.settings !== null) currentSettings = b.settings;
           } catch(e) {}
           const incomingSetup = typeof businessSetup === 'string' ? JSON.parse(businessSetup) : businessSetup;
           const mergedSettings = { ...currentSettings, ...incomingSetup };
           
           const updateData: any = { 
               settings: JSON.stringify(mergedSettings), 
               updatedAt: new Date() 
           };
           if (incomingSetup.businessName || incomingSetup.name) {
               updateData.name = incomingSetup.businessName || incomingSetup.name;
           }
           if (incomingSetup.kraPin || incomingSetup.etimsPin) {
               updateData.kraPin = incomingSetup.kraPin || incomingSetup.etimsPin;
           }

           await prisma.business.update({
              where: { id: businessId },
              data: updateData
           });
       }
    }

    const io = req.app.get('io');
    if (io) {
       // Broadcast to all POS terminals and web dashboard
       io.to(`business_${businessId}`).emit('cloud_sync_received', { timestamp: new Date().toISOString() });
       io.to(`business_${businessId}`).emit('downward_sync_event', { timestamp: new Date().toISOString() });
       io.to(`business_${businessId}`).emit('dashboard_update', { timestamp: new Date().toISOString() });
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
