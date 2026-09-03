require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());

// Increase JSON limit to 10MB to easily accept Base64 PDF attachments
app.use(express.json({ limit: '10mb' }));

const API_KEY = process.env.MAILER_API_KEY || 'whizpos_secret_mailer_key_2026';

// 1. Basic Frontend Status Page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>WhizPOS Mailer Microservice</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8fafc; color: #334155; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); text-align: center; max-width: 400px; }
        .status { display: inline-block; padding: 6px 12px; border-radius: 999px; background: #dcfce7; color: #166534; font-weight: 600; font-size: 14px; margin-top: 10px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1 style="color: #4f46e5; margin-top: 0;">WhizPOS Mailer</h1>
        <p style="color: #64748b;">Ultra-fast Microservice Email Engine</p>
        <div class="status">? Online & Ready</div>
      </div>
    </body>
    </html>
  `);
});

// 2. The Email Sending API Endpoint
app.post('/api/send', async (req, res) => {
  // Security Check
  const providedKey = req.headers['x-api-key'];
  if (providedKey !== API_KEY) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid API Key' });
  }

  const { smtpConfig, mailOptions } = req.body;
  if (!smtpConfig || !mailOptions) {
    return res.status(400).json({ success: false, error: 'Missing smtpConfig or mailOptions payload' });
  }

  try {
    // Dynamically create a transporter using the details provided by the Render Backend
    const transporter = nodemailer.createTransport(smtpConfig);
    
    // Send the email (including base64 PDF attachments)
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email sent successfully:', info.messageId);
    res.json({ success: true, messageId: info.messageId });

  } catch (error) {
    console.error('Mailer error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// For Localhost testing (Port 4000)
if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`WhizPOS Mailer Microservice running locally on http://localhost:${PORT}`);
  });
}

// For Vercel Serverless Export
module.exports = app;
