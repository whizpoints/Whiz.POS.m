import prisma from '../db.js';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { uploadAsset } from '../services/s3Service.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Use memory storage for multer to buffer the file directly to S3
const upload = multer({ storage: multer.memoryStorage() });

const authenticate = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'] || (authHeader ? authHeader.split(' ')[1] : null);

  if (!apiKey) return res.status(401).json({ error: 'Missing authorization header or API key' });

  try {
    // Try to verify as JWT (Web Portal)
    const payload = jwt.verify(apiKey, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (err) {
    // Fallback: Verify as API Key (Desktop POS)
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

// Proxy image to bypass R2 CORS on frontend canvas (PUBLIC)
router.get('/proxy-image', async (req: any, res: any) => {
  try {
    const imageUrl = req.query.url;
    if (!imageUrl) return res.status(400).send('URL required');
    
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error('Failed to fetch image');
    
    const contentType = response.headers.get('content-type') || 'image/png';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Image proxy error:', err);
    res.status(500).send('Error proxying image');
  }
});

router.use(authenticate);

// Get Business Profile
router.get('/profile', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true, email: true, logoUrl: true, documentLogoUrl: true, watermarkUrl: true, createdAt: true, settings: true, apiKey: true }
    });
    if (!business) return res.status(404).json({ error: 'Business not found' });
    res.json(business);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update Business Profile
router.post('/profile', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { name, settings, apiKey, documentLogoUrl, watermarkUrl } = req.body;
    
    let mergedSettings = settings;
    if (settings) {
      const existing = await prisma.business.findUnique({ where: { id: businessId }, select: { settings: true } });
      if (existing && existing.settings) {
        try {
          const oldSettings = typeof existing.settings === 'string' ? JSON.parse(existing.settings) : existing.settings;
          const newSettings = typeof settings === 'string' ? JSON.parse(settings) : settings;
          if (newSettings.emailAppPassword && !newSettings.emailAppPassword.includes(':')) {
             newSettings.emailAppPassword = encrypt(newSettings.emailAppPassword);
          }
          mergedSettings = JSON.stringify({ ...oldSettings, ...newSettings });
        } catch(e) {}
      }
    }

    const business = await prisma.business.update({
      where: { id: businessId },
      data: {
        ...(name && { name }),
        ...(mergedSettings && { settings: mergedSettings }),
        ...(apiKey !== undefined && { apiKey }),
        ...(documentLogoUrl !== undefined && { documentLogoUrl }),
        ...(watermarkUrl !== undefined && { watermarkUrl })
      },
      select: { id: true, name: true, settings: true, apiKey: true, documentLogoUrl: true, watermarkUrl: true }
    });
    res.json({ success: true, business });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Update Business Logo
router.post('/logo', upload.single('logo'), async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No logo file provided' });
    }

    const fileExtension = file.originalname.split('.').pop();
    const fileName = `logos/${businessId}-${Date.now()}.${fileExtension}`;

    // Upload to R2/S3
    const logoUrl = await uploadAsset(file.buffer, fileName, file.mimetype);

    // Update DB
    const updatedBusiness = await prisma.business.update({
      where: { id: businessId },
      data: { logoUrl },
      select: { id: true, name: true, logoUrl: true }
    });

    res.json({ success: true, business: updatedBusiness, logoUrl });
  } catch (error) {
    console.error('Logo upload error:', error);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

// Upload generic document asset (watermark, etc)
router.post('/document-asset', upload.single('file'), async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { assetType } = req.body; // e.g., 'watermark', 'headerImage'
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const fileExtension = file.originalname.split('.').pop();
    const fileName = `document-assets/${businessId}-${assetType}-${Date.now()}.${fileExtension}`;

    // Upload to R2/S3
    const fileUrl = await uploadAsset(file.buffer, fileName, file.mimetype);

    res.json({ success: true, fileUrl });
  } catch (error) {
    console.error('Asset upload error:', error);
    res.status(500).json({ error: 'Failed to upload asset' });
  }
});

// Get Business Locations
router.get('/locations', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const locations = await prisma.storeLocation.findMany({
      where: { businessId },
      orderBy: { createdAt: 'asc' }
    });
    res.json({ success: true, locations });
  } catch (error) {
    console.error('Fetch locations error:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});


// Create Business Location
router.post('/locations', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { name, address } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const location = await prisma.storeLocation.create({
      data: { businessId, name, address }
    });
    res.json({ success: true, location });
  } catch (error) {
    console.error('Create location error:', error);
    res.status(500).json({ error: 'Failed to create location' });
  }
});

// Update Business Location
router.put('/locations/:id', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { id } = req.params;
    const { name, address } = req.body;

    const existing = await prisma.storeLocation.findUnique({ where: { id } });
    if (!existing || existing.businessId !== businessId) return res.status(403).json({ error: 'Forbidden' });

    const location = await prisma.storeLocation.update({
      where: { id },
      data: { name, address }
    });
    res.json({ success: true, location });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Delete Business Location
router.delete('/locations/:id', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { id } = req.params;

    const existing = await prisma.storeLocation.findUnique({ where: { id } });
    if (!existing || existing.businessId !== businessId) return res.status(403).json({ error: 'Forbidden' });

    await prisma.storeLocation.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete location error:', error);
    res.status(500).json({ error: 'Failed to delete location' });
  }
});

export default router;


