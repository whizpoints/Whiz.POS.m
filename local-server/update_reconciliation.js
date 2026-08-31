const fs = require('fs');

function updateReconciliation() {
  const file = 'C:/Users/Josphat Mburu/Documents/codes/Whiz_POS-master/local-server/server/routes/reconciliation.ts';
  let code = fs.readFileSync(file, 'utf8');

  code = code.replace("import pkg from '@prisma/client';\nconst { PrismaClient } = pkg;\nimport prisma from '../prisma.js';", "import db from '../db.js';\nimport { randomUUID } from 'crypto';");
  code = code.replace("// const prisma = new PrismaClient();\n", '');

  const prismaFindManyRegex = /await prisma\.receipt\.findMany\(\{\s*where: \{\s*businessId,\s*paymentMethod: 'mpesa',\s*mpesaCode: \{ startsWith: '\*\*\*' \},\s*status: \{ not: 'REFUNDED' \} \/\/ We only reconcile pending\/completed\s*\},\s*orderBy: \{ createdAt: 'desc' \}\s*\}\)/;

  code = code.replace(prismaFindManyRegex, `await db.selectFrom('Receipt')
      .selectAll()
      .where('businessId', '=', businessId)
      .where('paymentMethod', '=', 'mpesa')
      .where('mpesaCode', 'like', '***%')
      .where('status', '!=', 'REFUNDED')
      .orderBy('createdAt', 'desc')
      .execute()`);

  fs.writeFileSync(file, code);
  console.log("Updated reconciliation.ts");
}
updateReconciliation();
