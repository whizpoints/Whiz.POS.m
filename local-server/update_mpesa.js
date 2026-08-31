const fs = require('fs');

function updateMpesa() {
  const file = 'C:/Users/Josphat Mburu/Documents/codes/Whiz_POS-master/local-server/server/routes/mpesa.ts';
  let code = fs.readFileSync(file, 'utf8');

  code = code.replace("import pkg from '@prisma/client';\nconst { PrismaClient } = pkg;\nimport prisma from '../prisma.js';", "import db from '../db.js';\nimport { randomUUID } from 'crypto';");
  code = code.replace("// const prisma = new PrismaClient();\n", '');

  code = code.replace(/config = await prisma\.mpesaConfig\.findFirst\(\{\s*where: \{\s*businessId,\s*locationId\s*\}\s*\}\);/g, `config = await db.selectFrom('MpesaConfig')
      .selectAll()
      .where('businessId', '=', businessId)
      .where('locationId', '=', locationId)
      .executeTakeFirst();`);

  code = code.replace(/config = await prisma\.mpesaConfig\.findFirst\(\{\s*where: \{\s*businessId\s*\}\s*\}\);/g, `config = await db.selectFrom('MpesaConfig')
      .selectAll()
      .where('businessId', '=', businessId)
      .executeTakeFirst();`);

  code = code.replace(/const config = await prisma\.mpesaConfig\.findFirst\(\{\s*where: \{\s*businessId\s*\}\s*\}\);/g, `const config = await db.selectFrom('MpesaConfig')
      .selectAll()
      .where('businessId', '=', businessId)
      .executeTakeFirst();`);

  code = code.replace(/await prisma\.mpesaTransaction\.upsert\(\{\s*where: \{\s*transactionId: receipt\s*\},\s*create: \{\s*businessId,\s*transactionId: receipt,\s*amount: parseFloat\(amount\),\s*phoneNumber: phone\.toString\(\),\s*status: 'UNLINKED'\s*\},\s*update: \{\}\s*\}\);/, `const existingTxn = await db.selectFrom('MpesaTransaction')
          .where('transactionId', '=', receipt)
          .executeTakeFirst();

        if (!existingTxn) {
          await db.insertInto('MpesaTransaction')
            .values({
              id: randomUUID(),
              businessId,
              transactionId: receipt,
              amount: parseFloat(amount),
              phoneNumber: phone.toString(),
              status: 'UNLINKED'
            })
            .execute();
        }`);

  code = code.replace(/await prisma\.mpesaTransaction\.upsert\(\{\s*where: \{\s*transactionId: TransID\s*\},\s*create: \{\s*businessId,\s*transactionId: TransID,\s*amount: parseFloat\(TransAmount\),\s*phoneNumber: MSISDN,\s*customerName,\s*status: 'UNLINKED'\s*\},\s*update: \{\}\s*\}\);/, `const existingTxn = await db.selectFrom('MpesaTransaction')
      .where('transactionId', '=', TransID)
      .executeTakeFirst();

    if (!existingTxn) {
      await db.insertInto('MpesaTransaction')
        .values({
          id: randomUUID(),
          businessId,
          transactionId: TransID,
          amount: parseFloat(TransAmount),
          phoneNumber: MSISDN,
          customerName,
          status: 'UNLINKED'
        })
        .execute();
    }`);

  code = code.replace(/await prisma\.mpesaTransaction\.updateMany\(\{\s*where: \{\s*transactionId: receiptNumber,\s*businessId\s*\},\s*data: \{\s*customerName,\s*phoneNumber: formattedPhone,\s*isEnriched: true\s*\}\s*\}\);/, `await db.updateTable('MpesaTransaction')
            .set({ customerName, phoneNumber: formattedPhone, isEnriched: true })
            .where('transactionId', '=', receiptNumber)
            .where('businessId', '=', businessId)
            .execute();`);

  code = code.replace(/const txns = await prisma\.mpesaTransaction\.findMany\(\{\s*where: \{\s*businessId,\s*status: 'UNLINKED',\s*isEnriched: true,\s*\.\.\.\(q \?\s*\{\s*OR: \[\s*\{\s*transactionId: \{\s*contains: q\s*\}\s*\},\s*\{\s*customerName: \{\s*contains: q\s*\}\s*\},\s*\{\s*phoneNumber: \{\s*contains: q\s*\}\s*\}\s*\]\s*\}\s*:\s*\{\}\)\s*\},\s*orderBy: \{\s*timestamp: 'desc'\s*\},\s*take: 20\s*\}\);/, `let query = db.selectFrom('MpesaTransaction')
        .selectAll()
        .where('businessId', '=', businessId)
        .where('status', '=', 'UNLINKED')
        .where('isEnriched', '=', true)
        .orderBy('timestamp', 'desc')
        .limit(20);

      if (q) {
        query = query.where((eb) => eb.or([
          eb('transactionId', 'like', \`%\${q}%\`),
          eb('customerName', 'like', \`%\${q}%\`),
          eb('phoneNumber', 'like', \`%\${q}%\`)
        ]));
      }

      const txns = await query.execute();`);

  code = code.replace(/const result = await prisma\.mpesaTransaction\.updateMany\(\{\s*where: \{\s*transactionId,\s*businessId,\s*status: 'UNLINKED'\s*\},\s*data: \{\s*status: 'LINKED'\s*\}\s*\}\);/g, `const result = await db.updateTable('MpesaTransaction')
      .set({ status: 'LINKED' })
      .where('transactionId', '=', transactionId)
      .where('businessId', '=', businessId)
      .where('status', '=', 'UNLINKED')
      .execute();

    // To simulate result.count
    (result as any).count = Number((result[0] as any)?.numUpdatedRows || result.length);`);

  fs.writeFileSync(file, code);
  console.log("Updated mpesa.ts");
}
updateMpesa();
