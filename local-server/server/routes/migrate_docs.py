import re
import sys

with open(sys.argv[1], 'r', encoding='utf-8') as f:
    content = f.read()

# Replace imports
content = content.replace("import pkg from '@prisma/client';\nconst { PrismaClient } = pkg;\nimport prisma from '../prisma.js';", "import db from '../db.js';\nimport { randomUUID } from 'crypto';")
content = content.replace("// const prisma = new PrismaClient();\n", "")

def replacement(match):
    return """
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
"""

content = re.sub(r"const receipt = await prisma\.receipt\.findUnique\(\{\s*where: \{ id: req\.params\.id, businessId: req\.businessId \},\s*include: \{\s*items: true,\s*business: true,\s*outlet: \{ include: \{ location: true \} \}\s*\}\s*\}\);", replacement, content)

with open(sys.argv[1], 'w', encoding='utf-8') as f:
    f.write(content)
