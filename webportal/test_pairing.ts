import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
const prisma = new PrismaClient();

async function test() {
  const locs = await prisma.storeLocation.findMany();
  console.log('Locations:', locs);
  if (locs.length > 0) {
    try {
      const locationId = locs[0].id;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const pairingCode = "123456";
      const existing = locs[0];
      
      const loc = await prisma.storeLocation.update({
        where: { id: locationId },
        data: { 
          pairingCode,
          pairingCodeExpiresAt: expiresAt,
          apiKey: existing.apiKey || crypto.randomBytes(32).toString('hex')
        }
      });
      console.log('Success:', loc);
    } catch (err) {
      console.error('Update Error:', err);
    }
  }
}
test();
