const fs = require('fs');

function migrateSync() {
    let syncCode = fs.readFileSync('sync.ts', 'utf-8');

    syncCode = syncCode.replace(/import pkg from '@prisma\/client';\r?\nconst \{ PrismaClient \} = pkg;\r?\nimport prisma from '\.\.\/prisma\.js';/, `import db from '../db.js';\nimport { randomUUID } from 'crypto';`);
    
    // Auth business
    syncCode = syncCode.replace(/await prisma\.business\.findFirst\(\{ where: \{ apiKey \} \}\)/, "await db.selectFrom('Business').selectAll().where('apiKey', '=', apiKey).executeTakeFirst()");
    
    syncCode = syncCode.replace(/await prisma\.business\.findUnique\(\{ where: \{ id: businessId \} \}\)/, "await db.selectFrom('Business').selectAll().where('id', '=', businessId).executeTakeFirst()");

    const r_create_pattern = /const dbReceipt = await prisma\.receipt\.create\(\{[\s\S]*?data: \{([\s\S]*?)items: \{\s*create: \(\s*receipt\.items \|\| \[\]\s*\)\.map\(\(item: any\) => \(\{([\s\S]*?)\}\)\)\s*\}\s*\}\s*\}\);/m;
    syncCode = syncCode.replace(r_create_pattern, `const receiptId = randomUUID();
      const dbReceipt = await db.insertInto('Receipt').values({
        id: receiptId,$1
      }).returningAll().executeTakeFirstOrThrow();
      
      const receiptItemsToInsert = (receipt.items || []).map((item: any) => ({
        id: randomUUID(),
        receiptId,
$2
      }));
      if (receiptItemsToInsert.length > 0) {
        await db.insertInto('ReceiptItem').values(receiptItemsToInsert).execute();
      }`);

    syncCode = syncCode.replace(/cashierName: receipt\.cashier \|\| null,\s*\}\)\.returningAll/m, `cashierName: receipt.cashier || null\n      }).returningAll`);


    syncCode = syncCode.replace(/await prisma\.storeLocation\.findFirst\(\{ where: \{ businessId \} \}\)/g, "await db.selectFrom('StoreLocation').selectAll().where('businessId', '=', businessId).executeTakeFirst()");
    syncCode = syncCode.replace(/await prisma\.storeLocation\.create\(\{ data: \{ businessId, name: 'Main Branch' \} \}\)/, "await db.insertInto('StoreLocation').values({ id: randomUUID(), businessId, name: 'Main Branch' }).returningAll().executeTakeFirstOrThrow()");

    syncCode = syncCode.replace(/await prisma\.storeLocation\.findFirst\(\{ where: \{ id: businessSetup\.locationId, businessId \} \}\)/, "await db.selectFrom('StoreLocation').selectAll().where('id', '=', businessSetup.locationId).where('businessId', '=', businessId).executeTakeFirst()");
    syncCode = syncCode.replace(/await prisma\.outlet\.findFirst\(\{ where: \{ id: businessSetup\.outletId, locationId: targetLocationId \} \}\)/, "await db.selectFrom('Outlet').selectAll().where('id', '=', businessSetup.outletId).where('locationId', '=', targetLocationId).executeTakeFirst()");

    const user_upsert_pattern = /await prisma\.user\.upsert\(\{\s*where: \{ email: fallbackEmail \},\s*create: \{([\s\S]*?)\},\s*update: \{([\s\S]*?)\}\s*\}\);/m;
    syncCode = syncCode.replace(user_upsert_pattern, `const existingUser = await db.selectFrom('User').selectAll().where('email', '=', fallbackEmail).executeTakeFirst();
        if (existingUser) {
          await db.updateTable('User').set({$2}).where('email', '=', fallbackEmail).execute();
        } else {
          await db.insertInto('User').values({ id: randomUUID(),$1}).execute();
        }`);

    syncCode = syncCode.replace(/await prisma\.product\.findFirst\(\{\s*where: \{ businessId, sku \}\s*\}\)/, "await db.selectFrom('Product').selectAll().where('businessId', '=', businessId).where('sku', '=', sku).executeTakeFirst()");
    syncCode = syncCode.replace(/await prisma\.product\.update\(\{\s*where: \{ id: existing\.id \},\s*data: \{([\s\S]*?)\}\s*\}\)/g, "await db.updateTable('Product').set({$1}).where('id', '=', existing.id).execute()");
    syncCode = syncCode.replace(/await prisma\.product\.create\(\{\s*data: \{([\s\S]*?)\}\s*\}\)/g, "await db.insertInto('Product').values({ id: randomUUID(),$1}).returningAll().executeTakeFirstOrThrow()");
    
    syncCode = syncCode.replace(/await prisma\.product\.findFirst\(\{ where: \{ businessId, sku \} \}\)/, "await db.selectFrom('Product').selectAll().where('businessId', '=', businessId).where('sku', '=', sku).executeTakeFirst()");

    syncCode = syncCode.replace(/await prisma\.productInventory\.findFirst\(\{\s*where: \{ \s*productId: finalProduct\.id, \s*locationId: targetLocationId, \s*outletId: targetOutletId \|\| null \s*\}\s*\}\)/, "await db.selectFrom('ProductInventory').selectAll().where('productId', '=', finalProduct.id).where('locationId', '=', targetLocationId).where('outletId', targetOutletId ? '=' : 'is', targetOutletId ? targetOutletId : null).executeTakeFirst()");
    syncCode = syncCode.replace(/await prisma\.productInventory\.update\(\{\s*where: \{ id: existingInventory\.id \},\s*data: \{ stock: Number\(p\.stock\) \|\| 0 \}\s*\}\)/, "await db.updateTable('ProductInventory').set({ stock: Number(p.stock) || 0 }).where('id', '=', existingInventory.id).execute()");
    syncCode = syncCode.replace(/await prisma\.productInventory\.create\(\{\s*data: \{([\s\S]*?)\}\s*\}\)/g, "await db.insertInto('ProductInventory').values({ id: randomUUID(),$1}).returningAll().executeTakeFirstOrThrow()");

    syncCode = syncCode.replace(/await prisma\.receipt\.findFirst\(\{ where: \{ businessId, receiptNumber: String\(t\.id\) \} \}\)/, "await db.selectFrom('Receipt').selectAll().where('businessId', '=', businessId).where('receiptNumber', '=', String(t.id)).executeTakeFirst()");

    const t_create_pattern = /await prisma\.receipt\.create\(\{[\s\S]*?data: \{([\s\S]*?)items: \{\s*create: \(\s*t\.items \|\| \[\]\s*\)\.map\(\(item: any\) => \(\{([\s\S]*?)\}\)\)\s*\}\s*\}\s*\}\);/m;
    syncCode = syncCode.replace(t_create_pattern, `const receiptId = randomUUID();
              await db.insertInto('Receipt').values({ id: receiptId,$1}).returningAll().executeTakeFirstOrThrow();
              const receiptItemsToInsert = (t.items || []).map((item: any) => ({
                id: randomUUID(),
                receiptId,
$2
              }));
              if (receiptItemsToInsert.length > 0) {
                await db.insertInto('ReceiptItem').values(receiptItemsToInsert).execute();
              }`);

    syncCode = syncCode.replace(/cashierName: t\.cashier \|\| null,\s*\}\)\.returningAll/m, `cashierName: t.cashier || null\n              }).returningAll`);

    syncCode = syncCode.replace(/await prisma\.business\.update\(\{\s*where: \{ id: businessId \},\s*data: \{ settings: businessSetup \}\s*\}\)/, "await db.updateTable('Business').set({ settings: JSON.stringify(businessSetup) }).where('id', '=', businessId).execute()");

    syncCode = syncCode.replace(/await prisma\.mpesaConfig\.findFirst\(\{ where: \{ businessId, locationId: targetLocationId \} \}\)/g, "await db.selectFrom('MpesaConfig').selectAll().where('businessId', '=', businessId).where('locationId', '=', targetLocationId).executeTakeFirst()");
    syncCode = syncCode.replace(/await prisma\.mpesaConfig\.update\(\{ where: \{ id: existingConfig\.id \}, data: configData \}\)/g, "await db.updateTable('MpesaConfig').set(configData).where('id', '=', existingConfig.id).execute()");
    syncCode = syncCode.replace(/await prisma\.mpesaConfig\.create\(\{ data: configData \}\)/g, "await db.insertInto('MpesaConfig').values({ id: randomUUID(), ...configData }).returningAll().executeTakeFirstOrThrow()");

    syncCode = syncCode.replace(/await prisma\.customer\.findFirst\(\{ where: \{ businessId, name: String\(c\.name\) \} \}\)/, "await db.selectFrom('Customer').selectAll().where('businessId', '=', businessId).where('name', '=', String(c.name)).executeTakeFirst()");
    syncCode = syncCode.replace(/await prisma\.customer\.update\(\{\s*where: \{ id: existing\.id \},\s*data: \{([\s\S]*?)\}\s*\}\)/g, "await db.updateTable('Customer').set({$1}).where('id', '=', existing.id).execute()");
    syncCode = syncCode.replace(/await prisma\.customer\.create\(\{\s*data: \{([\s\S]*?)\}\s*\}\)/g, "await db.insertInto('Customer').values({ id: randomUUID(),$1}).returningAll().executeTakeFirstOrThrow()");

    syncCode = syncCode.replace(/await prisma\.supplier\.findFirst\(\{ where: \{ businessId, name: String\(s\.name\) \} \}\)/, "await db.selectFrom('Supplier').selectAll().where('businessId', '=', businessId).where('name', '=', String(s.name)).executeTakeFirst()");
    syncCode = syncCode.replace(/await prisma\.supplier\.update\(\{\s*where: \{ id: existing\.id \},\s*data: \{([\s\S]*?)\}\s*\}\)/g, "await db.updateTable('Supplier').set({$1}).where('id', '=', existing.id).execute()");
    syncCode = syncCode.replace(/await prisma\.supplier\.create\(\{\s*data: \{([\s\S]*?)\}\s*\}\)/g, "await db.insertInto('Supplier').values({ id: randomUUID(),$1}).returningAll().executeTakeFirstOrThrow()");

    syncCode = syncCode.replace(/await prisma\.stockMovement\.findFirst\(\{\s*where: \{ businessId, reference: String\(log\.reference \|\| log\.id\) \}\s*\}\)/, "await db.selectFrom('StockMovement').selectAll().where('businessId', '=', businessId).where('reference', '=', String(log.reference || log.id)).executeTakeFirst()");
    syncCode = syncCode.replace(/await prisma\.stockMovement\.create\(\{\s*data: \{([\s\S]*?)\}\s*\}\)/g, "await db.insertInto('StockMovement').values({ id: randomUUID(),$1}).returningAll().executeTakeFirstOrThrow()");

    syncCode = syncCode.replace(/await prisma\.productInventory\.findFirst\(\{\s*where: \{ \s*productId: String\(log\.productId\), \s*locationId: targetLocationId, \s*outletId: targetOutletId \s*\}\s*\}\)/, "await db.selectFrom('ProductInventory').selectAll().where('productId', '=', String(log.productId)).where('locationId', '=', targetLocationId).where('outletId', targetOutletId ? '=' : 'is', targetOutletId ? targetOutletId : null).executeTakeFirst()");
    syncCode = syncCode.replace(/await prisma\.productInventory\.findFirst\(\{\s*where: \{\s*productId: String\(log\.productId\),\s*locationId: targetLocationId,\s*outletId: null\s*\}\s*\}\)/, "await db.selectFrom('ProductInventory').selectAll().where('productId', '=', String(log.productId)).where('locationId', '=', targetLocationId).where('outletId', 'is', null).executeTakeFirst()");
    syncCode = syncCode.replace(/await prisma\.productInventory\.update\(\{\s*where: \{ id: inventory\.id \},\s*data: \{ stock: Math\.max\(0, inventory\.stock \+ Number\(log\.variance \|\| 0\)\) \}\s*\}\)/, "await db.updateTable('ProductInventory').set({ stock: Math.max(0, inventory.stock + Number(log.variance || 0)) }).where('id', '=', inventory.id).execute()");

    fs.writeFileSync('sync.ts', syncCode);
}

migrateSync();
