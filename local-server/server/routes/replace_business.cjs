const fs = require('fs');

const path = 'C:/Users/Josphat Mburu/Documents/codes/Whiz_POS-master/local-server/server/routes/business.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/import pkg from '@prisma\/client';\r?\nconst \{ PrismaClient \} = pkg;\r?\nimport prisma from '\.\.\/prisma\.js';/, 
  "import db from '../db.js';\nimport { randomUUID } from 'crypto';");

code = code.replace(/const business = await prisma\.business\.findFirst\(\{ where: \{ apiKey \} \}\);/,
  "const business = await db.selectFrom('Business').selectAll().where('apiKey', '=', apiKey).executeTakeFirst();");

code = code.replace(/const business = await prisma\.business\.findFirst\(\);/,
  "const business = await db.selectFrom('Business').selectAll().executeTakeFirst();");

code = code.replace(/const business = await prisma\.business\.findUnique\(\{\s*where: \{ id: businessId \},\s*select: \{ id: true, name: true, email: true, logoUrl: true, createdAt: true, settings: true, apiKey: true \}\s*\}\);/,
  "const business = await db.selectFrom('Business').select(['id', 'name', 'email', 'logoUrl', 'createdAt', 'settings', 'apiKey']).where('id', '=', businessId).executeTakeFirst();");

code = code.replace(/const business = await prisma\.business\.update\(\{\s*where: \{ id: businessId \},\s*data: \{\s*\.\.\.\(name && \{ name \}\),\s*\.\.\.\(finalSettings !== undefined && \{ settings: finalSettings \}\),\s*\.\.\.\(apiKey !== undefined && \{ apiKey \}\)\s*\},\s*select: \{ id: true, name: true, settings: true, apiKey: true \}\s*\}\);/,
  `let updateData = {};
    if (name) updateData.name = name;
    if (finalSettings !== undefined) updateData.settings = finalSettings;
    if (apiKey !== undefined) updateData.apiKey = apiKey;
    const business = Object.keys(updateData).length > 0 
      ? await db.updateTable('Business').set(updateData).where('id', '=', businessId).returning(['id', 'name', 'settings', 'apiKey']).executeTakeFirstOrThrow()
      : await db.selectFrom('Business').select(['id', 'name', 'settings', 'apiKey']).where('id', '=', businessId).executeTakeFirst();`);

code = code.replace(/const updatedBusiness = await prisma\.business\.update\(\{\s*where: \{ id: businessId \},\s*data: \{ logoUrl \},\s*select: \{ id: true, name: true, logoUrl: true \}\s*\}\);/,
  "const updatedBusiness = await db.updateTable('Business').set({ logoUrl }).where('id', '=', businessId).returning(['id', 'name', 'logoUrl']).executeTakeFirstOrThrow();");

code = code.replace(/const business = await prisma\.business\.findUnique\(\{ where: \{ id: businessId \} \}\);/,
  "const business = await db.selectFrom('Business').selectAll().where('id', '=', businessId).executeTakeFirst();");

code = code.replace(/const categories = await prisma\.category\.findMany\(\{ where: \{ businessId \} \}\);/,
  "const categories = await db.selectFrom('Category').selectAll().where('businessId', '=', businessId).execute();");

code = code.replace(/const products = await prisma\.product\.findMany\(\{ where: \{ businessId \} \}\);/,
  "const products = await db.selectFrom('Product').selectAll().where('businessId', '=', businessId).execute();");

code = code.replace(/const users = await prisma\.user\.findMany\(\{ where: \{ businessId \} \}\);/,
  "const users = await db.selectFrom('User').selectAll().where('businessId', '=', businessId).execute();");

code = code.replace(/const customers = await prisma\.customer\.findMany\(\{ where: \{ businessId \} \}\);/,
  "const customers = await db.selectFrom('Customer').selectAll().where('businessId', '=', businessId).execute();");

code = code.replace(/let currentBusiness = await prisma\.business\.findUnique\(\{ where: \{ id: businessId \} \}\);/,
  "let currentBusiness = await db.selectFrom('Business').selectAll().where('id', '=', businessId).executeTakeFirst();");

code = code.replace(/await prisma\.business\.update\(\{\s*where: \{ id: businessId \},\s*data: \{ settings: JSON\.stringify\(mergedSettings\) \}\s*\}\);/,
  "await db.updateTable('Business').set({ settings: JSON.stringify(mergedSettings) }).where('id', '=', businessId).execute();");

code = code.replace(/await prisma\.category\.upsert\(\{\s*where: \{ id: cat\.id \},\s*update: \{ name: cat\.name, businessId \},\s*create: \{ id: cat\.id, name: cat\.name, businessId \}\s*\}\);/g,
  `const existingCat = await db.selectFrom('Category').selectAll().where('id', '=', cat.id).executeTakeFirst();
          if (existingCat) {
            await db.updateTable('Category').set({ name: cat.name, businessId }).where('id', '=', cat.id).execute();
          } else {
            await db.insertInto('Category').values({ id: cat.id, name: cat.name, businessId }).execute();
          }`);

code = code.replace(/await prisma\.product\.upsert\(\{\s*where: \{ id: p\.id \},\s*update: \{ sku: p\.sku, barcode: p\.barcode, name: p\.name, category: p\.category, price: p\.price, costPrice: p\.costPrice, taxRate: p\.taxRate, reorderLevel: p\.reorderLevel, businessId \},\s*create: \{ id: p\.id, sku: p\.sku, barcode: p\.barcode, name: p\.name, category: p\.category, price: p\.price, costPrice: p\.costPrice, taxRate: p\.taxRate, reorderLevel: p\.reorderLevel, businessId \}\s*\}\);/g,
  `const existingProd = await db.selectFrom('Product').selectAll().where('id', '=', p.id).executeTakeFirst();
          if (existingProd) {
            await db.updateTable('Product').set({ sku: p.sku, barcode: p.barcode, name: p.name, category: p.category, price: p.price, costPrice: p.costPrice, taxRate: p.taxRate, reorderLevel: p.reorderLevel, businessId }).where('id', '=', p.id).execute();
          } else {
            await db.insertInto('Product').values({ id: p.id, sku: p.sku, barcode: p.barcode, name: p.name, category: p.category, price: p.price, costPrice: p.costPrice, taxRate: p.taxRate, reorderLevel: p.reorderLevel, businessId }).execute();
          }`);

code = code.replace(/const existing = await prisma\.user\.findUnique\(\{ where: \{ email: u\.email \} \}\);/,
  "const existing = await db.selectFrom('User').selectAll().where('email', '=', u.email).executeTakeFirst();");

code = code.replace(/await prisma\.user\.update\(\{\s*where: \{ email: u\.email \},\s*data: \{ name: u\.name, role: u\.role, pin: u\.pin, businessId \}\s*\}\);/,
  "await db.updateTable('User').set({ name: u.name, role: u.role, pin: u.pin, businessId }).where('email', '=', u.email).execute();");

code = code.replace(/await prisma\.user\.create\(\{\s*data: \{ email: u\.email, name: u\.name, role: u\.role, pin: u\.pin, password: u\.password, businessId \}\s*\}\);/,
  "await db.insertInto('User').values({ id: randomUUID(), email: u.email, name: u.name, role: u.role, pin: u.pin, password: u.password, businessId }).execute();");

code = code.replace(/await prisma\.customer\.upsert\(\{\s*where: \{ id: c\.id \},\s*update: \{ name: c\.name, phone: c\.phone, email: c\.email, loyaltyPoints: c\.loyaltyPoints, totalSpent: c\.totalSpent, businessId \},\s*create: \{ id: c\.id, name: c\.name, phone: c\.phone, email: c\.email, loyaltyPoints: c\.loyaltyPoints, totalSpent: c\.totalSpent, businessId \}\s*\}\);/g,
  `const existingCust = await db.selectFrom('Customer').selectAll().where('id', '=', c.id).executeTakeFirst();
          if (existingCust) {
            await db.updateTable('Customer').set({ name: c.name, phone: c.phone, email: c.email, loyaltyPoints: c.loyaltyPoints, totalSpent: c.totalSpent, businessId }).where('id', '=', c.id).execute();
          } else {
            await db.insertInto('Customer').values({ id: c.id, name: c.name, phone: c.phone, email: c.email, loyaltyPoints: c.loyaltyPoints, totalSpent: c.totalSpent, businessId }).execute();
          }`);

code = code.replace(/const locations = await prisma\.storeLocation\.findMany\(\{\s*where: \{ businessId \},\s*orderBy: \{ createdAt: 'asc' \}\s*\}\);/,
  "const locations = await db.selectFrom('StoreLocation').selectAll().where('businessId', '=', businessId).orderBy('createdAt', 'asc').execute();");

fs.writeFileSync(path, code);
console.log('business.ts processed');
