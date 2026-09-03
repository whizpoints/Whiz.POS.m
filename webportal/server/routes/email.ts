import { buildTransactionalEmail } from '../utils/emailEngine.js';
// @ts-nocheck
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import nodemailer from 'nodemailer';
import { decrypt } from '../utils/crypto.js';
import fs from 'fs';
import path from 'path';

const router = Router();

import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const authenticate = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const token = req.headers['x-api-key'] || (authHeader ? authHeader.split(' ')[1] : null);

  if (!token) return res.status(401).json({ error: 'Missing authorization header or API key' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (err) {
    try {
      // @ts-ignore
      const business = await (typeof db !== 'undefined' ? db.selectFrom('Business').selectAll().where('apiKey', '=', token).executeTakeFirst() : prisma.business.findFirst({ where: { apiKey: token } }));
      if (business) {
        req.user = { businessId: business.id };
        return next();
      }
    } catch (dbErr) {}
    
    return res.status(401).json({ error: 'Invalid token or API key' });
  }
};

const getEmailTransporter = async (businessId: string) => {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business || !business.settings) throw new Error('Business settings not found');

  const settings = typeof business.settings === 'string' ? JSON.parse(business.settings) : business.settings;
  
  if (!settings.emailEnabled || !settings.emailAppPassword || !settings.emailFrom) {
    throw new Error('Email is not configured for this business');
  }

  const decryptedPassword = decrypt(settings.emailAppPassword);
  if (decryptedPassword.includes(':')) {
    throw new Error('Failed to decrypt email password');
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: settings.emailFrom,
      pass: decryptedPassword
    }
  });

  return { transporter, settings, businessName: business.name, logoUrl: business.logoUrl || business.documentLogoUrl };
};


const generateEmailHtml = (businessName, logoUrl, contentHtml, businessEmail) => {
  const logoSection = logoUrl ? `<div style="text-align: center; margin-bottom: 20px;"><img src="${logoUrl}" alt="${businessName} Logo" style="max-height: 80px; max-width: 200px;" /></div>` : '';
  const footerLink = businessEmail ? `<a href="mailto:${businessEmail}" style="color: #4f46e5; text-decoration: none; font-weight: 600;">${businessName}</a>` : businessName;
  
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; background: linear-gradient(135deg, #f6f8fd 0%, #f1f5f9 100%); padding: 30px; border-radius: 12px; color: #334155; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      ${logoSection}
      <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">
        ${contentHtml}
      </div>
      <div style="text-align: center; margin-top: 25px; font-size: 13px; color: #64748b; padding-top: 20px; border-top: 1px solid #e2e8f0;">
        <p>Sent by ${footerLink}</p>
        <p style="margin-top: 8px; font-size: 12px; color: #94a3b8;">Powered by <strong>WhizPOS</strong> - Next Generation Point of Sale</p>
      </div>
    </div>
  `;
};

// Send a test email
router.post('/test', authenticate, async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { transporter, settings, businessName, logoUrl } = await getEmailTransporter(businessId);

    
    const contentHtml = `
      <h2 style="color: #1e293b; margin-top: 0;">Hi <a href="mailto:${settings.emailFrom}" style="color: #3b82f6; text-decoration: none;">${businessName}</a>,</h2>
      <p style="font-size: 16px; line-height: 1.6; color: #475569;">Your email configuration was successful! You are now ready to send beautiful invoices, receipts, and documents directly to your clients.</p>
      
      <div style="background: linear-gradient(to right, #4f46e5, #3b82f6); color: white; padding: 20px; border-radius: 8px; margin: 25px 0;">
        <h3 style="margin-top: 0; font-size: 18px;">What is Whiz POS?</h3>
        <p style="margin-bottom: 15px; opacity: 0.9;">Whiz POS is your ultimate all-in-one Point of Sale and Business Management solution designed to streamline your daily operations.</p>
        <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>?? <strong>Real-time Sync:</strong> Instant syncing between local and cloud servers.</li>
          <li>?? <strong>Smart Inventory:</strong> Track stock, reorder levels, and adjustments.</li>
          <li>?? <strong>M-Pesa Integration:</strong> Seamless mobile payments.</li>
          <li>?? <strong>eTIMS Ready:</strong> Fully KRA compliant receipts.</li>
          <li>?? <strong>Custom Emails:</strong> Send beautiful branded documents to clients.</li>
        </ul>
      </div>
      
      <p style="font-size: 16px; color: #475569;">You can now safely close this window and continue managing your business.</p>
    `;
    
    const fullHtml = generateEmailHtml(businessName, logoUrl, contentHtml, settings.emailFrom);
    const mailOptions = {
      from: `"${businessName}" <${settings.emailFrom}>`,
      to: settings.emailFrom,
      replyTo: settings.emailReplyTo || settings.emailFrom,
      subject: 'WhizPOS - Test Email Configuration',
      html: fullHtml
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Test email sent successfully' });
  } catch (error: any) {
    console.error('Test email error:', error);
    res.status(500).json({ error: error.message || 'Failed to send test email' });
  }
});

// Send a receipt
router.post('/send-receipt', authenticate, async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { receiptId, recipientEmail } = req.body;
    if (!receiptId || !recipientEmail) {
      return res.status(400).json({ error: 'Missing receiptId or recipientEmail' });
    }

    const { transporter, settings, businessName, logoUrl } = await getEmailTransporter(businessId);

    // Fetch the receipt data
    const transaction = await prisma.transaction.findFirst({ where: { id: receiptId, businessId } });
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

    // Try to find the cashier name
    let cashierName = 'Cashier';
    if (transaction.userId) {
       const user = await prisma.user.findUnique({ where: { id: transaction.userId }, select: { name: true } });
       if (user) cashierName = user.name;
    }

    // Try to get receipt items
    const items = await prisma.receiptItem.findMany({ where: { transactionId: receiptId } });

    let itemsHtml = items.map((item: any) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.productName}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">KES ${item.unitPrice}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">KES ${item.subtotal}</td>
      </tr>
    `).join('');

    const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #333; margin: 0;">${businessName}</h2>
        <p style="color: #666; margin: 5px 0;">Receipt #${transaction.receiptNumber}</p>
      </div>
      
      <div style="margin-bottom: 20px; color: #555;">
        <p><strong>Date:</strong> ${new Date(transaction.createdAt).toLocaleString()}</p>
        <p><strong>Cashier:</strong> ${cashierName}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #f9f9f9;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Item</th>
            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div style="text-align: right; margin-bottom: 20px;">
        <h3 style="margin: 0; color: #333;">Total: KES ${transaction.total}</h3>
        <p style="margin: 5px 0; color: #666;">Payment Method: ${transaction.paymentMethod}</p>
      </div>

      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #888;">
        <p>Thank you for your business!</p>
      </div>
    </div>
    `;

    const mailOptions = { from: `"${businessName}" <${settings.emailFrom}>`, to: recipientEmail, replyTo: settings.emailReplyTo || settings.emailFrom, subject: `Receipt #${transaction.receiptNumber} from ${businessName}`, html: generateEmailHtml(businessName, logoUrl, htmlContent, settings.emailFrom) };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Receipt sent successfully' });

  } catch (error: any) {
    console.error('Send receipt error:', error);
    res.status(500).json({ error: error.message || 'Failed to send receipt email' });
  }
});


// Send a custom email
router.post('/send-custom', authenticate, async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { to, subject, body, attachments, isRichTemplate, richPayload } = req.body;
    
    if (!to || (!body && !isRichTemplate)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { transporter, settings, businessName, logoUrl } = await getEmailTransporter(businessId);

    let fullHtml = '';
    
    if (isRichTemplate && richPayload) {
      // Use the enterprise transactional email engine
      fullHtml = buildTransactionalEmail(richPayload);
    } else {
      // Basic auto-formatting of text to HTML if it doesn't look like HTML
      let htmlContent = body;
      if (!body.includes('<') || !body.includes('>')) {
         htmlContent = body.split('\n').map((line: string) => `<p>${line}</p>`).join('');
      }
      // Wrap in standard template
      fullHtml = generateEmailHtml(businessName, logoUrl, htmlContent, settings.emailFrom);
    }

    const mailOptions = {
      from: `"${businessName}" <${settings.emailFrom}>`,
      to,
      replyTo: settings.emailReplyTo || settings.emailFrom,
      subject: subject || (isRichTemplate ? `${richPayload.document?.type.replace(/_/g, ' ')} from ${businessName}` : 'Message'),
      html: fullHtml,
      attachments: attachments || [] // Array of { filename, content } or { filename, path }
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Email sent successfully' });

  } catch (error: any) {
    console.error('Send custom email error:', error);
    res.status(500).json({ error: error.message || 'Failed to send custom email' });
  }
});


export default router;

