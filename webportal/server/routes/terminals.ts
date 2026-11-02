import prisma from '../db.js';
import { Router } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const authenticate = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'] || (authHeader ? authHeader.split(' ')[1] : null);

  if (!apiKey) return res.status(401).json({ error: 'Missing authorization header or API key' });

  try {
    const payload: any = jwt.verify(apiKey, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (err) {
    try {
      const business = await prisma.business.findFirst({ where: { apiKey } });
      if (business) {
        req.user = { businessId: business.id };
        return next();
      }

      const storeLoc = await prisma.storeLocation.findFirst({ where: { apiKey } });
      if (storeLoc) {
        req.user = { businessId: storeLoc.businessId, locationId: storeLoc.id };
        return next();
      }
    } catch (dbErr) {}

    return res.status(401).json({ error: 'Invalid token or API key' });
  }
};

// POS Client calls this to request connection
router.post('/register', async (req: any, res: any) => {
  const { macAddress, name, apiKey, businessId: bodyBizId } = req.body;

  if (!macAddress || !name) {
    return res.status(400).json({ error: 'Missing macAddress or name' });
  }

  try {
    let resolvedBusinessId: string | null = bodyBizId || null;

    if (!resolvedBusinessId && apiKey) {
      const loc = await prisma.storeLocation.findFirst({ where: { apiKey } });
      if (loc) {
        resolvedBusinessId = loc.businessId;
      } else {
        const biz = await prisma.business.findFirst({ where: { apiKey } });
        if (biz) resolvedBusinessId = biz.id;
      }
    }

    // Upsert terminal request with businessId scope
    const terminal = await prisma.terminal.upsert({
      where: { macAddress },
      update: {
        name,
        status: 'PENDING',
        ...(resolvedBusinessId ? { businessId: resolvedBusinessId } : {})
      },
      create: {
        macAddress,
        name,
        status: 'PENDING',
        businessId: resolvedBusinessId
      }
    });

    console.log(`[LAN Discovery] Terminal registration request received from ${name} (${macAddress}) - Business: ${resolvedBusinessId}`);

    if (resolvedBusinessId) {
      try {
        req.app.get('io')?.to(`business_${resolvedBusinessId}`).emit('terminal_status_changed', {
          action: 'REGISTER',
          terminal
        });
      } catch (e) {}
    }

    res.json({ success: true, message: 'Registration requested. Waiting for admin approval.', terminalId: terminal.id });
  } catch (error: any) {
    console.error('[LAN Discovery] Registration failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin calls this from Web UI to approve terminal (Authenticated & Multi-Tenant Scoped)
router.post('/:id/approve', authenticate, async (req: any, res: any) => {
  const { id } = req.params;
  const businessId = req.user.businessId || req.user.id;

  if (!businessId) {
    return res.status(400).json({ error: 'Business account required' });
  }

  try {
    const apiKey = crypto.randomBytes(32).toString('hex');
    const terminalRequest = await prisma.terminal.findUnique({ where: { id } });
    if (!terminalRequest) return res.status(404).json({ error: 'Terminal not found' });

    // Validate multi-tenant ownership
    if (terminalRequest.businessId && terminalRequest.businessId !== businessId) {
      return res.status(403).json({ error: 'Forbidden: Terminal belongs to another business' });
    }

    const requestedLocationId = req.body?.locationId;
    let location = null;
    if (requestedLocationId && requestedLocationId !== 'ALL') {
      location = await prisma.storeLocation.findFirst({ where: { id: requestedLocationId, businessId } });
    }
    if (!location) {
      location = await prisma.storeLocation.findFirst({ where: { businessId } });
    }
    if (!location) {
      location = await prisma.storeLocation.create({
        data: {
          businessId,
          name: 'Main Store'
        }
      });
    }

    let outlet = await prisma.outlet.findFirst({
      where: { name: terminalRequest.name, businessId }
    });

    if (!outlet) {
      outlet = await prisma.outlet.create({
        data: {
          name: terminalRequest.name,
          businessId,
          locationId: location.id
        }
      });
    } else if (location && outlet.locationId !== location.id && requestedLocationId && requestedLocationId !== 'ALL') {
      outlet = await prisma.outlet.update({
        where: { id: outlet.id },
        data: { locationId: location.id }
      });
    }

    const updatedTerminal = await prisma.terminal.update({
      where: { id },
      data: {
        status: 'APPROVED',
        apiKey,
        outletId: outlet.id,
        businessId
      }
    });

    try {
      req.app.get('io')?.to(`business_${businessId}`).emit('terminal_status_changed', {
        action: 'APPROVED',
        terminal: updatedTerminal,
        outlet
      });
      req.app.get('io')?.to(`business_${businessId}`).emit('outlet_created', { outlet });
    } catch (e) {}

    res.json({ success: true, terminal: updatedTerminal, outlet });
  } catch (error: any) {
    console.error('Terminal approval error:', error);
    res.status(500).json({ error: 'Failed to approve terminal: ' + (error.message || error) });
  }
});

// Admin calls this to delete/reject a terminal or unpair edge server device
router.delete('/:id', authenticate, async (req: any, res: any) => {
  const { id } = req.params;
  const businessId = req.user.businessId;

  if (!businessId) {
    return res.status(400).json({ error: 'Business account required' });
  }

  try {
    if (id.startsWith('loc-svr-')) {
      const locId = id.replace('loc-svr-', '');
      const loc = await prisma.storeLocation.findUnique({ where: { id: locId } });
      if (loc && loc.businessId === businessId) {
        await prisma.storeLocation.update({
          where: { id: locId },
          data: { apiKey: null, pairingCode: null, pairingCodeExpiresAt: null }
        });
        if (loc.apiKey) {
          await prisma.server.deleteMany({ where: { apiKey: loc.apiKey, businessId } }).catch(() => {});
          await prisma.terminal.deleteMany({ where: { apiKey: loc.apiKey, businessId } }).catch(() => {});
        }
      }
    } else {
      // Check Terminal first
      const terminal = await prisma.terminal.findUnique({ where: { id } });
      if (terminal) {
        if (terminal.businessId && terminal.businessId !== businessId) {
          return res.status(403).json({ error: 'Forbidden' });
        }
        await prisma.terminal.delete({ where: { id } });
      } else {
        // Check Server
        const server = await prisma.server.findUnique({ where: { id } });
        if (server) {
          if (server.businessId !== businessId) {
            return res.status(403).json({ error: 'Forbidden' });
          }
          await prisma.server.delete({ where: { id } });
          if (server.apiKey) {
            await prisma.storeLocation.updateMany({
              where: { apiKey: server.apiKey, businessId },
              data: { apiKey: null, pairingCode: null }
            }).catch(() => {});
          }
        }
      }
    }

    try {
      req.app.get('io')?.to(`business_${businessId}`).emit('terminal_status_changed', {
        action: 'DELETED',
        id
      });
    } catch (e) {}

    res.json({ success: true, message: 'Device removed' });
  } catch (error: any) {
    console.error('Terminal delete error:', error);
    res.status(500).json({ error: 'Failed to delete device: ' + (error.message || error) });
  }
});

// Admin calls this to get terminals and edge server devices strictly for their business
router.get('/', authenticate, async (req: any, res: any) => {
  try {
    const businessId = req.user.businessId;

    if (!businessId) {
      return res.status(400).json({ error: 'Business account required' });
    }

    const [terminals, servers, locations] = await Promise.all([
      prisma.terminal.findMany({
        where: { businessId },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.server.findMany({
        where: { businessId },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.storeLocation.findMany({
        where: { businessId, apiKey: { not: null } }
      })
    ]);

    const deviceList: any[] = [...terminals];

    // Merge registered Server appliances into the device list if not already present
    for (const s of servers) {
      const alreadyListed = deviceList.some(d => d.apiKey === s.apiKey || d.name === s.name);
      if (!alreadyListed) {
        deviceList.push({
          id: s.id,
          name: s.name || 'Local Edge Server Appliance',
          macAddress: s.apiKey ? `SVR-${s.apiKey.slice(0, 8).toUpperCase()}` : 'LOCAL-EDGE-NODE',
          status: s.status === 'ONLINE' ? 'APPROVED' : (s.status || 'APPROVED'),
          deviceType: 'EDGE_SERVER',
          createdAt: s.createdAt,
          updatedAt: s.updatedAt || s.lastHeartbeat
        });
      }
    }

    // Merge active paired StoreLocations for THIS business
    for (const loc of locations) {
      if (loc.apiKey) {
        const alreadyListed = deviceList.some(d => d.apiKey === loc.apiKey || (d.macAddress && d.macAddress.includes(loc.apiKey.slice(0, 6).toUpperCase())));
        if (!alreadyListed) {
          deviceList.push({
            id: `loc-svr-${loc.id}`,
            name: `${loc.name} Edge Appliance`,
            macAddress: `SVR-${loc.apiKey.slice(0, 8).toUpperCase()}`,
            status: 'APPROVED',
            deviceType: 'EDGE_SERVER',
            createdAt: loc.createdAt,
            updatedAt: loc.updatedAt
          });
        }
      }
    }

    res.json(deviceList);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch terminals: ' + (error.message || error) });
  }
});

export default router;
