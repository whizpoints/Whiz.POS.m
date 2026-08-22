// @ts-nocheck
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import prisma from '../prisma.js';
import jwt from 'jsonwebtoken';

const router = Router();
// const prisma = new PrismaClient();
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
        business: true,
        outlet: { include: { location: true } }
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
            .no-print { display: none !important; }
          }
          .print-button {
            display: block;
            width: 100%;
            padding: 10px;
            margin-bottom: 20px;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            cursor: pointer;
            text-align: center;
          }
          .print-button:hover { background: #1d4ed8; }
        </style>
      </head>
      <body>
        <button class="no-print print-button" onclick="window.print()">Print Receipt</button>
        <div class="center">
          <h2 class="bold" style="margin:0">${business.name}</h2>
          ${settings.businessInfo ? `<div>${settings.businessInfo}</div>` : ''}
          ${settings.phone ? `<div>Tel: ${settings.phone}</div>` : ''}
          ${business.kraPin ? `<div>PIN: ${business.kraPin}</div>` : ''}
          ${receipt.outlet ? `<div>Outlet: ${receipt.outlet.name}</div>` : ''}
          ${receipt.outlet && receipt.outlet.location ? `<div>Location: ${receipt.outlet.location.name}${receipt.outlet.location.address ? ', ' + receipt.outlet.location.address : ''}</div>` : ''}
        </div>
        
        <div class="divider"></div>
        
        <div class="flex">
          <div>Receipt: ${receipt.receiptNumber}</div>
          <div>Date: ${new Date(receipt.createdAt).toLocaleDateString()}</div>
        </div>
        <div class="flex">
          <div>Served By: ${receipt.cashierName || settings.servedBy || 'Cashier'}</div>
          <div>Time: ${new Date(receipt.createdAt).toLocaleTimeString()}</div>
        </div>
        
        <div class="divider"></div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th style="text-align:left">Item</th>
              <th class="right">Qty</th>
              <th class="right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${(receipt.items || []).map((item: any) => `
                <tr>
                  <td>${item.productName}</td>
                  <td class="right">${item.quantity}</td>
                  <td class="right">${item.totalPrice}</td>
                </tr>
              `).join('')}
          </tbody>
        </table>
        
        <div class="divider"></div>
        
        <div class="flex" style="font-weight:bold">
          <div>TOTAL</div>
          <div>${receipt.totalAmount}</div>
        </div>
        <div class="flex">
          <div>Payment Method</div>
          <div>${receipt.paymentMethod}</div>
        </div>
        
        <div class="divider"></div>
        
        <div class="center" style="margin-top:20px; font-style:italic">
          ${settings.footerMessage || 'Thank you for your business!'}
        </div>
        <div class="center no-print" style="margin-top:10px; font-size: 0.8em; color: #888;">
          Powered by WhizPOS
        </div>
      </body>
      </html>
    `;

    res.send(html);
  } catch (error) {
    console.error('Receipt generation error:', error);
    res.status(500).send('Error generating receipt');
  }
});

// Generate A4 Invoice HTML
router.get('/invoice/:id', authenticate, async (req: any, res) => {
  try {
    const receipt = await prisma.receipt.findUnique({
      where: { id: req.params.id, businessId: req.businessId },
      include: {
        items: true,
        business: true,
        outlet: { include: { location: true } }
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
          .header-detail { font-size: 0.9em; color: #64748b; margin-top: 2px; }
          @media print {
            .no-print { display: none !important; }
          }
          .print-button {
            display: block;
            width: 100%;
            max-width: 200px;
            padding: 10px;
            margin: 0 auto 30px auto;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            cursor: pointer;
            text-align: center;
          }
          .print-button:hover { background: #1d4ed8; }
        </style>
      </head>
      <body>
        <button class="no-print print-button" onclick="window.print()">Print Invoice</button>
        <div class="header">
          <div>
            <h1 style="margin:0">${business.name}</h1>
            <div style="color: #64748b">${settings.businessInfo || ''}</div>
            <div>${settings.phone ? 'Tel: ' + settings.phone : ''}</div>
            <div>${business.kraPin ? 'KRA PIN: ' + business.kraPin : ''}</div>
            ${receipt.outlet ? `<div>Outlet: ${receipt.outlet.name}</div>` : ''}
            ${receipt.outlet && receipt.outlet.location ? `<div>Location: ${receipt.outlet.location.name}${receipt.outlet.location.address ? ', ' + receipt.outlet.location.address : ''}</div>` : ''}
          </div>
          <div class="right">
            <div class="title">INVOICE</div>
            <div>#${receipt.receiptNumber}</div>
            <div class="header-detail">Date: ${new Date(receipt.createdAt).toLocaleDateString()}</div>
            <div class="header-detail">Time: ${new Date(receipt.createdAt).toLocaleTimeString()}</div>
            <div class="header-detail">Served By: ${receipt.cashierName || settings.servedBy || 'Cashier'}</div>
          </div>
        </div>
        
        <div class="info-grid">
          <div>
            <strong>Bill To:</strong><br/>
            ${receipt.customerPhone ? receipt.customerPhone : 'Walk-in Customer'}
          </div>
          <div class="right">
            <strong>Status:</strong><br/>
            ${receipt.status}
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="text-align:left">Item</th>
              <th class="right">Qty</th>
              <th class="right">Price</th>
              <th class="right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${(receipt.items || []).map((item: any) => `
                <tr>
                  <td>${item.productName}</td>
                  <td class="right">${item.quantity}</td>
                  <td class="right">${item.unitPrice}</td>
                  <td class="right">${item.totalPrice}</td>
                </tr>
              `).join('')}
          </tbody>
        </table>
        
        <div style="margin-top:20px">
          <div class="flex" style="justify-content: flex-end; gap: 40px">
            <div><strong>Subtotal:</strong></div>
            <div>${receipt.totalAmount}</div>
          </div>
          <div class="flex" style="justify-content: flex-end; gap: 40px">
            <div><strong>Payment Method:</strong></div>
            <div>${receipt.paymentMethod}</div>
          </div>
          <div class="flex" style="justify-content: flex-end; gap: 40px; margin-top: 10px">
            <div class="total-row">TOTAL:</div>
            <div class="total-row">${receipt.totalAmount}</div>
          </div>
        </div>
        
        <div class="footer">
          <div>${settings.footerMessage || 'Thank you for your business!'}</div>
          <div class="no-print" style="margin-top:10px; font-size: 0.8em; color: #888;">Powered by WhizPOS</div>
        </div>
      </body>
      </html>
    `;

    res.send(html);
  } catch (error) {
    console.error('Invoice generation error:', error);
    res.status(500).send('Error generating invoice');
  }
});

export default router;
