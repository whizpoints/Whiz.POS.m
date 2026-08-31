import { Router } from 'express';
import db from '../db.js';
import { randomUUID } from 'crypto';

const router = Router();
// const prisma = new PrismaClient();

// This endpoint could be used if the POS pushes terminal configs to the cloud
router.post('/register', async (req, res) => {
  try {
    const { terminalId, ipAddress } = req.body;
    // Store in DB or memory
    res.json({ success: true, message: 'Terminal registered' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to register terminal' });
  }
});

// A webhook for Cloud Terminal APIs (e.g. Flutterwave) to ping when a physical payment completes
router.post('/webhook', async (req, res) => {
  try {
    const payload = req.body;
    console.log('Received Terminal Webhook:', payload);
    
    // In a real scenario, we would verify the webhook signature
    // and update the transaction status in the database.
    
    res.json({ success: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// An endpoint for the local POS to push a payment request to the cloud (if not using local IP)
router.post('/push-payment', async (req, res) => {
    try {
        const { amount, reference, terminalId } = req.body;
        
        // E.g. call Flutterwave Terminal API:
        // await axios.post('https://api.flutterwave.com/v3/transactions/terminal', { amount, reference, terminal_id: terminalId }, { headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` } });

        res.json({ success: true, message: 'Payment pushed to terminal' });
    } catch (err) {
        console.error('Push error:', err);
        res.status(500).json({ error: 'Failed to push payment to terminal' });
    }
});

export default router;


