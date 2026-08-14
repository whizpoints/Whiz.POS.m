import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import prisma from '../prisma.js';

const router = Router();
// const prisma = new PrismaClient();

// Get M-Pesa config
router.get('/mpesa', async (req: any, res: any) => {
  try {
    const businessId = req.query.businessId as string || 'default-business-id';
    const locationId = req.query.locationId as string | undefined;
    
    const config = await prisma.mpesaConfig.findFirst({
      where: locationId ? { businessId, locationId } : { businessId }
    });
    
    res.json(config || null);
  } catch (error) {
    console.error('Error fetching M-Pesa config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update M-Pesa config
router.post('/mpesa', async (req: any, res: any) => {
  try {
    const businessId = req.query.businessId as string || 'default-business-id';
    const { 
      consumerKey, consumerSecret, passkey, shortcode, environment,
      merchantType, tillNumber, paybillNumber, accountReference, stkEnabled, c2bEnabled 
    } = req.body;
    
    const updateData = {
      consumerKey,
      consumerSecret,
      passkey,
      shortcode,
      environment,
      merchantType,
      tillNumber,
      paybillNumber,
      accountReference,
      stkEnabled: stkEnabled ?? true,
      c2bEnabled: c2bEnabled ?? true
    };
    
    const locationId = req.query.locationId as string | undefined;
    
    let config = await prisma.mpesaConfig.findFirst({
      where: locationId ? { businessId, locationId } : { businessId }
    });
    
    if (config) {
       config = await prisma.mpesaConfig.update({
          where: { id: config.id },
          data: updateData
       });
    } else {
       config = await prisma.mpesaConfig.create({
          data: {
             businessId,
             locationId: locationId || undefined,
             ...updateData
          }
       });
    }
    
    res.json({ success: true, config });
  } catch (error) {
    console.error('Error saving M-Pesa config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

