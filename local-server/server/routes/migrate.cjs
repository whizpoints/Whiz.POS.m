const fs = require('fs');
let content = fs.readFileSync('mpesa.ts', 'utf8');

content = content.replace(/import pkg from '@prisma\/client';\s*const \{ PrismaClient \} = pkg;\s*import prisma from '\.\.\/prisma\.js';/, "import db from '../db.js';\nimport { randomUUID } from 'crypto';");
content = content.replace(/const prisma = new PrismaClient\(\);\s*/, '');
content = content.replace(/await prisma\.mpesaConfig\.findFirst\(\{\s*where:\s*\{\s*businessId,\s*locationId\s*\}\s*\}\)/g, "await db.selectFrom('MpesaConfig').selectAll().where('businessId', '=', businessId).where('locationId', '=', locationId).executeTakeFirst()");
content = content.replace(/await prisma\.mpesaConfig\.findFirst\(\{\s*where:\s*\{\s*businessId\s*\}\s*\}\)/g, "await db.selectFrom('MpesaConfig').selectAll().where('businessId', '=', businessId).executeTakeFirst()");
content = content.replace(/await prisma\.mpesaTransaction\.updateMany\(\{\s*where:\s*\{\s*transactionId:\s*receiptNumber,\s*businessId\s*\},\s*data:\s*\{\s*customerName,\s*phoneNumber:\s*formattedPhone,\s*isEnriched:\s*true\s*\}\s*\}\);/g, "await db.updateTable('MpesaTransaction').set({ customerName, phoneNumber: formattedPhone, isEnriched: true }).where('transactionId', '=', receiptNumber).where('businessId', '=', businessId).execute();");
content = content.replace(/const result = await prisma\.mpesaTransaction\.updateMany\(\{\s*where:\s*\{\s*transactionId,\s*businessId,\s*status:\s*'UNLINKED'\s*\},\s*data:\s*\{\s*status:\s*'LINKED'\s*\}\s*\}\);/g, "const result = await db.updateTable('MpesaTransaction').set({ status: 'LINKED' }).where('transactionId', '=', transactionId).where('businessId', '=', businessId).where('status', '=', 'UNLINKED').execute();");
content = content.replace(/if \(result\.count === 0\) \{/g, "if (result.length === 0 || Number(result[0].numUpdatedRows) === 0) {");

// Simple string replacement for upserts
content = content.replace(`        await prisma.mpesaTransaction.upsert({
          where: { transactionId: receipt },
          create: {
            businessId,
            transactionId: receipt,
            amount: parseFloat(amount),
            phoneNumber: phone.toString(),
            status: 'UNLINKED'
          },
          update: {}
        });`, `        const existingTx1 = await db.selectFrom('MpesaTransaction').selectAll().where('transactionId', '=', receipt).executeTakeFirst();
        if (!existingTx1) {
          await db.insertInto('MpesaTransaction').values({
            id: randomUUID(),
            businessId,
            transactionId: receipt,
            amount: parseFloat(amount),
            phoneNumber: phone.toString(),
            status: 'UNLINKED'
          }).execute();
        }`);

content = content.replace(`    await prisma.mpesaTransaction.upsert({
      where: { transactionId: TransID },
      create: {
        businessId,
        transactionId: TransID,
        amount: parseFloat(TransAmount),
        phoneNumber: MSISDN,
        customerName,
        status: 'UNLINKED'
      },
      update: {}
    });`, `    const existingTx2 = await db.selectFrom('MpesaTransaction').selectAll().where('transactionId', '=', TransID).executeTakeFirst();
    if (!existingTx2) {
      await db.insertInto('MpesaTransaction').values({
        id: randomUUID(),
        businessId,
        transactionId: TransID,
        amount: parseFloat(TransAmount),
        phoneNumber: MSISDN,
        customerName,
        status: 'UNLINKED'
      }).execute();
    }`);

content = content.replace(/const txns = await prisma\.mpesaTransaction\.findMany\(\{\s*where:\s*\{\s*businessId,\s*status:\s*'UNLINKED',\s*isEnriched:\s*true,[\s\S]*?take:\s*20\s*\}\);/m, `let query = db.selectFrom('MpesaTransaction')
        .selectAll()
        .where('businessId', '=', businessId)
        .where('status', '=', 'UNLINKED')
        .where('isEnriched', '=', true)
        .orderBy('timestamp', 'desc')
        .limit(20);
      
      if (q) {
        query = query.where((eb) => eb.or([
          eb('transactionId', 'like', \\\`%\\\${q}%\\\`),
          eb('customerName', 'like', \\\`%\\\${q}%\\\`),
          eb('phoneNumber', 'like', \\\`%\\\${q}%\\\`)
        ]));
      }
      const txns = await query.execute();`);

fs.writeFileSync('mpesa.ts', content);
