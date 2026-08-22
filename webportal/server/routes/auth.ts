import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_SERVER || 'smtp-relay.brevo.com',
  port: parseInt(process.env.BREVO_SMTP_PORT || '587'),
  auth: {
    user: process.env.BREVO_SMTP_LOGIN,
    pass: process.env.BREVO_SMTP_KEY,
  },
});

// Admin / Business Registration
router.post('/register', async (req, res) => {
  try {
    const { 
      businessName, email, password, kraPin, businessInfo, address, phone,
      apiKey, servedBy, receiptFooter, printerType, mpesaPaybill, mpesaTill, mpesaAccount
    } = req.body;

    const existingBusiness = await prisma.business.findUnique({ where: { email } });
    if (existingBusiness) {
      return res.status(400).json({ error: 'Business email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const settings = JSON.stringify({ 
      phone: phone || '', 
      businessInfo: businessInfo || '',
      servedBy: servedBy || 'Cashier',
      receiptFooter: receiptFooter || 'Thank you for your business!',
      printerType: printerType || 'thermal',
      mpesaPaybill: mpesaPaybill || '',
      mpesaTill: mpesaTill || '',
      mpesaAccount: mpesaAccount || ''
    });

    const business = await prisma.business.create({
      data: {
        name: businessName,
        email,
        kraPin: kraPin || null,
        settings,
        verificationToken,
        emailVerified: false,
        setupComplete: true,
        apiKey: apiKey || crypto.randomBytes(32).toString('hex'),
        users: {
          create: {
            email,
            password: hashedPassword,
            name: 'Admin',
            role: 'ADMIN'
          }
        },
        locations: {
          create: {
            name: 'Main Store',
            address: address || 'Local Setup'
          }
        }
      },
      include: { users: true }
    });

    const user = business.users[0];
    const token = jwt.sign({ userId: user.id, businessId: business.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    // Send verification email
    const frontendUrl = process.env.CORS_ORIGINS?.split(',')[0] || 'http://localhost:5173';
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:5050';
    const verifyLink = `${protocol}://${host}/api/auth/verify-email?token=${verificationToken}`;
    
    try {
      await transporter.sendMail({
        from: '"Whiz POS" <noreply@whizpoint.app>',
        to: email,
        subject: 'Verify your Whiz POS Account',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4f46e5;">Welcome to Whiz POS!</h2>
            <p>Hi there,</p>
            <p>Thank you for registering <strong>${businessName}</strong>. To get started and access your dashboard, please verify your email address by clicking the link below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Verify Email Address</a>
            </div>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6b7280; font-size: 14px;">${verifyLink}</p>
            <p>Best regards,<br>The Whiz POS Team</p>
          </div>
        `
      });
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr);
      // We still proceed, but the user will have to request a resend later
    }

    res.json({ token, business, user: { id: user.id, name: user.name, role: user.role, businessId: user.businessId } });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify Email (Clicked from email client)
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).send('Invalid token');
    }

    const business = await prisma.business.findFirst({ where: { verificationToken: token } });
    if (!business) {
      return res.status(400).send('Invalid or expired token');
    }

    await prisma.business.update({
      where: { id: business.id },
      data: { emailVerified: true, verificationToken: null }
    });

    // Redirect user back to the onboarding page
    const frontendUrl = process.env.CORS_ORIGINS?.split(',')[0] || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/onboarding`);
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).send('Internal server error');
  }
});

// Check Verification Status (Polled by frontend)
router.get('/verify-status', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    const business = await prisma.business.findUnique({ where: { id: decoded.businessId } });
    if (!business) return res.status(404).json({ error: 'Business not found' });

    res.json({ emailVerified: business.emailVerified });
  } catch (error) {
    console.error('Verify status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resend Verification Email
router.post('/resend-verification', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    const business = await prisma.business.findUnique({ where: { id: decoded.businessId } });
    if (!business) return res.status(404).json({ error: 'Business not found' });
    if (business.emailVerified) return res.status(400).json({ error: 'Already verified' });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    await prisma.business.update({
      where: { id: business.id },
      data: { verificationToken }
    });

    const fromName = process.env.BREVO_FROM_NAME || 'Whiz POS';
    const fromEmail = process.env.BREVO_FROM_EMAIL || 'support@whizpoint.app';
    const baseUrl = process.env.VITE_API_BASE_URL || 'https://api.whizpoint.app';

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: business.email,
      subject: 'Verify your Whiz POS account',
      html: `<p>Welcome to Whiz POS!</p>
             <p>Please verify your email by clicking the link below:</p>
             <a href="${baseUrl}/api/auth/verify-email?token=${verificationToken}">Verify Email</a>`
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Setup Onboarding
router.post('/setup', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    const { businessName, kraPin } = req.body;
    const apiKey = crypto.randomBytes(32).toString('hex');

    const business = await prisma.business.update({
      where: { id: decoded.businessId },
      data: {
        name: businessName,
        kraPin,
        setupComplete: true,
        apiKey
      }
    });

    res.json({ success: true, business, apiKey });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email }, include: { business: true } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, businessId: user.businessId, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: user.id, name: user.name, role: user.role, businessId: user.businessId }, business: user.business });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify API Key (For POS Desktop App Linking)
router.post('/verify-api-key', async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: 'API Key is required' });
    }

    const business = await prisma.business.findFirst({
      where: { apiKey },
      include: {
        users: {
          where: { role: 'ADMIN' },
          take: 1
        }
      }
    });

    if (!business) {
      return res.status(401).json({ error: 'Invalid API Key' });
    }

    // Return the business context so the POS can auto-configure
    res.json({
      success: true,
      business: {
        id: business.id,
        name: business.name,
        kraPin: business.kraPin,
        adminEmail: business.users[0]?.email
      }
    });
  } catch (error) {
    console.error('Verify API Key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

  // Generate 2FA Pairing Code
  router.post('/generate-pairing-code', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
      
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as any;
  
      const pairingCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code
      
      await prisma.business.update({
        where: { id: decoded.businessId },
        data: { pairingCode }
      });
  
      res.json({ success: true, pairingCode });
    } catch (error) {
      console.error('Generate pairing code error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Confirm Pairing Code
  router.post('/confirm-pairing', async (req, res) => {
    try {
      const { apiKey, pairingCode } = req.body;
      if (!apiKey || !pairingCode) {
        return res.status(400).json({ error: 'API Key and Pairing Code are required' });
      }

      const business = await prisma.business.findFirst({
        where: { apiKey, pairingCode }
      });

      if (!business) {
        return res.status(401).json({ error: 'Invalid pairing code or API key' });
      }

      // Optionally wipe the pairing code so it's one-time use
      await prisma.business.update({
        where: { id: business.id },
        data: { pairingCode: null }
      });

      res.json({ success: true, businessId: business.id });
    } catch (error) {
      console.error('Confirm pairing error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

export default router;
