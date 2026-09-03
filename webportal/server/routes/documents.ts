import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const router = Router();

// Proxy images to bypass CORS in html-to-image
router.get('/proxy-image', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== 'string') return res.status(400).send('URL required');
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    res.setHeader('Content-Type', response.headers.get('content-type') || 'image/png');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (err) {
    console.error('Image proxy error:', err);
    res.status(500).send('Failed to proxy image');
  }
});

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Helper to authenticate
const authenticate = async (req: any, res: any, next: any) => {
  const token = req.query.token as string;
  if (!token) return res.status(401).send('Unauthorized: No token');
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.businessId = decoded.businessId;
    next();
  } catch (err) {
    return res.status(401).send('Unauthorized: Invalid token');
  }
};

// Generate Receipt HTML
router.get('/receipt/:id', authenticate, async (req: any, res) => {
  try {
    const receipt = await prisma.receipt.findUnique({
      where: { id: req.params.id, businessId: req.businessId },
      include: {
        items: true,
        business: true
      }
    });

    if (!receipt) return res.status(404).send('Receipt not found');

    const business = receipt.business;
    let settings: any = {};
    try { settings = JSON.parse(business.settings || '{}'); } catch (e) {}

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt ${receipt.receiptNumber}</title>
        <style>
          body { font-family: monospace; width: 300px; margin: 0 auto; padding: 10px; color: #000; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-bottom: 1px dashed #000; margin: 10px 0; }
          .flex { display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; }
          th, td { text-align: left; padding: 4px 0; }
          .right { text-align: right; }
          @media print {
            body { width: 100%; margin: 0; padding: 0; }
          }
        </style>
      </head>
      <body onload="window.print()">
        <div class="center">
          <h2 class="bold" style="margin:0">${business.name}</h2>
          ${settings.businessInfo ? `<div>${settings.businessInfo}</div>` : ''}
          ${settings.phone ? `<div>Tel: ${settings.phone}</div>` : ''}
          ${business.kraPin ? `<div>PIN: ${business.kraPin}</div>` : ''}
        </div>
        
        <div class="divider"></div>
        
        <div class="flex">
          <div>Receipt: ${receipt.receiptNumber}</div>
          <div>${new Date(receipt.createdAt).toLocaleDateString()}</div>
        </div>
        <div class="flex">
          <div>${settings.servedBy || 'Cashier'}: ${receipt.cashierId}</div>
          <div>Time: ${new Date(receipt.createdAt).toLocaleTimeString()}</div>
        </div>
        
        <div class="divider"></div>
        
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th class="right">Qty</th>
              <th class="right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${receipt.items.map(item => `
              <tr>
                <td>${item.productName}</td>
                <td class="right">${item.quantity}</td>
                <td class="right">${item.totalPrice}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="divider"></div>
        
        <div class="flex bold">
          <div>TOTAL</div>
          <div>${receipt.totalAmount}</div>
        </div>
        <div class="flex">
          <div>Payment Method</div>
          <div>${receipt.paymentMethod}</div>
        </div>
        
        <div class="divider"></div>
        
        <div class="center">
          <div>${settings.receiptFooter || 'Thank you for your business!'}</div>
        </div>
      </body>
      </html>
    `;

    res.send(html);
  } catch (error) {
    res.status(500).send('Error generating receipt');
  }
});

// Generate A4 Invoice HTML
router.get('/invoice/:id', authenticate, async (req: any, res) => {
  try {
    const receipt = await prisma.receipt.findUnique({
      where: { id: req.params.id, businessId: req.businessId },
      include: { items: true, business: true }
    });

    if (!receipt) return res.status(404).send('Receipt not found');

    const business = receipt.business;
    let settings: any = {};
    try { settings = JSON.parse(business.settings || '{}'); } catch (e) {}

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${receipt.receiptNumber}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #333; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
          .title { font-size: 32px; font-weight: bold; color: #2563eb; }
          .info-grid { display: flex; justify-content: space-between; margin-bottom: 40px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #f8fafc; padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0; }
          td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
          .right { text-align: right; }
          .total-row { font-weight: bold; font-size: 1.2em; }
          .footer { text-align: center; margin-top: 50px; color: #64748b; font-size: 0.9em; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body onload="window.print()">
        <div class="header">
          <div>
            <h1 style="margin:0">${business.name}</h1>
            <div style="color: #64748b">${settings.businessInfo || ''}</div>
            <div>${settings.phone || ''}</div>
            <div>${business.kraPin ? 'KRA PIN: ' + business.kraPin : ''}</div>
          </div>
          <div class="right">
            <div class="title">INVOICE</div>
            <div>#${receipt.receiptNumber}</div>
            <div>${new Date(receipt.createdAt).toLocaleDateString()}</div>
          </div>
        </div>
        
        <div class="info-grid">
          <div>
            <strong>Bill To:</strong><br/>
            ${receipt.customerPhone ? receipt.customerPhone : 'Walk-in Customer'}
          </div>
          <div class="right">
            <strong>Payment Method:</strong><br/>
            ${receipt.paymentMethod}
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="right">Unit Price</th>
              <th class="right">Qty</th>
              <th class="right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${receipt.items.map(item => `
              <tr>
                <td>${item.productName}</td>
                <td class="right">${(item.totalPrice / item.quantity).toFixed(2)}</td>
                <td class="right">${item.quantity}</td>
                <td class="right">${item.totalPrice.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="3" class="right">Total Amount Due</td>
              <td class="right">${receipt.totalAmount.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
        
        <div class="footer">
          ${settings.receiptFooter || 'Thank you for your business!'}
        </div>
      </body>
      </html>
    `;

    res.send(html);
  } catch (error) {
    res.status(500).send('Error generating invoice');
  }
});

export default router;
