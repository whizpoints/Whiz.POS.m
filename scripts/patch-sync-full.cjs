const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../local-server/server/routes/sync.ts');
let code = fs.readFileSync(file, 'utf8');

// 1. Fix .toISOString().toISOString()
code = code.replace(
  'timestamp: new Date(log.timestamp || Date.now()).toISOString().toISOString()',
  'timestamp: new Date(log.timestamp || Date.now()).toISOString()'
);

// 2. Add GET / route if not present
if (!code.includes("router.get('/',")) {
  const marker = 'router.use(authenticate);\n';
  const getRoute = `router.use(authenticate);

// GET /api/sync - Return catalog, inventory, users, and setup for POS client
router.get('/', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const [products, users, categories, customers, suppliers, business, locations] = await Promise.all([
      db.selectFrom('Product').selectAll().where('businessId', '=', businessId).execute(),
      db.selectFrom('User').selectAll().where('businessId', '=', businessId).execute(),
      db.selectFrom('Category').selectAll().where('businessId', '=', businessId).execute(),
      db.selectFrom('Customer').selectAll().where('businessId', '=', businessId).execute(),
      db.selectFrom('Supplier').selectAll().where('businessId', '=', businessId).execute(),
      db.selectFrom('Business').selectAll().where('id', '=', businessId).executeTakeFirst(),
      db.selectFrom('StoreLocation').selectAll().where('businessId', '=', businessId).execute()
    ]);

    let inventories = [];
    try {
      inventories = await db.selectFrom('ProductInventory').selectAll().execute();
    } catch (e) {}

    const stockMap = new Map();
    for (const inv of inventories) {
      stockMap.set(inv.productId, (stockMap.get(inv.productId) || 0) + (Number(inv.stock) || 0));
    }

    const formattedProducts = products.map((p) => ({
      ...p,
      stock: stockMap.has(p.id) ? stockMap.get(p.id) : (Number(p.stock) || 0)
    }));

    res.json({
      success: true,
      products: formattedProducts,
      users: users.map((u) => ({
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
      businessSetup: business ? {
        id: business.id,
        businessName: business.name,
        kraPin: business.kraPin,
        apiKey: business.apiKey,
        locationId: locations[0]?.id || null,
        locations
      } : {}
    });
  } catch (error) {
    console.error('Fetch sync data error:', error);
    res.status(500).json({ error: 'Failed to fetch sync data: ' + (error.message || error) });
  }
});
`;
  code = code.replace(marker, getRoute);
}

fs.writeFileSync(file, code, 'utf8');
console.log('SUCCESSFULLY_PATCHED_SYNC_ROUTES');
