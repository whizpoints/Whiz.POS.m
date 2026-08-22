import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import prisma from '../prisma.js';
import crypto from 'crypto';

const router = Router();
// const prisma = new PrismaClient();

// POS Client calls this to request connection
router.post('/register', async (req, res) => {
  const { macAddress, name } = req.body;

  if (!macAddress || !name) {
    return res.status(400).json({ error: 'Missing macAddress or name' });
  }

  try {
    // Upsert terminal request
    const terminal = await prisma.terminal.upsert({
      where: { macAddress },
      update: { name, status: 'PENDING' },
      create: { macAddress, name, status: 'PENDING' }
    });

    console.log(`[LAN Discovery] Terminal registration request received from ${name} (${macAddress})`);
    res.json({ success: true, message: 'Registration requested. Waiting for admin approval.', terminalId: terminal.id });
  } catch (error: any) {
    console.error('[LAN Discovery] Registration failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin calls this from Web UI to approve terminal
router.post('/:id/approve', async (req, res) => {
  const { id } = req.params;

  try {
    const terminalRequest = await prisma.terminal.findUnique({ where: { id } });
    if (!terminalRequest) return res.status(404).json({ error: 'Terminal not found' });

    // Find primary business and location
    const business = await prisma.business.findFirst();
    const location = await prisma.storeLocation.findFirst();

    if (!business || !location) {
      return res.status(400).json({ error: 'Business or Location not setup yet' });
    }

    const apiKey = crypto.randomBytes(32).toString('hex');

    // Find if outlet already exists for this terminal name
    let outlet = await prisma.outlet.findFirst({
      where: { name: terminalRequest.name, businessId: business.id }
    });

    if (!outlet) {
      outlet = await prisma.outlet.create({
        data: {
          name: terminalRequest.name,
          businessId: business.id,
          locationId: location.id
        }
      });
    }

    const updatedTerminal = await prisma.terminal.update({
      where: { id },
      data: { status: 'APPROVED', apiKey, outletId: outlet.id }
    });

    res.json({ success: true, terminal: updatedTerminal, outlet });
  } catch (error: any) {
    console.error('Approve error:', error);
    res.status(500).json({ error: 'Failed to approve terminal' });
  }
});

// Admin calls this to get all terminals
router.get('/', async (req, res) => {
  try {
    const terminals = await prisma.terminal.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(terminals);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch terminals' });
  }
});

// Admin calls this from Web UI to reject terminal
router.post('/:id/reject', async (req, res) => {
  const { id } = req.params;
  try {
    const terminal = await prisma.terminal.update({
      where: { id },
      data: { status: 'REJECTED' }
    });
    res.json({ success: true, terminal });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reject terminal' });
  }
});

// POS polls this to check approval status
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const terminal = await prisma.terminal.findUnique({
      where: { id }
    });
    if (!terminal) return res.status(404).json({ error: 'Terminal not found' });
    res.json(terminal);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch terminal status' });
  }
});

// Admin calls this from Web UI to completely delete a terminal
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const terminal = await prisma.terminal.findUnique({ where: { id } });
    if (terminal) {
      // Find and delete the associated outlet
      const outlet = await prisma.outlet.findFirst({
        where: { name: terminal.name, businessId: (terminal as any).businessId }
      });
      
      if (outlet) {
        await prisma.outlet.delete({ where: { id: outlet.id } });
      }
      
      await prisma.terminal.delete({
        where: { id }
      });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete terminal' });
  }
});

export default router;

