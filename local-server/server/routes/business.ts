import { Router } from 'express';
import db from '../db.js';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { uploadAsset } from '../services/s3Service.js';

import { encrypt, decrypt } from '../utils/crypto.js';
const router = Router();
// const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Use memory storage for multer to buffer the file directly to S3
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir)
  },
  filename: function (req, file, cb) {
    const businessId = (req as any).user?.businessId || 'unknown';
    const ext = file.originalname.split('.').pop();
    cb(null, `${businessId}-${Date.now()}.${ext}`)
  }
});
const upload = multer({ storage: storage });

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
      const business = await db.selectFrom('Business').selectAll().where('apiKey', '=', apiKey).executeTakeFirst();
      if (business) {
        req.user = { businessId: business.id };
        return next();
      }
    } catch (dbErr) {}
    
    return res.status(401).json({ error: 'Invalid token or API key' });
  }
};

// Check if setup is complete
router.get('/setup-status', async (req: any, res: any) => {
  try {
    const business = await db.selectFrom('Business').selectAll().executeTakeFirst();
    res.json({ isSetup: !!business, business });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.use(authenticate);

// Get Business Profile
router.get('/profile', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const business = await db.selectFrom('Business').select(['id', 'name', 'email', 'logoUrl', 'createdAt', 'settings', 'apiKey']).where('id', '=', businessId).executeTakeFirst();
    if (!business) return res.status(404).json({ error: 'Business not found' });
    
    let parsedSettings = {};
    try {
      if (business.settings && typeof business.settings === 'string') {
        parsedSettings = JSON.parse(business.settings);
      } else if (business.settings && typeof business.settings === 'object') {
        parsedSettings = business.settings;
      }
    } catch (e) {}
    
    res.json({ ...business, settings: parsedSettings });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update Business Profile
router.post('/profile', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { name, settings, apiKey } = req.body;
        // Defensively ensure settings is a string since Prisma schema defines it as String
      let finalSettings = settings;
      if (settings && typeof settings === 'object') {
        // Clean up any corrupted keys caused by previous string spreading bugs
        const cleanedSettings: any = {};
        for (const [key, value] of Object.entries(settings)) {
           if (!/^\d+$/.test(key)) {
              cleanedSettings[key] = value;
           }
        }
        if (cleanedSettings.emailAppPassword && !cleanedSettings.emailAppPassword.includes(':')) {
           cleanedSettings.emailAppPassword = encrypt(cleanedSettings.emailAppPassword);
        }
        finalSettings = JSON.stringify(cleanedSettings);
      }

    let updateData: any = {};
    if (name) updateData.name = name;
    if (finalSettings !== undefined) updateData.settings = finalSettings;
    if (apiKey !== undefined) updateData.apiKey = apiKey;
    const business = Object.keys(updateData).length > 0 
      ? await db.updateTable('Business').set(updateData).where('id', '=', businessId).returning(['id', 'name', 'settings', 'apiKey']).executeTakeFirstOrThrow()
      : await db.selectFrom('Business').select(['id', 'name', 'settings', 'apiKey']).where('id', '=', businessId).executeTakeFirst();
    if (business && business.settings) {
      const settingsObj = typeof business.settings === 'string' ? JSON.parse(business.settings) : business.settings;
      if (settingsObj.emailAppPassword) {
        settingsObj.emailAppPassword = '��������';
        business.settings = JSON.stringify(settingsObj);
      }
    }
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

    const logoUrl = `http://localhost:${process.env.PORT || 5050}/uploads/${req.file.filename}`;

    // Update DB
    const updatedBusiness = await db.updateTable('Business').set({ logoUrl }).where('id', '=', businessId).returning(['id', 'name', 'logoUrl']).executeTakeFirstOrThrow();

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

    const fileUrl = `http://localhost:${process.env.PORT || 5050}/uploads/${req.file.filename}`;

    res.json({ success: true, fileUrl });
  } catch (error) {
    console.error('Asset upload error:', error);
    res.status(500).json({ error: 'Failed to upload asset' });
  }
});

  // Export Data Backup
  router.get('/backup', async (req: any, res: any) => {
    try {
      const { businessId } = req.user;
      
      const business = await db.selectFrom('Business').selectAll().where('id', '=', businessId).executeTakeFirst();
      if (!business) return res.status(404).json({ error: 'Business not found' });
      
      const categories = await db.selectFrom('Category').selectAll().where('businessId', '=', businessId).execute();
      const products = await db.selectFrom('Product').selectAll().where('businessId', '=', businessId).execute();
      const users = await db.selectFrom('User').selectAll().where('businessId', '=', businessId).execute();
      const customers = await db.selectFrom('Customer').selectAll().where('businessId', '=', businessId).execute();
      
      // Clean up sensitive/irrelevant data for export
      const cleanUsers = users.map(u => ({ ...u, id: undefined, businessId: undefined, locationId: null, outletId: null, createdAt: undefined, updatedAt: undefined }));
      const cleanCategories = categories.map(c => ({ id: c.id, name: c.name }));
      const cleanProducts = products.map(p => ({ id: p.id, sku: p.sku, barcode: p.barcode, name: p.name, category: p.category, price: p.price, costPrice: p.costPrice, taxRate: p.taxRate, reorderLevel: p.reorderLevel }));
      const cleanCustomers = customers.map(c => ({ id: c.id, name: c.name, phone: c.phone, email: c.email, loyaltyPoints: c.loyaltyPoints, totalSpent: c.totalSpent }));

      const backupData = {
        version: "1.0",
        type: "whiz-local-backup",
        timestamp: new Date().toISOString(),
        data: {
          settings: business.settings,
          categories: cleanCategories,
          products: cleanProducts,
          users: cleanUsers,
          customers: cleanCustomers
        }
      };

      res.json(backupData);
    } catch (error) {
      console.error('Backup error:', error);
      res.status(500).json({ error: 'Failed to generate backup' });
    }
  });

  // Restore Data Backup
  router.post('/restore', async (req: any, res: any) => {
    try {
      const { businessId } = req.user;
      const { backup } = req.body;
      
      if (!backup || backup.type !== 'whiz-local-backup' || !backup.data) {
        return res.status(400).json({ error: 'Invalid backup file format' });
      }

      const { settings, categories, products, users, customers } = backup.data;

      // 1. Restore Settings
      if (settings) {
        let currentBusiness = await db.selectFrom('Business').selectAll().where('id', '=', businessId).executeTakeFirst();
        let currentSettings = typeof currentBusiness?.settings === 'string' ? JSON.parse(currentBusiness.settings) : (currentBusiness?.settings || {});
        let newSettings = typeof settings === 'string' ? JSON.parse(settings) : settings;
        
        // Preserve API keys when merging settings
        const mergedSettings = { ...newSettings, backOfficeApiKey: currentSettings.backOfficeApiKey, backOfficeUrl: currentSettings.backOfficeUrl, cloudBusinessId: currentSettings.cloudBusinessId, locationId: currentSettings.locationId };
        
        await db.updateTable('Business').set({ settings: JSON.stringify(mergedSettings) }).where('id', '=', businessId).execute();
      }

      // 2. Restore Categories
      if (categories && categories.length > 0) {
        for (const cat of categories) {
          const existingCat = await db.selectFrom('Category').selectAll().where('id', '=', cat.id).executeTakeFirst();
          if (existingCat) {
            await db.updateTable('Category').set({ name: cat.name, businessId }).where('id', '=', cat.id).execute();
          } else {
            await db.insertInto('Category').values({ id: cat.id, name: cat.name, businessId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).execute();
          }
        }
      }

      // 3. Restore Products
      if (products && products.length > 0) {
        for (const p of products) {
          const existingProd = await db.selectFrom('Product').selectAll().where('id', '=', p.id).executeTakeFirst();
          if (existingProd) {
            await db.updateTable('Product').set({ sku: p.sku, barcode: p.barcode, name: p.name, category: p.category, price: p.price, costPrice: p.costPrice, taxRate: p.taxRate, reorderLevel: p.reorderLevel, businessId }).where('id', '=', p.id).execute();
          } else {
            await db.insertInto('Product').values({ id: p.id, sku: p.sku, barcode: p.barcode, name: p.name, category: p.category, price: p.price, costPrice: p.costPrice, taxRate: p.taxRate, reorderLevel: p.reorderLevel, businessId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).execute();
          }
        }
      }

      // 4. Restore Users (match by email to avoid unique constraint errors, don't update password if exists)
      if (users && users.length > 0) {
        for (const u of users) {
          const existing = await db.selectFrom('User').selectAll().where('email', '=', u.email).executeTakeFirst();
          if (existing) {
            await db.updateTable('User').set({ name: u.name, role: u.role, pin: u.pin, businessId }).where('email', '=', u.email).execute();
          } else {
            await db.insertInto('User').values({ id: randomUUID(), email: u.email, name: u.name, role: u.role, pin: u.pin, password: u.password, businessId, locationId: null, outletId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).execute();
          }
        }
      }

      // 5. Restore Customers
      if (customers && customers.length > 0) {
        for (const c of customers) {
          const existingCust = await db.selectFrom('Customer').selectAll().where('id', '=', c.id).executeTakeFirst();
          if (existingCust) {
            await db.updateTable('Customer').set({ name: c.name, phone: c.phone, email: c.email, loyaltyPoints: c.loyaltyPoints, totalSpent: c.totalSpent, businessId }).where('id', '=', c.id).execute();
          } else {
            await db.insertInto('Customer').values({ id: c.id, name: c.name, phone: c.phone, email: c.email, loyaltyPoints: c.loyaltyPoints, totalSpent: c.totalSpent, businessId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).execute();
          }
        }
      }

      res.json({ success: true, message: 'Backup restored successfully' });
    } catch (error) {
      console.error('Restore error:', error);
      res.status(500).json({ error: 'Failed to restore backup' });
    }
  });

// Get Business Locations
router.get('/locations', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const locations = await db.selectFrom('StoreLocation').selectAll().where('businessId', '=', businessId).orderBy('createdAt', 'asc').execute();
    res.json({ success: true, locations });
  } catch (error) {
    console.error('Fetch locations error:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

export default router;




