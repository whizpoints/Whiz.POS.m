const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '../local-server/server/index.ts');
let content = fs.readFileSync(file, 'utf8');

const target = `  cloudSocket.on('downward_sync_event', (data) => {
    console.log('[Cloud Socket] Received downward sync event:', data);
    // Notify local POS apps immediately
    io.emit('cloud_sync_received', data);
  });`;

const replacement = `  cloudSocket.on('downward_sync_event', (data) => {
    console.log('[Cloud Socket] Received downward sync event:', data);
    // Notify local POS apps immediately
    io.emit('cloud_sync_received', data);
  });

  cloudSocket.on('mpesa_payment_received', async (data) => {
    console.log('[Cloud Socket] Received M-Pesa payment event:', data);
    try {
      if (data && data.transactionId) {
        const existing = await db.selectFrom('MpesaTransaction')
          .selectAll()
          .where('transactionId', '=', data.transactionId)
          .executeTakeFirst();
        if (!existing) {
          await db.insertInto('MpesaTransaction').values({
            id: data.id || crypto.randomUUID(),
            businessId: data.businessId,
            locationId: data.locationId || null,
            transactionId: data.transactionId,
            amount: Number(data.amount) || 0,
            phoneNumber: String(data.phoneNumber || ''),
            customerName: data.customerName || null,
            status: 'UNLINKED',
            isEnriched: data.isEnriched ? 1 : 0,
            timestamp: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }).execute();
        }
      }
    } catch (err) {
      console.error('[Cloud Socket] Failed to record M-Pesa transaction locally:', err);
    }
    // Broadcast immediately to local POS terminals
    io.emit('mpesa_payment_received', data);
  });`;

// Try CRLF or LF replacement
if (content.includes(target.replace(/\r?\n/g, '\r\n'))) {
  content = content.replace(target.replace(/\r?\n/g, '\r\n'), replacement.replace(/\r?\n/g, '\r\n'));
} else {
  content = content.replace(target.replace(/\r?\n/g, '\n'), replacement.replace(/\r?\n/g, '\n'));
}

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated local-server/server/index.ts with mpesa_payment_received listener');
