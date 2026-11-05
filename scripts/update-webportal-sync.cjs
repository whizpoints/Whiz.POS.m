const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '../webportal/server/routes/sync.ts');
let content = fs.readFileSync(file, 'utf8');

// 1. In GET / route, query mpesaConfig
const oldPromiseAll = `    const [allProducts, allUsers, categories, customers, suppliers, business, locations] = await Promise.all([
      prisma.product.findMany({ where: { businessId } }),
      prisma.user.findMany({ where: { businessId } }),
      prisma.category.findMany({ where: { businessId } }),
      prisma.customer.findMany({ where: { businessId } }),
      prisma.supplier.findMany({ where: { businessId } }),
      prisma.business.findUnique({ where: { id: businessId } }),
      prisma.storeLocation.findMany({ where: { businessId } })
    ]);`;

const newPromiseAll = `    const [allProducts, allUsers, categories, customers, suppliers, business, locations, mpesaConfig] = await Promise.all([
      prisma.product.findMany({ where: { businessId } }),
      prisma.user.findMany({ where: { businessId } }),
      prisma.category.findMany({ where: { businessId } }),
      prisma.customer.findMany({ where: { businessId } }),
      prisma.supplier.findMany({ where: { businessId } }),
      prisma.business.findUnique({ where: { id: businessId } }),
      prisma.storeLocation.findMany({ where: { businessId } }),
      prisma.mpesaConfig.findFirst({ where: { businessId } })
    ]);`;

// 2. Expand businessSetup in GET /
const oldBizSetup = `      businessSetup: business ? (() => {
        let bSettings = {};
        try { bSettings = typeof business.settings === 'string' ? JSON.parse(business.settings) : (business.settings || {}); } catch(e) {}
        const effectivePin = business.kraPin || bSettings.kraPin || bSettings.etimsPin || '';
        return {
          id: business.id,
          businessId: business.id,
          businessName: business.name,
          kraPin: effectivePin,
          kraEnabled: true,
          etimsPin: effectivePin,
          etimsUrl: bSettings.etimsUrl || 'https://etims-api-sbx.kra.go.ke/etims-api',
          apiKey: business.apiKey,
        locationId: targetOutlet?.locationId || locations[0]?.id || null,
        outletId: targetOutletId || null,
        outletName: targetOutlet?.name || null,
        locations,
        updatedAt: new Date().toISOString(),
        createdAt: business.createdAt || new Date().toISOString()
        };
      })() : {}`;

const newBizSetup = `      businessSetup: business ? (() => {
        let bSettings = {};
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
          address: bSettings.address || '02-00223 Kagwe | Naivas Building',
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
          kraEnabled: true,
          etimsPin: effectivePin,
          etimsToken: bSettings.etimsToken || 'KRATK03_069BF',
          etimsBranch: bSettings.etimsBranch || 'BR-001',
          etimsSerial: bSettings.etimsSerial || 'WHIZPOS-V7.1.0',
          etimsUrl: bSettings.etimsUrl || 'https://etims-api-sbx.kra.go.ke/etims-api',
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
      })() : {}`;

function replaceFlexible(str, oldPart, newPart) {
  const normOld = oldPart.replace(/\r?\n/g, '\n');
  const normStr = str.replace(/\r?\n/g, '\n');
  if (normStr.includes(normOld)) {
    return normStr.replace(normOld, newPart.replace(/\r?\n/g, '\n'));
  }
  return str;
}

content = replaceFlexible(content, oldPromiseAll, newPromiseAll);
content = replaceFlexible(content, oldBizSetup, newBizSetup);

// 3. Add router.post('/', ...)
const postSyncHandler = `
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
      io.to(\`business_\${businessId}\`).emit('dashboard_update', { timestamp: new Date().toISOString() });
    }

    return res.json({ success: true, processedCount });
  } catch (err: any) {
    console.error('Cloud Sync POST error:', err);
    return res.status(500).json({ error: 'Cloud Sync failed: ' + (err.message || err) });
  }
});
`;

if (!content.includes("router.post('/', async")) {
  const marker = "router.post('/sales',";
  content = content.replace(marker, postSyncHandler + "\n" + marker);
}

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated webportal/server/routes/sync.ts');
