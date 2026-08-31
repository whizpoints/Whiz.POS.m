const fs = require('fs');

const path = 'C:/Users/Josphat Mburu/Documents/codes/Whiz_POS-master/local-server/server/routes/backup.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/import pkg from '@prisma\/client';\r?\nconst \{ PrismaClient \} = pkg;\r?\nimport prisma from '\.\.\/prisma\.js';/, 
  "import db from '../db.js';\nimport { randomUUID } from 'crypto';");

code = code.replace(/const defaultLocation = await prisma\.storeLocation\.findFirst\(\{ where: \{ businessId \} \}\) \|\| \s*await prisma\.storeLocation\.create\(\{ data: \{ businessId, name: 'Main Branch' \} \}\);/,
  `const defaultLocation = await db.selectFrom('StoreLocation').selectAll().where('businessId', '=', businessId).executeTakeFirst() || await db.insertInto('StoreLocation').values({ id: randomUUID(), businessId, name: 'Main Branch' }).returningAll().executeTakeFirstOrThrow();`);

code = code.replace(/const existing = await prisma\.product\.findFirst\(\{ where: \{ businessId, sku \} \}\);/,
  `const existing = await db.selectFrom('Product').selectAll().where('businessId', '=', businessId).where('sku', '=', sku).executeTakeFirst();`);

code = code.replace(/await prisma\.product\.update\(\{\s*where: \{ id: existing\.id \},\s*data: \{([\s\S]*?)\}\s*\}\);/,
  `await db.updateTable('Product').set({
    name: String(p.name),
    category: p.category ? String(p.category) : null,
    price: Number(p.price) || 0,
    costPrice: Number(p.costPrice) || 0,
    barcode: p.barcode ? String(p.barcode) : null
}).where('id', '=', existing.id).execute();`);

code = code.replace(/const newP = await prisma\.product\.create\(\{\s*data: \{([\s\S]*?)\}\s*\}\);/,
  `const newP = await db.insertInto('Product').values({
    id: randomUUID(),
    businessId,
    sku,
    name: String(p.name),
    category: p.category ? String(p.category) : null,
    price: Number(p.price) || 0,
    costPrice: Number(p.costPrice) || 0,
    barcode: p.barcode ? String(p.barcode) : null
}).returningAll().executeTakeFirstOrThrow();`);

code = code.replace(/const existingInv = await prisma\.productInventory\.findFirst\(\{\s*where: \{ productId, locationId \}\s*\}\);/,
  `const existingInv = await db.selectFrom('ProductInventory').selectAll().where('productId', '=', productId).where('locationId', '=', locationId).executeTakeFirst();`);

code = code.replace(/await prisma\.productInventory\.update\(\{\s*where: \{ id: existingInv\.id \},\s*data: \{ stock: Math\.max\(existingInv\.stock, Number\(p\.stock\) \|\| 0\) \}\s*\/\/ keep highest stock to avoid overwriting newer sales\s*\}\);/,
  `await db.updateTable('ProductInventory').set({ stock: Math.max(existingInv.stock, Number(p.stock) || 0) }).where('id', '=', existingInv.id).execute();`);

code = code.replace(/await prisma\.productInventory\.create\(\{\s*data: \{ productId, locationId, stock: Number\(p\.stock\) \|\| 0 \}\s*\}\);/,
  `await db.insertInto('ProductInventory').values({ id: randomUUID(), productId, locationId, stock: Number(p.stock) || 0 }).execute();`);

code = code.replace(/await prisma\.user\.upsert\(\{\s*where: \{ email: fallbackEmail \},\s*create: \{([\s\S]*?)\},\s*update: \{([\s\S]*?)\}\s*\}\);/,
  `let existingUser = await db.selectFrom('User').selectAll().where('email', '=', fallbackEmail).executeTakeFirst();
    if (existingUser) {
        await db.updateTable('User').set({
            name: u.name,
            role: role as any,
            locationId
        }).where('email', '=', fallbackEmail).execute();
    } else {
        await db.insertInto('User').values({
            id: randomUUID(),
            businessId,
            locationId,
            email: fallbackEmail,
            password: u.pin || u.password || 'pos1234',
            pin: u.pin || null,
            name: u.name,
            role: role as any
        }).execute();
    }`);

code = code.replace(/const existing = await prisma\.receipt\.findFirst\(\{ where: \{ businessId, receiptNumber: String\(t\.id\) \} \}\);/,
  `const existing = await db.selectFrom('Receipt').selectAll().where('businessId', '=', businessId).where('receiptNumber', '=', String(t.id)).executeTakeFirst();`);

code = code.replace(/await prisma\.receipt\.create\(\{\s*data: \{([\s\S]*?)\}\s*\}\);/,
  `await db.insertInto('Receipt').values({
    id: randomUUID(),
    businessId,
    locationId,
    receiptNumber: String(t.id),
    totalAmount: Number(t.totalAmount || t.total) || 0,
    paymentMethod: String(t.paymentMethod || 'CASH'),
    customerPhone: t.customerPhone ? String(t.customerPhone) : null,
    status: 'COMPLETED',
    createdAt: t.timestamp ? new Date(t.timestamp).toISOString() : undefined
}).execute();`);

fs.writeFileSync(path, code);
console.log('backup.ts processed');
