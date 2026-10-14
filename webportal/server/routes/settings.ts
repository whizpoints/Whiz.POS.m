import prisma from '../db.js';
import { Router } from 'express';
import { encrypt } from '../utils/crypto.js';

const router = Router();

// Get M-Pesa config
router.get('/mpesa', async (req: any, res: any) => {
  try {
    const businessId = req.query.businessId as string || 'default-business-id';
    const locationId = req.query.locationId as string | undefined;
    
    const config = await prisma.mpesaConfig.findFirst({
      where: locationId ? { businessId, locationId } : { businessId }
    });
    
    if (config) {
      // Don't send the real password back to the frontend, just a boolean indicator if it exists
      const configToReturn = { ...config, initiatorPassword: config.initiatorPassword ? true : false, hasCertificate: !!config.certificateBase64 };
      return res.json(configToReturn);
    }
    
    res.json(null);
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
      merchantType, tillNumber, paybillNumber, accountReference, stkEnabled, c2bEnabled,
      initiatorName, initiatorPassword
    } = req.body;
    
    const updateData: any = {
      consumerKey,
      consumerSecret,
      passkey,
      shortcode,
      environment,
      merchantType,
      tillNumber,
      paybillNumber,
      accountReference,
      initiatorName,
      stkEnabled: stkEnabled ?? true,
      c2bEnabled: c2bEnabled ?? true
    };

    if (initiatorPassword && initiatorPassword !== '********') {
      updateData.initiatorPassword = encrypt(initiatorPassword);
    }
    
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
