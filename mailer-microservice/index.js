require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());

// Increase JSON limit to 10MB to easily accept Base64 PDF attachments
app.use(express.json({ limit: '10mb' }));

// The secure API key generated for your system
const API_KEY = process.env.MAILER_API_KEY || 'wp_mailer_sk_9d8a7c6f5e4b3c2d1a0f9e8d7c6b5a4f';

// 1. Beautiful Documentation Frontend
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>WhizPOS Mailer API Documentation</title>
      <style>
        :root { --primary: #4f46e5; --bg: #f8fafc; --text: #334155; --code-bg: #1e293b; --code-text: #e2e8f0; }
        body { font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 40px 20px; line-height: 1.6; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        h1 { color: var(--primary); margin-top: 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; }
        h2 { color: #0f172a; margin-top: 30px; }
        .status-badge { display: inline-flex; align-items: center; background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 999px; font-weight: 600; font-size: 14px; margin-bottom: 20px; }
        .status-badge::before { content: ''; width: 8px; height: 8px; background: #16a34a; border-radius: 50%; margin-right: 8px; display: inline-block; }
        pre { background: var(--code-bg); color: var(--code-text); padding: 20px; border-radius: 8px; overflow-x: auto; font-size: 14px; }
        code { font-family: 'Fira Code', 'Courier New', Courier, monospace; }
        .method { background: var(--primary); color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 14px; margin-right: 10px; }
        .endpoint { font-family: monospace; font-size: 18px; color: #334155; background: #f1f5f9; padding: 8px 16px; border-radius: 6px; display: inline-block;}
      </style>
    </head>
    <body>
      <div class="container">
        <h1>WhizPOS Microservice Mailer</h1>
        <div class="status-badge">Service is Online and Ready</div>
        
        <p>This is a stateless, secure microservice built exclusively to process and relay SMTP emails for the WhizPOS architecture, bypassing restrictive hosting firewalls.</p>

        <h2>Authentication</h2>
        <p>All requests must include the <strong>x-api-key</strong> header.</p>
        <pre><code>Headers: {
  "Content-Type": "application/json",
  "x-api-key": "wp_mailer_sk_... (Your Secure Key)"
}</code></pre>

        <h2>Endpoint</h2>
        <div class="endpoint"><span class="method">POST</span> /api/send</div>
        <p>Send an email using dynamically provided SMTP credentials and payload details. Supports standard HTML and Base64 PDF attachments.</p>

        <h2>Request Payload Example</h2>
        <pre><code>{
  "smtpConfig": {
    "host": "smtp.gmail.com",
    "port": 465,
    "secure": true,
    "auth": {
      "user": "business@gmail.com",
      "pass": "App Password Decrypted from Main DB"
    }
  },
  "mailOptions": {
    "from": "\"Business Name\" &lt;business@gmail.com&gt;",
    "to": "client@example.com",
    "subject": "Your Receipt #1024",
    "html": "&lt;h1&gt;Thank you for your purchase&lt;/h1&gt;",
    "attachments": [
      {
        "filename": "receipt.pdf",
        "content": "JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nDPQM1Qo5yVQ...",
        "encoding": "base64"
      }
    ]
  }
}</code></pre>

        <h2>Response</h2>
        <pre><code>{
  "success": true,
  "messageId": "&lt;d4b6a...&gt;"
}</code></pre>
      </div>
    </body>
    </html>
  `);
});

// 2. The Email Sending API Endpoint
app.post('/api/send', async (req, res) => {
  const providedKey = req.headers['x-api-key'];
  if (providedKey !== API_KEY) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid API Key' });
  }

  const { smtpConfig, mailOptions } = req.body;
  if (!smtpConfig || !mailOptions) {
    return res.status(400).json({ success: false, error: 'Missing smtpConfig or mailOptions payload' });
  }

  try {
    const transporter = nodemailer.createTransport(smtpConfig);
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

module.exports = app;
