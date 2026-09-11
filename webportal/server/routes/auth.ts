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

    res.json({ token, business, user: { id: user.id, name: user.name, email: user.email, role: user.role, businessId: user.businessId } });
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

  // Get Current Logged-in User
  router.get('/me', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token provided' });
      
      const token = authHeader.split(' ')[1];
      const payload = jwt.verify(token, JWT_SECRET) as any;
      
      const user = await prisma.user.findUnique({ where: { id: payload.userId }, include: { business: true } });
      if (!user) return res.status(404).json({ error: 'User not found' });
      
      res.json({ id: user.id, name: user.name, email: user.email, role: user.role, businessId: user.businessId, businessName: user.business?.name, businessLogo: user.business?.logoUrl });
    } catch (error) {
      console.error('/me error:', error);
      res.status(401).json({ error: 'Invalid token' });
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

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, businessId: user.businessId }, business: user.business });
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


const renderErrorPage = (statusCode: number, title: string, message: string, frontendUrl: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${statusCode} - ${title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: linear-gradient(135deg, #e0f2fe 0%, #f3e8ff 50%, #fdf4ff 100%); min-height: 100vh; margin: 0; }
        .card-top { height: 4px; background: linear-gradient(90deg, #0ea5e9, #8b5cf6); border-top-left-radius: 1.5rem; border-top-right-radius: 1.5rem; position: absolute; top: 0; left: 0; right: 0; }
    </style>
</head>
<body class="flex flex-col">
    <header class="w-full flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg italic">W</div>
            <span class="font-bold text-gray-900 text-xl tracking-tight">Whiz <span class="text-blue-500">POS</span></span>
        </div>
        <div class="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500">
            <a href="${frontendUrl}/pricing" class="hover:text-gray-900 transition-colors">Pricing</a>
            <a href="${frontendUrl}/faq" class="hover:text-gray-900 transition-colors">FAQ</a>
            <a href="${frontendUrl}/docs" class="hover:text-gray-900 transition-colors">Documentation</a>
        </div>
        <div class="flex items-center gap-4">
            <a href="${frontendUrl}/auth" class="bg-[#0ea5e9] hover:bg-[#0284c7] text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">Sign In</a>
            <button class="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-400 shadow-sm border border-gray-100 hover:text-gray-600 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            </button>
        </div>
    </header>
    <main class="flex-1 flex items-center justify-center p-4 pb-20">
        <div class="bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl w-full max-w-2xl relative text-center pt-8 pb-10 px-6 sm:px-12 border border-white">
            <div class="card-top"></div>
            <h1 class="text-[8rem] sm:text-[10rem] font-extrabold text-[#0f172a] leading-none mt-4 tracking-tighter">${statusCode}</h1>
            <h2 class="text-2xl sm:text-3xl font-bold text-[#0f172a] mt-2 mb-4">${title}</h2>
            <p class="text-gray-500 mb-8 max-w-md mx-auto text-[15px] leading-relaxed">${message}</p>
            <div class="max-w-md mx-auto relative mb-8 hidden sm:block">
                <svg class="w-5 h-5 absolute left-3.5 top-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <input type="text" placeholder="Search for products, sales..." class="w-full pl-11 pr-14 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50/50" disabled>
                <div class="absolute right-3 top-2.5 px-1.5 py-0.5 rounded border border-gray-200 bg-white text-gray-400 text-[10px] font-semibold tracking-widest">⌘K</div>
            </div>
            <div class="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-10">
                <a href="${frontendUrl}/" class="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[#0f172a] font-semibold text-sm hover:bg-gray-50 transition-colors border border-gray-200">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                    Go to Homepage
                </a>
                <a href="${frontendUrl}/auth" class="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-md shadow-indigo-500/20">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
                    Try Signing In
                </a>
            </div>
            <div class="border-t border-gray-100 pt-8 relative">
                <p class="text-[11px] font-bold text-gray-400 tracking-widest uppercase mb-5">Try these instead</p>
                <div class="flex flex-wrap items-center justify-center gap-2 max-w-[90%] mx-auto">
                    <span class="px-3.5 py-1.5 rounded-full bg-[#dcfce7] text-[#166534] text-xs font-semibold">Inventory</span>
                    <span class="px-3.5 py-1.5 rounded-full bg-gray-50 border border-gray-100 text-gray-600 text-xs font-semibold">Sales</span>
                    <span class="px-3.5 py-1.5 rounded-full bg-gray-50 border border-gray-100 text-gray-600 text-xs font-semibold">Reports</span>
                    <span class="px-3.5 py-1.5 rounded-full bg-gray-50 border border-gray-100 text-gray-600 text-xs font-semibold">Settings</span>
                    <span class="px-3.5 py-1.5 rounded-full bg-gray-50 border border-gray-100 text-gray-600 text-xs font-semibold">Pricing</span>
                    <span class="px-3.5 py-1.5 rounded-full bg-gray-50 border border-gray-100 text-gray-600 text-xs font-semibold">Docs</span>
                    <span class="px-3.5 py-1.5 rounded-full bg-gray-50 border border-gray-100 text-gray-600 text-xs font-semibold">FAQ</span>
                </div>
            </div>
        </div>
    </main>
</body>
</html>
`;

// ==================== GOOGLE OAUTH ====================
router.get('/google', (req, res) => {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const protocol = req.hostname.includes('localhost') ? 'http' : 'https';
  const host = req.get('host') || req.hostname;
  const redirectUri = `${protocol}://${host}/api/auth/google/callback`;
  
  // Track where the request came from so we can redirect back to pos.whizpoint.app or backoffice
  let origin = (req.query.origin as string) || req.headers.referer || 'https://backoffice.whizpoint.app';
  if (origin.endsWith('/')) origin = origin.slice(0, -1);
  if (origin.endsWith('/auth')) origin = origin.replace('/auth', '');
  if (origin.endsWith('/login')) origin = origin.replace('/login', '');

  const state = Buffer.from(origin).toString('base64');
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email%20profile&state=${state}`;
  res.redirect(authUrl);
});

router.get('/google/callback', async (req, res) => {
  let frontendOrigin = req.hostname.includes('localhost') ? 'http://localhost:5173' : 'https://backoffice.whizpoint.app';
  
  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).send(renderErrorPage(400, 'Bad Request', 'No authentication code was provided by Google.', frontendOrigin));

    if (state && typeof state === 'string') {
      try {
        const decodedOrigin = Buffer.from(state, 'base64').toString('utf-8');
        if (decodedOrigin.startsWith('http')) {
          frontendOrigin = decodedOrigin;
        }
      } catch (e) {
        console.error('Failed to parse OAuth state');
      }
    }

    const protocol = req.hostname.includes('localhost') ? 'http' : 'https';
    const host = req.get('host') || req.hostname;
    const redirectUri = `${protocol}://${host}/api/auth/google/callback`;

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
      return res.status(400).send(renderErrorPage(400, 'Authentication Failed', 'Failed to obtain access token from Google.', frontendOrigin));
    }

    // 2. Get user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    
    const userData = await userRes.json();
    if (!userData.email) return res.status(400).send(renderErrorPage(400, 'Missing Information', 'No email address was returned from Google.', frontendOrigin));

    let user = await prisma.user.findUnique({ where: { email: userData.email } });
    
    if (!user) {
      return res.status(404).send(renderErrorPage(
        404, 
        'Account Not Found', 
        `We couldn't find a Whiz POS account associated with <strong class="text-gray-900">${userData.email}</strong>. Please sign up to create a new business account.`, 
        frontendOrigin
      ));
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

    // 5. Redirect back to correct frontend
    res.redirect(`${frontendOrigin}/auth?token=${encodeURIComponent(token)}&user=${encodeURIComponent(JSON.stringify(userPayload))}`);

  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).send(renderErrorPage(
      500, 
      'Authentication Error', 
      'We encountered an unexpected error while trying to authenticate you with Google. Please try again.', 
      frontendOrigin
    ));
  }
});

export default router;




