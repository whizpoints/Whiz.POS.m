import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { validatePassword } from '../utils/security.js';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const smtpPort = parseInt(process.env.BREVO_SMTP_PORT || '465');
const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_SERVER || 'smtp-relay.brevo.com',
  port: smtpPort,
  secure: smtpPort === 465, // Use true for 465 (SSL/TLS), false for 587/2525 (STARTTLS)
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

    const passwordValidation = validatePassword(password, businessName);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.message });
    }

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
    const token = jwt.sign({ userId: user.id, businessId: business.id, role: user.role }, JWT_SECRET, { expiresIn: '3h' });

    // Send verification email
    const frontendUrl = req.headers.origin || process.env.CORS_ORIGINS?.split(',')[0] || 'https://backoffice.whizpoint.app';
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
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
      const isDev = host.includes('localhost');
      const frontendUrl = isDev ? 'http://localhost:5173' : `${protocol}://${host}`;
      return res.redirect(`${frontendUrl}/verify-email?status=used`);
    }

    await prisma.business.update({
      where: { id: business.id },
      data: { emailVerified: true, verificationToken: null }
    });

    // Redirect user back to the onboarding page
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
    const isDev = host.includes('localhost');
    const frontendUrl = isDev ? 'http://localhost:5173' : `${protocol}://${host}`;
    
    res.redirect(`${frontendUrl}/dashboard`);
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
    let decoded: any; try { decoded = jwt.verify(token, JWT_SECRET); } catch (err) { return res.status(401).json({ error: "Invalid token" }); }

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
    let decoded: any; try { decoded = jwt.verify(token, JWT_SECRET); } catch (err) { return res.status(401).json({ error: "Invalid token" }); }

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
    const baseUrl = process.env.VITE_API_BASE_URL || (req.headers.origin || 'https://backoffice.whizpoint.app');

    try {
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: business.email,
        subject: 'Verify your Whiz POS account',
        html: `<p>Welcome to Whiz POS!</p>
               <p>Please verify your email by clicking the link below:</p>
               <a href="${baseUrl}/api/auth/verify-email?token=${verificationToken}">Verify Email</a>`
      });
    } catch (emailErr) {
      console.error('SMTP Error:', emailErr);
      return res.status(500).json({ error: 'Email service not configured correctly. Please check SMTP settings.' });
    }

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
    let decoded: any; try { decoded = jwt.verify(token, JWT_SECRET); } catch (err) { return res.status(401).json({ error: "Invalid token" }); }

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

    if (!password || password.length < 8) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = await prisma.user.findUnique({ where: { email }, include: { business: true } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, businessId: user.businessId, role: user.role }, JWT_SECRET, { expiresIn: '3h' });

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
    if (!apiKey) return res.status(400).json({ error: 'API Key is required' });

    // Look for StoreLocation with this API Key
    const location = await prisma.storeLocation.findUnique({
      where: { apiKey },
      include: {
        business: {
          include: { users: { where: { role: 'ADMIN' }, take: 1 } }
        }
      }
    });

    if (!location) {
      return res.status(401).json({ error: 'Invalid Location API Key' });
    }

    res.json({
      success: true,
      business: {
        id: location.business.id,
        name: location.business.name,
        locationName: location.name,
        adminEmail: location.business.users[0]?.email,
        lastLogin: location.business.users[0]?.updatedAt
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to verify API key' });
  }
});

  // Generate 2FA Pairing Code for a Specific Location
  router.post('/generate-pairing-code', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
      
      const token = authHeader.split(' ')[1];
      let decoded: any;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      const { locationId } = req.body;
      if (!locationId) return res.status(400).json({ error: 'Location ID required' });
  
      const pairingCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
      
      const existing = await prisma.storeLocation.findUnique({ where: { id: locationId } });
    if (!existing || existing.businessId !== decoded.businessId) return res.status(403).json({ error: 'Forbidden' });
    
    const loc = await prisma.storeLocation.update({
      where: { id: locationId },
      data: { 
        pairingCode,
        pairingCodeExpiresAt: expiresAt,
        apiKey: existing.apiKey || crypto.randomBytes(32).toString('hex')
      }
    });
  
      res.json({ success: true, pairingCode, apiKey: loc.apiKey });
    } catch (error) {
      console.error('generate-pairing-code error:', error); res.status(500).json({ error: 'Failed to generate pairing code: ' + (error.message || String(error)) });
    }
  });

  // Validate Pairing Code (Unauthenticated - from Local Server)
  router.post('/validate-pairing', async (req, res) => {
    try {
      const { apiKey, pairingCode } = req.body;
      if (!apiKey || !pairingCode) return res.status(400).json({ error: 'Missing credentials' });

      const location = await prisma.storeLocation.findUnique({ 
        where: { apiKey },
        include: { business: true }
      });

      if (!location || location.pairingCode !== pairingCode) {
        return res.status(401).json({ error: 'Invalid API Key or Pairing Code' });
      }

      if (location.pairingCodeExpiresAt && new Date() > location.pairingCodeExpiresAt) {
        return res.status(401).json({ error: 'Pairing Code has expired' });
      }

      res.json({ 
        success: true, 
        businessId: location.businessId,
        locationId: location.id,
        businessName: location.business.name,
        locationName: location.name,
        email: location.business.email
      });
    } catch (error) {
      res.status(500).json({ error: 'Validation failed' });
    }
  });

  // Confirm and Burn Pairing Code (Unauthenticated - from Local Server)
  router.post('/confirm-pairing', async (req, res) => {
    try {
      const { apiKey, pairingCode } = req.body;
      
      const location = await prisma.storeLocation.findUnique({ where: { apiKey } });
      if (!location || location.pairingCode !== pairingCode) {
        return res.status(401).json({ error: 'Invalid handshake' });
      }

      // Burn the pairing code
      await prisma.storeLocation.update({
        where: { apiKey },
        data: { pairingCode: null, pairingCodeExpiresAt: null }
      });

      res.json({ success: true, message: 'Handshake complete' });
    } catch (error) {
      res.status(500).json({ error: 'Confirmation failed' });
    }
  });


// ==================== GOOGLE OAUTH ====================
router.get('/google', (req, res) => {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = req.hostname.includes('localhost') 
    ? 'http://localhost:5050/api/auth/google/callback' 
    : (req.hostname === 'api.whizpoint.app' ? 'https://api.whizpoint.app/api/auth/google/callback' : 'https://backoffice.whizpoint.app/api/auth/google/callback');
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email%20profile`;
  res.redirect(authUrl);
});

router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).send('No code provided');

    const redirectUri = req.hostname.includes('localhost') 
      ? 'http://localhost:5050/api/auth/google/callback' 
      : (req.hostname === 'api.whizpoint.app' ? 'https://api.whizpoint.app/api/auth/google/callback' : 'https://backoffice.whizpoint.app/api/auth/google/callback');

    // 1. Get tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    });
    
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error('Google OAuth token error:', tokenData);
      return res.status(400).send('Failed to obtain access token');
    }

    // 2. Get user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    
    const userData = await userRes.json();
    if (!userData.email) return res.status(400).send('No email returned from Google');

    // 3. Find or Create User
    let user = await prisma.user.findUnique({ where: { email: userData.email } });
    
    if (!user) {
      // Create new user & business
      const tempPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
      const newBusiness = await prisma.business.create({
        data: {
          name: userData.name ? `${userData.name}'s Business` : 'My Business',
          email: userData.email,
          users: {
            create: {
              email: userData.email,
              password: hashedPassword,
              name: userData.name,
              role: 'OWNER',
            }
          }
        },
        include: { users: true }
      });
      user = newBusiness.users[0];
    }

    // 4. Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, businessId: user.businessId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const userPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      businessId: user.businessId
    };

    // 5. Redirect back to frontend
    const frontendUrl = req.hostname.includes('localhost') 
      ? 'http://localhost:5173/auth' 
      : 'https://backoffice.whizpoint.app/auth';

    res.redirect(`${frontendUrl}?token=${encodeURIComponent(token)}&user=${encodeURIComponent(JSON.stringify(userPayload))}`);

  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).send('OAuth Authentication Failed');
  }
});

export default router;




