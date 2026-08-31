const fs = require('fs');
const crypto = require('crypto');

const authPath = 'C:/Users/Josphat Mburu/Documents/codes/Whiz_POS-master/local-server/server/routes/auth.ts';
let code = fs.readFileSync(authPath, 'utf8');

code = code.replace(/import pkg from '@prisma\/client';\r?\nconst \{ PrismaClient \} = pkg;\r?\nimport prisma from '\.\.\/prisma\.js';/, 
  "import db from '../db.js';\nimport { randomUUID } from 'crypto';");

code = code.replace(/const existingBusiness = await prisma\.business\.findUnique\(\{ where: \{ email \} \}\);/,
  "const existingBusiness = await db.selectFrom('Business').selectAll().where('email', '=', email).executeTakeFirst();");

code = code.replace(/const business = await prisma\.business\.create\(\{\s*data: \{([\s\S]*?)id: cloudBusinessId \|\| undefined,([\s\S]*?)users: \{([\s\S]*?)\},([\s\S]*?)locations: \{([\s\S]*?)\}\s*\},[\s\S]*?include: \{ users: true \}\s*\}\);/,
`const bId = cloudBusinessId || randomUUID();
    const generatedApiKey = apiKey || crypto.randomBytes(32).toString('hex');
    const business = await db.insertInto('Business').values({
      id: bId,
      name: businessName,
      email,
      kraPin: kraPin || null,
      settings,
      verificationToken: null,
      emailVerified: 1,
      setupComplete: 1,
      apiKey: generatedApiKey
    }).returningAll().executeTakeFirstOrThrow();

    const user = await db.insertInto('User').values({
      id: randomUUID(),
      businessId: business.id,
      email,
      password: hashedPassword,
      pin: password.length === 4 && /^\\d+$/.test(password) ? password : null,
      name: 'Admin',
      role: 'ADMIN'
    }).returningAll().executeTakeFirstOrThrow();

    await db.insertInto('StoreLocation').values({
      id: randomUUID(),
      businessId: business.id,
      name: 'Main Store',
      address: address || 'Local Setup'
    }).execute();

    business.users = [user];`);

code = code.replace(/const business = await prisma\.business\.findFirst\(\{ where: \{ verificationToken: token \} \}\);/,
  "const business = await db.selectFrom('Business').selectAll().where('verificationToken', '=', token).executeTakeFirst();");

code = code.replace(/await prisma\.business\.update\(\{\s*where: \{ id: business\.id \},\s*data: \{ emailVerified: true, verificationToken: null \}\s*\}\);/,
  "await db.updateTable('Business').set({ emailVerified: 1, verificationToken: null }).where('id', '=', business.id).execute();");

code = code.replace(/const business = await prisma\.business\.findUnique\(\{ where: \{ id: decoded\.businessId \} \}\);/g,
  "const business = await db.selectFrom('Business').selectAll().where('id', '=', decoded.businessId).executeTakeFirst();");

code = code.replace(/await prisma\.business\.update\(\{\s*where: \{ id: business\.id \},\s*data: \{ verificationToken \}\s*\}\);/,
  "await db.updateTable('Business').set({ verificationToken }).where('id', '=', business.id).execute();");

code = code.replace(/const business = await prisma\.business\.update\(\{\s*where: \{ id: decoded\.businessId \},\s*data: \{\s*name: businessName,\s*kraPin,\s*setupComplete: true,\s*apiKey\s*\}\s*\}\);/,
  "const business = await db.updateTable('Business').set({ name: businessName, kraPin, setupComplete: 1, apiKey }).where('id', '=', decoded.businessId).returningAll().executeTakeFirstOrThrow();");

code = code.replace(/const user = await prisma\.user\.findUnique\(\{ where: \{ email \}, include: \{ business: true \} \}\);/,
  `const user = await db.selectFrom('User').selectAll().where('email', '=', email).executeTakeFirst();
    if (user) {
      user.business = await db.selectFrom('Business').selectAll().where('id', '=', user.businessId).executeTakeFirst();
    }`);

code = code.replace(/const business = await prisma\.business\.findFirst\(\{\s*where: \{ apiKey \},\s*include: \{\s*users: \{\s*where: \{ role: 'ADMIN' \},\s*take: 1\s*\}\s*\}\s*\}\);/,
  `const business = await db.selectFrom('Business').selectAll().where('apiKey', '=', apiKey).executeTakeFirst();
    if (business) {
      const adminUsers = await db.selectFrom('User').selectAll().where('businessId', '=', business.id).where('role', '=', 'ADMIN').limit(1).execute();
      business.users = adminUsers;
    }`);

code = code.replace(/await prisma\.business\.update\(\{\s*where: \{ id: decoded\.businessId \},\s*data: \{ pairingCode \}\s*\}\);/,
  "await db.updateTable('Business').set({ pairingCode }).where('id', '=', decoded.businessId).execute();");

code = code.replace(/const business = await prisma\.business\.findFirst\(\{\s*where: \{ apiKey, pairingCode \}\s*\}\);/,
  "const business = await db.selectFrom('Business').selectAll().where('apiKey', '=', apiKey).where('pairingCode', '=', pairingCode).executeTakeFirst();");

code = code.replace(/await prisma\.business\.update\(\{\s*where: \{ id: business\.id \},\s*data: \{ pairingCode: null \}\s*\}\);/,
  "await db.updateTable('Business').set({ pairingCode: null }).where('id', '=', business.id).execute();");

fs.writeFileSync(authPath, code);
console.log('auth.ts processed');
