import { Router } from 'express';
import multer from 'multer';
import { uploadAsset } from '../services/s3Service.js';

const router = Router();

// Configure multer for file uploads (no strict file limits so we can upload .exe)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 150 * 1024 * 1024 // 150MB max size for .exe files
  }
});

// 1. Upload Route: Use this to upload your .exe file to R2
router.post('/upload', upload.single('file'), async (req: any, res: any) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // You can optionally require authentication here if needed
    // const { businessId } = req.user;

    const originalName = file.originalname.replace(/\s+/g, '-');
    const fileName = `downloads/${Date.now()}-${originalName}`;

    // Upload to R2/S3
    await uploadAsset(file.buffer, fileName, file.mimetype || 'application/octet-stream');

    // Generate the obfuscated share link
    // e.g. https://api.whizpoint.app/api/downloads/share/downloads/12345-WhizPOS-Server.exe
    const host = req.protocol + '://' + req.get('host');
    const secureHost = host.includes('localhost') ? 'https://api.whizpoint.app' : host;
    
    const shareLink = `${secureHost}/api/downloads/share/${fileName}`;

    res.json({ 
      success: true, 
      message: 'File uploaded successfully to R2.',
      shareLink: shareLink
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// 2. Redirect Route: This handles the obfuscated link and redirects to the hidden R2 bucket URL
router.get('/share/:dir/:file', async (req, res) => {
  try {
    const fileName = `${req.params.dir}/${req.params.file}`;  
    if (!fileName) {
      return res.status(404).send('File not found');
    }

    const publicUrl = process.env.S3_PUBLIC_URL;
    if (!publicUrl) throw new Error("S3_PUBLIC_URL is not set");

    const directR2Link = `${publicUrl.replace(/\/$/, '')}/${fileName}`;

    // Redirect the user to the actual R2 download link
    res.redirect(directR2Link);
  } catch (error) {
    console.error('Share link redirect error:', error);
    res.status(500).send('Failed to process download link');
  }
});

export default router;
