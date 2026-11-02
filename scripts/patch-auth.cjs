const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../webportal/server/routes/auth.ts');
let code = fs.readFileSync(file, 'utf8');

const target = `  // Confirm and Burn Pairing Code (Unauthenticated - from Local Server)
  router.post('/confirm-pairing', async (req, res) => {
    try {
      const { apiKey, pairingCode } = req.body;
      
      const location = await prisma.storeLocation.findFirst({ where: { apiKey } });
      if (!location || location.pairingCode !== pairingCode) {
        return res.status(401).json({ error: 'Invalid handshake' });
      }

      // Burn the pairing code
      const targetLoc = await prisma.storeLocation.findFirst({ where: { apiKey } });
      if (targetLoc) await prisma.storeLocation.update({ where: { id: targetLoc.id },
        data: { pairingCode: null, pairingCodeExpiresAt: null }
      });

      res.json({ success: true, message: 'Handshake complete' });
    } catch (error) {
      res.status(500).json({ error: 'Confirmation failed' });
    }
  });`;

const replacement = `  // Confirm and Burn Pairing Code (Unauthenticated - from Local Server)
  router.post('/confirm-pairing', async (req, res) => {
    try {
      const { apiKey, pairingCode } = req.body;
      
      const location = await prisma.storeLocation.findFirst({ where: { apiKey } });
      if (!location || location.pairingCode !== pairingCode) {
        return res.status(401).json({ error: 'Invalid handshake' });
      }

      // Burn the pairing code
      await prisma.storeLocation.update({
        where: { id: location.id },
        data: { pairingCode: null, pairingCodeExpiresAt: null }
      });

      // Ensure default Outlet exists for this location
      let outlet = await prisma.outlet.findFirst({ where: { locationId: location.id } });
      if (!outlet) {
        outlet = await prisma.outlet.create({
          data: {
            businessId: location.businessId,
            locationId: location.id,
            name: location.name + ' - Register 1'
          }
        });
      }

      // Upsert Server appliance record
      const server = await prisma.server.upsert({
        where: { apiKey },
        update: {
          name: location.name + ' Edge Server',
          status: 'ONLINE',
          lastHeartbeat: new Date(),
          businessId: location.businessId
        },
        create: {
          apiKey,
          name: location.name + ' Edge Server',
          status: 'ONLINE',
          lastHeartbeat: new Date(),
          businessId: location.businessId
        }
      });

      // Also upsert terminal entry for visibility in the Devices list
      const edgeMac = 'SVR-' + location.id.slice(-6).toUpperCase();
      await prisma.terminal.upsert({
        where: { macAddress: edgeMac },
        update: {
          name: location.name + ' Appliance',
          status: 'APPROVED',
          apiKey,
          outletId: outlet.id,
          serverId: server.id,
          businessId: location.businessId
        },
        create: {
          macAddress: edgeMac,
          name: location.name + ' Appliance',
          status: 'APPROVED',
          apiKey,
          outletId: outlet.id,
          serverId: server.id,
          businessId: location.businessId
        }
      });

      res.json({ success: true, message: 'Handshake complete', outletId: outlet.id, serverId: server.id });
    } catch (error) {
      console.error('Pairing confirmation error:', error);
      res.status(500).json({ error: 'Confirmation failed: ' + (error.message || error) });
    }
  });`;

const normCode = code.replace(/\r\n/g, '\n');
const normTarget = target.replace(/\r\n/g, '\n');
const normReplacement = replacement.replace(/\r\n/g, '\n');

if (normCode.includes(normTarget)) {
  fs.writeFileSync(file, normCode.replace(normTarget, normReplacement), 'utf8');
  console.log('SUCCESSFULLY_UPDATED_AUTH_TS');
} else {
  console.log('TARGET_NOT_FOUND_IN_AUTH_TS');
}
