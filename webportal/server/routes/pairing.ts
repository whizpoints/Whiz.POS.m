import { Router } from 'express';
import prisma from '../db.js';
import crypto from 'crypto';

const router = Router();

// 1. Local Server requests a new pairing session
router.post('/request', async (req, res) => {
  try {
    const { deviceInfo, type } = req.body;
    
    // Expires in 15 minutes
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    const pairingReq = await prisma.pairingRequest.create({
      data: {
        type: type || 'SERVER',
        status: 'PENDING',
        deviceInfo: deviceInfo || {},
        expiresAt
      }
    });

    res.json({ success: true, requestId: pairingReq.id, expiresAt });
  } catch (err) {
    console.error('Pairing request error:', err);
    res.status(500).json({ error: 'Failed to generate pairing request' });
  }
});

// 2. Web Portal frontend fetches request details
router.get('/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const pairingReq = await prisma.pairingRequest.findUnique({ where: { id: requestId } });

    if (!pairingReq) return res.status(404).json({ error: 'Request not found' });
    if (new Date() > pairingReq.expiresAt) return res.status(400).json({ error: 'Request expired' });
    
    res.json({ success: true, request: pairingReq });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});

// 3. Web Portal user approves the request (Requires Authentication Middleware in production)
router.post('/:requestId/approve', async (req: any, res: any) => {
  try {
    const { requestId } = req.params;
    const { businessId, locationId, serverName } = req.body; // Provided by user in UI

    const pairingReq = await prisma.pairingRequest.findUnique({ where: { id: requestId } });
    
    if (!pairingReq) return res.status(404).json({ error: 'Request not found' });
    if (new Date() > pairingReq.expiresAt) return res.status(400).json({ error: 'Request expired' });
    if (pairingReq.status !== 'PENDING') return res.status(400).json({ error: 'Request already processed' });

    // Ensure business exists
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) return res.status(404).json({ error: 'Business not found' });

    let serverId = null;
    let apiKey = crypto.randomBytes(32).toString('hex');

    if (pairingReq.type === 'SERVER') {
      // Create a Server record
      const newServer = await prisma.server.create({
        data: {
          businessId,
          name: serverName || 'WHIZPOS Server',
          status: 'ONLINE',
          apiKey,
          lastHeartbeat: new Date()
        }
      });
      serverId = newServer.id;

      // Assign server to the selected branch by updating StoreLocation apiKey
      if (locationId) {
        await prisma.storeLocation.update({
          where: { id: locationId },
          data: { apiKey }
        });
      }
    }

    // Update pairing request with approval info
    await prisma.pairingRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        businessId,
        outletId: locationId || null, // For backward compatibility with status polling
        serverId,
        apiKey
      }
    });

    res.json({ success: true, message: 'Request approved' });
  } catch (err) {
    console.error('Approve pairing error:', err);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

// 4. Local Server polls for status
router.get('/:requestId/status', async (req, res) => {
  try {
    const { requestId } = req.params;
    const pairingReq = await prisma.pairingRequest.findUnique({ where: { id: requestId } });

    if (!pairingReq) return res.status(404).json({ error: 'Request not found' });

    if (pairingReq.status === 'APPROVED') {
      // Invalidate it so it can't be fetched again
      await prisma.pairingRequest.update({
        where: { id: requestId },
        data: { status: 'CONSUMED' }
      });

      let businessName = 'Business';
      let locationName = 'Branch';
      if (pairingReq.businessId) {
         const b = await prisma.business.findUnique({ where: { id: pairingReq.businessId } });
         if (b) businessName = b.name;
      }
      if (pairingReq.outletId) {
         const l = await prisma.storeLocation.findUnique({ where: { id: pairingReq.outletId } });
         if (l) locationName = l.name;
      }

      return res.json({
        success: true,
        status: 'APPROVED',
        credentials: {
          businessId: pairingReq.businessId,
          outletId: pairingReq.outletId,
          serverId: pairingReq.serverId,
          apiKey: pairingReq.apiKey,
          businessName,
          locationName
        }
      });
    }

    res.json({ success: true, status: pairingReq.status });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check status' });
  }
});

export default router;

