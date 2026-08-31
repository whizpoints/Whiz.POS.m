const fs = require('fs');

function updateOutlets() {
  const file = 'C:/Users/Josphat Mburu/Documents/codes/Whiz_POS-master/local-server/server/routes/outlets.ts';
  let code = fs.readFileSync(file, 'utf8');

  code = code.replace("import prisma from '../prisma.js';", "import db from '../db.js';\nimport { randomUUID } from 'crypto';");

  code = code.replace(/const outlets = await prisma\.outlet\.findMany\(\{\s*where: \{ businessId \},\s*orderBy: \{ createdAt: 'asc' \}\s*\}\);/, `const outlets = await db.selectFrom('Outlet')
      .selectAll()
      .where('businessId', '=', businessId)
      .orderBy('createdAt', 'asc')
      .execute();`);

  code = code.replace(/const whereClause: any = \{ businessId \};\n\s*if \(locationId !== 'ALL'\) \{\n\s*whereClause\.locationId = locationId;\n\s*\}\n\s*const outlets = await prisma\.outlet\.findMany\(\{\s*where: whereClause,\s*orderBy: \{ createdAt: 'asc' \}\s*\}\);/, `let query = db.selectFrom('Outlet')
      .selectAll()
      .where('businessId', '=', businessId)
      .orderBy('createdAt', 'asc');
    
    if (locationId !== 'ALL') {
        query = query.where('locationId', '=', locationId);
    }
    const outlets = await query.execute();`);

  code = code.replace(/const outlet = await prisma\.outlet\.findUnique\(\{\s*where: \{ id: req\.params\.id, businessId \},\s*include: \{\s*users: true,\s*inventory: \{\s*include: \{\s*product: true\s*\}\s*\}\s*\}\s*\}\);/, `const outlet = await db.selectFrom('Outlet')
      .selectAll()
      .where('id', '=', req.params.id)
      .where('businessId', '=', businessId)
      .executeTakeFirst();

    if (outlet) {
      const users = await db.selectFrom('User')
        .selectAll()
        .where('outletId', '=', outlet.id)
        .execute();

      const inventory = await db.selectFrom('ProductInventory')
        .selectAll()
        .where('outletId', '=', outlet.id)
        .execute();

      const productIds = inventory.map((i: any) => i.productId);
      let products: any[] = [];
      if (productIds.length > 0) {
        products = await db.selectFrom('Product')
          .selectAll()
          .where('id', 'in', productIds)
          .execute();
      }
      const inventoryWithProducts = inventory.map((i: any) => ({
        ...i,
        product: products.find((p: any) => p.id === i.productId)
      }));

      (outlet as any).users = users;
      (outlet as any).inventory = inventoryWithProducts;
    }`);

  code = code.replace(/const outlet = await prisma\.outlet\.create\(\{\s*data: \{ businessId, locationId, name \}\s*\}\);/, `const outlet = await db.insertInto('Outlet')
      .values({ id: randomUUID(), businessId, locationId, name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .returningAll()
      .executeTakeFirstOrThrow();`);

  code = code.replace(/const outlet = await prisma\.outlet\.update\(\{\s*where: \{ id: req\.params\.id, businessId \},\s*data: req\.body\s*\}\);/, `const outlet = await db.updateTable('Outlet')
      .set(req.body)
      .where('id', '=', req.params.id)
      .where('businessId', '=', businessId)
      .returningAll()
      .executeTakeFirstOrThrow();`);

  code = code.replace(/await prisma\.outlet\.delete\(\{\s*where: \{ id: req\.params\.id, businessId \}\s*\}\);/, `await db.deleteFrom('Outlet')
      .where('id', '=', req.params.id)
      .where('businessId', '=', businessId)
      .execute();`);

  code = code.replace(/const outlet = await prisma\.outlet\.findUnique\(\{\s*where: \{ id: req\.params\.id, businessId \}\s*\}\);/g, `const outlet = await db.selectFrom('Outlet')
      .selectAll()
      .where('id', '=', req.params.id)
      .where('businessId', '=', businessId)
      .executeTakeFirst();`);

  code = code.replace(/await prisma\.user\.update\(\{\s*where: \{ id: userId \},\s*data: \{ outletId: req\.params\.id \}\s*\}\);/g, `await db.updateTable('User')
      .set({ outletId: req.params.id })
      .where('id', '=', userId)
      .execute();`);

  code = code.replace(/await prisma\.user\.update\(\{\s*where: \{ id: userId \},\s*data: \{ outletId: null \}\s*\}\);/g, `await db.updateTable('User')
      .set({ outletId: null })
      .where('id', '=', userId)
      .execute();`);

  code = code.replace(/const outlet = await prisma\.outlet\.findUnique\(\{\s*where: \{ id: outletId, businessId \}\s*\}\);/g, `const outlet = await db.selectFrom('Outlet')
      .selectAll()
      .where('id', '=', outletId)
      .where('businessId', '=', businessId)
      .executeTakeFirst();`);

  code = code.replace(/const loc = await prisma\.storeLocation\.findFirst\(\{\s*where: \{ businessId \}\s*\}\);/g, `const loc = await db.selectFrom('StoreLocation')
        .selectAll()
        .where('businessId', '=', businessId)
        .executeTakeFirst();`);

  code = code.replace(/const existing = await prisma\.productInventory\.findFirst\(\{\s*where: \{ productId, outletId, locationId: targetLocationId \}\s*\}\);/g, `const existing = await db.selectFrom('ProductInventory')
      .selectAll()
      .where('productId', '=', productId)
      .where('outletId', '=', outletId)
      .where('locationId', '=', targetLocationId)
      .executeTakeFirst();`);

  code = code.replace(/await prisma\.productInventory\.create\(\{\s*data: \{\s*productId,\s*outletId,\s*locationId: targetLocationId,\s*stock: Number\(stock\)\s*\}\s*\}\);/g, `await db.insertInto('ProductInventory')
      .values({
        id: randomUUID(),
        productId,
        outletId,
        locationId: targetLocationId,
        stock: Number(stock),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .execute();`);

  code = code.replace(/await prisma\.stockMovement\.create\(\{\s*data: \{\s*businessId,\s*productId,\s*locationId: targetLocationId,\s*outletId,\s*type: 'INITIAL',\s*quantity: Number\(stock\),\s*sourceTerminal: 'SERVER',\s*reference: 'Product assigned to outlet'\s*\}\s*\}\);/g, `await db.insertInto('StockMovement')
        .values({
          id: randomUUID(),
          businessId,
          productId,
          locationId: targetLocationId,
          outletId,
          type: 'INITIAL',
          quantity: Number(stock),
          sourceTerminal: 'SERVER',
          reference: 'Product assigned to outlet',
          timestamp: new Date().toISOString()
        })
        .execute();`);

  code = code.replace(/const inventory = await prisma\.productInventory\.findUnique\(\{\s*where: \{ id: inventoryId \}\s*\}\);/, `const inventory = await db.selectFrom('ProductInventory')
      .selectAll()
      .where('id', '=', inventoryId)
      .executeTakeFirst();`);

  code = code.replace(/await prisma\.productInventory\.update\(\{\s*where: \{ id: inventoryId \},\s*data: \{ stock: newStock \}\s*\}\);/, `await db.updateTable('ProductInventory')
      .set({ stock: newStock })
      .where('id', '=', inventoryId)
      .execute();`);

  code = code.replace(/await prisma\.stockMovement\.create\(\{\s*data: \{\s*id: `adj_\$\{Date\.now\(\)\}_\$\{Math\.random\(\)\.toString\(36\)\.substring\(2, 9\)\}`,\s*businessId,\s*productId: inventory\.productId,\s*locationId: inventory\.locationId,\s*outletId: req\.params\.id,\s*type: type === 'ADD' \? 'ADJUSTMENT_UP' : 'ADJUSTMENT_DOWN',\s*quantity: amount,\s*reference: 'Outlet Manual Adjust',\s*sourceTerminal: 'SERVER',\s*timestamp: new Date\(\)\s*\}\s*\}\);/, `await db.insertInto('StockMovement')
      .values({
        id: \`adj_\${Date.now()}_\${Math.random().toString(36).substring(2, 9)}\`,
        businessId,
        productId: inventory.productId,
        locationId: inventory.locationId,
        outletId: req.params.id,
        type: type === 'ADD' ? 'ADJUSTMENT_UP' : 'ADJUSTMENT_DOWN',
        quantity: amount,
        reference: 'Outlet Manual Adjust',
        sourceTerminal: 'SERVER',
        timestamp: new Date().toISOString()
      })
      .execute();`);

  code = code.replace(/await prisma\.productInventory\.updateMany\(\{\s*where: \{ outletId \},\s*data: \{ updatedAt: new Date\(\) \}\s*\}\);/, `await db.updateTable('ProductInventory')
      .set({ updatedAt: new Date().toISOString() })
      .where('outletId', '=', outletId)
      .execute();`);

  code = code.replace(/await prisma\.user\.updateMany\(\{\s*where: \{ outletId \},\s*data: \{ updatedAt: new Date\(\) \}\s*\}\);/, `await db.updateTable('User')
      .set({ updatedAt: new Date().toISOString() })
      .where('outletId', '=', outletId)
      .execute();`);

  code = code.replace(/await prisma\.outlet\.update\(\{\s*where: \{ id: outletId \},\s*data: \{ updatedAt: new Date\(\) \}\s*\}\);/, `await db.updateTable('Outlet')
      .set({ updatedAt: new Date().toISOString() })
      .where('id', '=', outletId)
      .execute();`);

  code = code.replace(/await prisma\.business\.updateMany\(\{\s*where: \{ id: req\.user\.businessId \},\s*data: \{ updatedAt: new Date\(\) \}\s*\}\);/, `await db.updateTable('Business')
      .set({ updatedAt: new Date().toISOString() })
      .where('id', '=', req.user.businessId)
      .execute();`);

  code = code.replace(/await prisma\.category\.updateMany\(\{\s*where: \{ businessId: req\.user\.businessId \},\s*data: \{ updatedAt: new Date\(\) \}\s*\}\);/, `await db.updateTable('Category')
      .set({ updatedAt: new Date().toISOString() })
      .where('businessId', '=', req.user.businessId)
      .execute();`);

  fs.writeFileSync(file, code);
  console.log("Updated outlets.ts");
}
updateOutlets();
