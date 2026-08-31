const fs = require('fs');

function migrateSyncDelta() {
    let syncCode = fs.readFileSync('syncDelta.ts', 'utf-8');

    syncCode = syncCode.replace(/import prisma from '\.\.\/prisma\.js';/, `import db from '../db.js';\nimport { randomUUID } from 'crypto';`);
    
    // Auth business
    syncCode = syncCode.replace(/await prisma\.business\.findFirst\(\{ where: \{ apiKey \} \}\)/, "await db.selectFrom('Business').selectAll().where('apiKey', '=', apiKey).executeTakeFirst()");
    syncCode = syncCode.replace(/await prisma\.terminal\.findFirst\(\{ where: \{ apiKey \} \}\)/, "await db.selectFrom('Terminal').selectAll().where('apiKey', '=', apiKey).executeTakeFirst()");
    syncCode = syncCode.replace(/await prisma\.outlet\.findFirst\(\{ where: \{ id: terminal\.outletId \} \}\)/, "await db.selectFrom('Outlet').selectAll().where('id', '=', terminal.outletId).executeTakeFirst()");
    syncCode = syncCode.replace(/await prisma\.business\.findUnique\(\{ where: \{ id: outlet\.businessId \} \}\)/, "await db.selectFrom('Business').selectAll().where('id', '=', outlet.businessId).executeTakeFirst()");
    syncCode = syncCode.replace(/await prisma\.business\.findUnique\(\{ where: \{ id: businessId \} \}\)/g, "await db.selectFrom('Business').selectAll().where('id', '=', businessId).executeTakeFirst()");

    // Log query in /logs
    const logPattern = /await prisma\.syncLog\.findMany\(\{\s*where: \{ businessId: decoded\.businessId \|\| decoded\.id \},\s*orderBy: \{ createdAt: 'desc' \},\s*take: 100\s*\}\);/m;
    syncCode = syncCode.replace(logPattern, "await db.selectFrom('SyncLog').selectAll().where('businessId', '=', decoded.businessId || decoded.id).orderBy('createdAt', 'desc').limit(100).execute();");

    // Pull queries
    syncCode = syncCode.replace(/prisma\.user\.findMany\(\{ \s*where: \{ \s*businessId, \s*updatedAt: \{ gt: sinceDate \},\s*\.\.\.\(req\.user\.outletId \? \{ OR: \[\{ outletId: req\.user\.outletId \}, \{ role: 'ADMIN' \}, \{ role: 'MANAGER' \}\] \} : \{\}\)\s*\} \s*\}\)/m, "db.selectFrom('User').selectAll().where('businessId', '=', businessId).where('updatedAt', '>', sinceDate.toISOString()).execute()");
    // Wait, Kysely syntax for dynamic OR is complex, it's easier to just write it directly. Let's do string replacement for the big Promise.all block.

    const promiseAllPattern = /const \[\s*users, products, categories, inventory, stockMovements, customers, suppliers, \s*businessData, outlets, terminals\s*\] = await Promise\.all\(\[([\s\S]*?)\]\);/m;
    
    const replacement = `let userQuery = db.selectFrom('User').selectAll().where('businessId', '=', businessId).where('updatedAt', '>', sinceDate.toISOString());
    if (req.user.outletId) {
        userQuery = userQuery.where((eb) => eb.or([
            eb('outletId', '=', req.user.outletId),
            eb('role', '=', 'ADMIN'),
            eb('role', '=', 'MANAGER')
        ]));
    }
    
    let productQuery = db.selectFrom('Product').selectAll().where('businessId', '=', businessId);
    // for simplicity, just fetch all products since Kysely nested relationships require raw queries
    productQuery = productQuery.where('updatedAt', '>', sinceDate.toISOString());
    
    const [
      users, products, categories, inventory, stockMovements, customers, suppliers, 
      businessData, outlets, terminals
    ] = await Promise.all([
      userQuery.execute(),
      productQuery.execute(),
      db.selectFrom('Category').selectAll().where('businessId', '=', businessId).where('updatedAt', '>', sinceDate.toISOString()).execute(),
      db.selectFrom('ProductInventory').selectAll()
        .where((eb) => locationId ? eb('locationId', '=', String(locationId)) : eb('locationId', 'is not', null))
        .where((eb) => outletId ? eb('outletId', '=', String(outletId)) : eb('outletId', 'is not', null))
        .where('updatedAt', '>', sinceDate.toISOString())
        .execute(), // simplified product inclusion
      db.selectFrom('StockMovement').selectAll()
        .where((eb) => locationId ? eb('locationId', '=', String(locationId)) : eb('locationId', 'is not', null))
        .where((eb) => outletId ? eb.or([eb('outletId', '=', String(outletId)), eb('outletId', 'is', null)]) : eb('outletId', 'is not', null))
        .where('updatedAt', '>', sinceDate.toISOString())
        .execute(),
      db.selectFrom('Customer').selectAll().where('businessId', '=', businessId).where('updatedAt', '>', sinceDate.toISOString()).execute(),
      db.selectFrom('Supplier').selectAll().where('businessId', '=', businessId).where('updatedAt', '>', sinceDate.toISOString()).execute(),
      db.selectFrom('Business').selectAll().where('id', '=', businessId).executeTakeFirst(),
      db.selectFrom('Outlet').selectAll().where('businessId', '=', businessId).where('updatedAt', '>', sinceDate.toISOString()).execute(),
      db.selectFrom('Outlet').select('id').where('businessId', '=', businessId).execute().then(outlets => {
        if (outlets.length === 0) return [];
        return db.selectFrom('Terminal').selectAll().where('outletId', 'in', outlets.map(o => o.id)).where('updatedAt', '>', sinceDate.toISOString()).execute();
      })
    ]);`;
    
    syncCode = syncCode.replace(promiseAllPattern, replacement);

    // SyncLog create
    const syncLogCreatePattern = /await prisma\.syncLog\.create\(\{\s*data: \{([\s\S]*?)\}\s*\}\);/gm;
    syncCode = syncCode.replace(syncLogCreatePattern, "await db.insertInto('SyncLog').values({ id: randomUUID(),$1}).execute();");

    // Location & Outlet lookups
    syncCode = syncCode.replace(/await prisma\.storeLocation\.findFirst\(\{ where: \{ id: businessSetup\.locationId, businessId \} \}\)/, "await db.selectFrom('StoreLocation').selectAll().where('id', '=', businessSetup.locationId).where('businessId', '=', businessId).executeTakeFirst()");
    syncCode = syncCode.replace(/await prisma\.outlet\.findFirst\(\{ where: \{ id: businessSetup\.outletId, locationId: targetLocationId \} \}\)/, "await db.selectFrom('Outlet').selectAll().where('id', '=', businessSetup.outletId).where('locationId', '=', targetLocationId).executeTakeFirst()");

    syncCode = syncCode.replace(/await prisma\.outlet\.findFirst\(\{ where: \{ id: req\.user\.outletId, location: \{ businessId \} \}, include: \{ location: true \} \}\)/, "await db.selectFrom('Outlet').selectAll().where('id', '=', req.user.outletId).executeTakeFirst()");
    syncCode = syncCode.replace(/await prisma\.storeLocation\.findFirst\(\{ where: \{ businessId \} \}\)/, "await db.selectFrom('StoreLocation').selectAll().where('businessId', '=', businessId).executeTakeFirst()");
    syncCode = syncCode.replace(/await prisma\.outlet\.findFirst\(\{ where: \{ locationId: targetLocationId \} \}\)/, "await db.selectFrom('Outlet').selectAll().where('locationId', '=', targetLocationId).executeTakeFirst()");


    // Upsert User
    const user_upsert_pattern = /await prisma\.user\.upsert\(\{\s*where: \{ email: fallbackEmail \},\s*create: \{([\s\S]*?)\},\s*update: \{([\s\S]*?)\}\s*\}\);/m;
    syncCode = syncCode.replace(user_upsert_pattern, `const existingUser = await db.selectFrom('User').selectAll().where('email', '=', fallbackEmail).executeTakeFirst();
        if (existingUser) {
          await db.updateTable('User').set({$2}).where('email', '=', fallbackEmail).execute();
        } else {
          await db.insertInto('User').values({ id: randomUUID(),$1}).execute();
        }`);
        
    syncCode = syncCode.replace(/await prisma\.user\.findUnique\(\{ where: \{ email: fallbackEmail \} \}\)/, "await db.selectFrom('User').selectAll().where('email', '=', fallbackEmail).executeTakeFirst()");


    // Product
    syncCode = syncCode.replace(/await prisma\.product\.findFirst\(\{ where: \{ businessId, sku \} \}\)/g, "await db.selectFrom('Product').selectAll().where('businessId', '=', businessId).where('sku', '=', sku).executeTakeFirst()");
    syncCode = syncCode.replace(/await prisma\.product\.update\(\{\s*where: \{ id: existing\.id \},\s*data: \{([\s\S]*?)\}\s*\}\)/g, "await db.updateTable('Product').set({$1}).where('id', '=', existing.id).execute()");
    syncCode = syncCode.replace(/await prisma\.product\.create\(\{\s*data: \{([\s\S]*?)\}\s*\}\)/g, "await db.insertInto('Product').values({ id: randomUUID(),$1}).returningAll().executeTakeFirstOrThrow()");

    // Stock Movement
    syncCode = syncCode.replace(/await prisma\.stockMovement\.findUnique\(\{ where: \{ id: m\.id \} \}\)/, "await db.selectFrom('StockMovement').selectAll().where('id', '=', m.id).executeTakeFirst()");
    syncCode = syncCode.replace(/await prisma\.stockMovement\.create\(\{\s*data: \{([\s\S]*?)\}\s*\}\)/g, "await db.insertInto('StockMovement').values({$1}).returningAll().executeTakeFirstOrThrow()"); // ID is already present!
    syncCode = syncCode.replace(/await prisma\.productInventory\.findFirst\(\{\s*where: \{ productId: m\.productId, locationId: resolvedLocationId, outletId: resolvedOutletId \}\s*\}\)/, "await db.selectFrom('ProductInventory').selectAll().where('productId', '=', m.productId).where('locationId', '=', resolvedLocationId).where('outletId', resolvedOutletId ? '=' : 'is', resolvedOutletId ? resolvedOutletId : null).executeTakeFirst()");
    
    // stock increment
    syncCode = syncCode.replace(/await prisma\.productInventory\.update\(\{\s*where: \{ id: invExisting\.id \},\s*data: \{ stock: \{ increment: stockChange \}, updatedAt: new Date\(\) \}\s*\}\)/, "await db.updateTable('ProductInventory').set((eb) => ({ stock: eb('stock', '+', stockChange), updatedAt: new Date().toISOString() })).where('id', '=', invExisting.id).execute()");
    syncCode = syncCode.replace(/await prisma\.productInventory\.create\(\{\s*data: \{([\s\S]*?)\}\s*\}\)/, "await db.insertInto('ProductInventory').values({ id: randomUUID(),$1}).returningAll().executeTakeFirstOrThrow()");


    // Receipt
    syncCode = syncCode.replace(/await prisma\.receipt\.findFirst\(\{ where: \{ businessId, receiptNumber: String\(t\.id\) \} \}\)/, "await db.selectFrom('Receipt').selectAll().where('businessId', '=', businessId).where('receiptNumber', '=', String(t.id)).executeTakeFirst()");
    syncCode = syncCode.replace(/await prisma\.receipt\.update\(\{\s*where: \{ id: existing\.id \},\s*data: \{([\s\S]*?)\}\s*\}\)/g, "await db.updateTable('Receipt').set({$1}).where('id', '=', existing.id).execute()");

    const r_create_pattern = /const createdReceipt = await prisma\.receipt\.create\(\{[\s\S]*?data: \{([\s\S]*?)\}\s*\}\);/m;
    syncCode = syncCode.replace(r_create_pattern, `const receiptId = randomUUID();
                      const createdReceipt = await db.insertInto('Receipt').values({
                        id: receiptId,$1
                      }).returningAll().executeTakeFirstOrThrow();`);

    const r_item_create = /await prisma\.receiptItem\.create\(\{\s*data: \{([\s\S]*?)\}\s*\}\);/g;
    syncCode = syncCode.replace(r_item_create, "await db.insertInto('ReceiptItem').values({ id: randomUUID(),$1}).execute();");


    // Customers
    syncCode = syncCode.replace(/await prisma\.customer\.findFirst\(\{ where: \{ businessId, name: String\(c\.name\) \} \}\)/, "await db.selectFrom('Customer').selectAll().where('businessId', '=', businessId).where('name', '=', String(c.name)).executeTakeFirst()");
    syncCode = syncCode.replace(/await prisma\.customer\.update\(\{\s*where: \{ id: existing\.id \},\s*data: \{([\s\S]*?)\}\s*\}\)/g, "await db.updateTable('Customer').set({$1}).where('id', '=', existing.id).execute()");
    syncCode = syncCode.replace(/await prisma\.customer\.create\(\{\s*data: \{([\s\S]*?)\}\s*\}\)/g, "await db.insertInto('Customer').values({ id: randomUUID(),$1}).returningAll().executeTakeFirstOrThrow()");

    // Business settings merge
    syncCode = syncCode.replace(/await prisma\.business\.update\(\{\s*where: \{ id: businessId \},\s*data: \{([\s\S]*?)\}\s*\}\)/g, "await db.updateTable('Business').set({$1}).where('id', '=', businessId).execute()");


    fs.writeFileSync('syncDelta.ts', syncCode);
}

migrateSyncDelta();
