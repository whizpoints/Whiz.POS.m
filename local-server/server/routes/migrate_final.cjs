const fs = require('fs');
let content = fs.readFileSync('mpesa.ts', 'utf8');
content = content.replace(/await prisma\.mpesaTransaction\.upsert\(\{[\s\S]*?update:\s*\{\}\s*\}\);/g, `const existingTx = await db.selectFrom('MpesaTransaction').selectAll().where('transactionId', '=', receipt || TransID || 'unknown').executeTakeFirst();
        if (!existingTx) {
          await db.insertInto('MpesaTransaction').values({
            id: randomUUID(),
            businessId,
            transactionId: typeof receipt !== 'undefined' ? receipt : (typeof TransID !== 'undefined' ? TransID : 'unknown'),
            amount: parseFloat(typeof amount !== 'undefined' ? amount : (typeof TransAmount !== 'undefined' ? TransAmount : '0')),
            phoneNumber: typeof phone !== 'undefined' ? phone.toString() : (typeof MSISDN !== 'undefined' ? MSISDN.toString() : ''),
            status: 'UNLINKED',
            customerName: typeof customerName !== 'undefined' ? customerName : null
          }).execute();
        }`);
fs.writeFileSync('mpesa.ts', content);
