const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '../local-server/server/routes/mpesa.ts');
let content = fs.readFileSync(file, 'utf8');

const target = content.slice(content.indexOf('// 7. Payment Search'), content.indexOf('// 8. Generate Dynamic QR Code'));

const replacement = `// 7. Payment Search / Polling for POS
  router.get('/payments/search', async (req: any, res: any) => {
    try {
      const businessId = req.query.businessId as string;
      const q = req.query.q as string;
      
      if (!businessId) return res.status(400).json({ error: 'Missing businessId' });

      // Also sync from cloud if reachable
      try {
        const cloudUrl = process.env.CLOUD_API_URL || 'https://api.whizpoint.app';
        const cloudRes = await fetch(\`\${cloudUrl}/api/mpesa/payments/search?businessId=\${businessId}\`, {
          signal: AbortSignal.timeout(3000)
        });
        if (cloudRes.ok) {
          const cloudTxns = await cloudRes.json();
          if (Array.isArray(cloudTxns)) {
            for (const ctx of cloudTxns) {
              const existing = await db.selectFrom('MpesaTransaction')
                .selectAll()
                .where('transactionId', '=', ctx.transactionId)
                .executeTakeFirst();
              if (!existing) {
                await db.insertInto('MpesaTransaction').values({
                  id: ctx.id || randomUUID(),
                  businessId,
                  locationId: ctx.locationId || null,
                  transactionId: ctx.transactionId,
                  amount: Number(ctx.amount) || 0,
                  phoneNumber: String(ctx.phoneNumber || ''),
                  customerName: ctx.customerName || null,
                  status: ctx.status || 'UNLINKED',
                  isEnriched: ctx.isEnriched ? 1 : 0,
                  timestamp: ctx.timestamp ? new Date(ctx.timestamp).toISOString() : new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                }).execute();
              }
            }
          }
        }
      } catch (cloudErr) {}
      
      let query = db.selectFrom('MpesaTransaction')
        .selectAll()
        .where('businessId', '=', businessId)
        .where('status', '=', 'UNLINKED')
        .orderBy('timestamp', 'desc')
        .limit(20);
      
      if (q) {
        query = query.where((eb) => eb.or([
          eb('transactionId', 'like', \`%\${q}%\`),
          eb('customerName', 'like', \`%\${q}%\`),
          eb('phoneNumber', 'like', \`%\${q}%\`)
        ]));
      }
      const txns = await query.execute();
      res.json(txns);
    } catch (err) {
      console.error('M-Pesa payment search error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  `;

fs.writeFileSync(file, content.replace(target, replacement), 'utf8');
console.log('Successfully updated local-server/server/routes/mpesa.ts');
