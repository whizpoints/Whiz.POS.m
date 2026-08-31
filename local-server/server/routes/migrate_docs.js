const fs = require('fs');

let content = fs.readFileSync(process.argv[2], 'utf-8');

content = content.replace("import pkg from '@prisma/client';\nconst { PrismaClient } = pkg;\nimport prisma from '../prisma.js';", "import db from '../db.js';\nimport { randomUUID } from 'crypto';")
content = content.replace("// const prisma = new PrismaClient();\n", "")

const replacement = `
    const receipt: any = await db.selectFrom('Receipt')
      .selectAll()
      .where('id', '=', req.params.id)
      .where('businessId', '=', req.businessId)
      .executeTakeFirst();

    if (receipt) {
      receipt.items = await db.selectFrom('ReceiptItem').selectAll().where('receiptId', '=', receipt.id).execute();
      receipt.business = await db.selectFrom('Business').selectAll().where('id', '=', receipt.businessId).executeTakeFirst();
      
      if (receipt.outletId) {
        const outlet: any = await db.selectFrom('Outlet').selectAll().where('id', '=', receipt.outletId).executeTakeFirst();
        if (outlet) {
          outlet.location = await db.selectFrom('StoreLocation').selectAll().where('id', '=', outlet.locationId).executeTakeFirst();
          receipt.outlet = outlet;
        }
      }
    }
`;

const regex = /const receipt = await prisma\.receipt\.findUnique\(\{[\s\S]*?where: \{ id: req\.params\.id, businessId: req\.businessId \},[\s\S]*?include: \{[\s\S]*?items: true,[\s\S]*?business: true,[\s\S]*?outlet: \{ include: \{ location: true \} \}[\s\S]*?\}[\s\S]*?\}\);/g;

content = content.replace(regex, replacement);

fs.writeFileSync(process.argv[2], content, 'utf-8');
