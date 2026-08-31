const fs = require('fs');

let content = fs.readFileSync(process.argv[2], 'utf-8');

// Imports
content = content.replace("import pkg from '@prisma/client';\nconst { PrismaClient } = pkg;\nimport prisma from '../prisma.js';", "import db from '../db.js';\nimport { randomUUID } from 'crypto';")
content = content.replace("// const prisma = new PrismaClient();\n", "")

// Route: Get all products
content = content.replace(/await prisma\.product\.findMany\(\{[\s]*where: \{ businessId \},[\s]*include: \{ inventory: \{ include: \{ location: true \} \} \},[\s]*orderBy: \{ name: 'asc' \}[\s]*\}\)/g, 
  `(async () => {
      const prods = await db.selectFrom('Product').selectAll().where('businessId', '=', businessId).orderBy('name', 'asc').execute();
      const invs = await db.selectFrom('ProductInventory').selectAll().where('productId', 'in', prods.length > 0 ? prods.map(p => p.id) : ['']).execute();
      const locs = await db.selectFrom('StoreLocation').selectAll().where('businessId', '=', businessId).execute();
      for (const i of invs) {
        i.location = locs.find(l => l.id === i.locationId);
      }
      for (const p of prods) {
        p.inventory = invs.filter(i => i.productId === p.id);
      }
      return prods;
    })()`);

// Helper: resolveCategory
content = content.replace(/await prisma\.category\.findUnique\(\{ where: \{ id: categoryId, businessId \} \}\)/g, 
  "await db.selectFrom('Category').selectAll().where('id', '=', categoryId).where('businessId', '=', businessId).executeTakeFirst()");

// Create product
content = content.replace(/await prisma\.product\.create\(\{[\s]*data: \{([\s\S]*?)\}[\s]*\}\)/g, 
  "await db.insertInto('Product').values({ id: randomUUID(), $1 }).returningAll().executeTakeFirstOrThrow()");

// Find storeLocation
content = content.replace(/await prisma\.storeLocation\.findFirst\(\{ where: \{ businessId \} \}\)/g, 
  "await db.selectFrom('StoreLocation').selectAll().where('businessId', '=', businessId).executeTakeFirst()");

// Create productInventory
content = content.replace(/await prisma\.productInventory\.create\(\{[\s]*data: \{([\s\S]*?)\}[\s]*\}\)/g, 
  "await db.insertInto('ProductInventory').values({ id: randomUUID(), $1 }).returningAll().executeTakeFirstOrThrow()");

// Update product
content = content.replace(/await prisma\.product\.update\(\{[\s]*where: \{ id([\w:, ]*)businessId \},[\s]*data: (updateData)[\s]*\}\)/g, 
  "await db.updateTable('Product').set($2).where('id', '=', id).where('businessId', '=', businessId).execute()");

// Update product in import route
content = content.replace(/await prisma\.product\.update\(\{[\s]*where: \{ id: existingProduct\.id \},[\s]*data: \{([\s\S]*?)\}[\s]*\}\)/g, 
  "await db.updateTable('Product').set({$1}).where('id', '=', existingProduct.id).execute()");

// Find existing inventory
content = content.replace(/await prisma\.productInventory\.findFirst\(\{[\s]*where: \{ productId: id, locationId: targetLocationId \}[\s]*\}\)/g, 
  "await db.selectFrom('ProductInventory').selectAll().where('productId', '=', id).where('locationId', '=', targetLocationId).executeTakeFirst()");
content = content.replace(/await prisma\.productInventory\.findFirst\(\{[\s]*where: \{ productId, locationId: targetLocationId \}[\s]*\}\)/g, 
  "await db.selectFrom('ProductInventory').selectAll().where('productId', '=', productId).where('locationId', '=', targetLocationId).executeTakeFirst()");

// Update inventory
content = content.replace(/await prisma\.productInventory\.update\(\{[\s]*where: \{ id: existingInventory\.id \},[\s]*data: \{([\s\S]*?)\}[\s]*\}\)/g, 
  "await db.updateTable('ProductInventory').set({$1}).where('id', '=', existingInventory.id).execute()");
content = content.replace(/await prisma\.productInventory\.update\(\{[\s]*where: \{ id: inv\.id \},[\s]*data: \{ stock: \{ increment: delta \} \}[\s]*\}\)/g, 
  "await db.updateTable('ProductInventory').set((eb) => ({ stock: eb('stock', '+', delta) })).where('id', '=', inv.id).execute()");
content = content.replace(/await prisma\.productInventory\.update\(\{[\s]*where: \{ id: inv\.id \},[\s]*data: \{ stock: \{ increment: quantity \} \}[\s]*\}\)/g, 
  "await db.updateTable('ProductInventory').set((eb) => ({ stock: eb('stock', '+', quantity) })).where('id', '=', inv.id).execute()");

// Create stock movement
content = content.replace(/await prisma\.stockMovement\.create\(\{[\s]*data: \{([\s\S]*?)\}[\s]*\}\)/g, 
  "await db.insertInto('StockMovement').values({ id: randomUUID(), $1 }).execute()");

// Delete product
content = content.replace(/await prisma\.product\.deleteMany\(\{[\s]*where: \{ id, businessId \}[\s]*\}\)/g, 
  "await db.deleteFrom('Product').where('id', '=', id).where('businessId', '=', businessId).execute()");

// Find many categories
content = content.replace(/await prisma\.category\.findMany\(\{ where: \{ businessId \} \}\)/g, 
  "await db.selectFrom('Category').selectAll().where('businessId', '=', businessId).execute()");

// Find many products (no includes)
content = content.replace(/await prisma\.product\.findMany\(\{ where: \{ businessId \}, orderBy: \{ name: 'asc' \} \}\)/g, 
  "await db.selectFrom('Product').selectAll().where('businessId', '=', businessId).orderBy('name', 'asc').execute()");

// Find product OR
content = content.replace(/await prisma\.product\.findFirst\(\{[\s]*where: \{ businessId, OR: \[\{ sku \}, \{ name \}\] \}[\s]*\}\)/g, 
  "await db.selectFrom('Product').selectAll().where('businessId', '=', businessId).where((eb) => eb.or([eb('sku', '=', sku), eb('name', '=', name)])).executeTakeFirst()");

// Template reconciliation get products
content = content.replace(/await prisma\.product\.findMany\(\{[\s]*where: \{ businessId \},[\s]*include: \{ inventory: \{ where: \{ locationId: targetLocationId \} \} \},[\s]*orderBy: \{ name: 'asc' \}[\s]*\}\)/g, 
  `(async () => {
      const prods = await db.selectFrom('Product').selectAll().where('businessId', '=', businessId).orderBy('name', 'asc').execute();
      const invs = await db.selectFrom('ProductInventory').selectAll().where('locationId', '=', targetLocationId).where('productId', 'in', prods.length > 0 ? prods.map(p => p.id) : ['']).execute();
      for (const p of prods) {
        p.inventory = invs.filter(i => i.productId === p.id);
      }
      return prods;
    })()`);


fs.writeFileSync(process.argv[2], content, 'utf-8');
