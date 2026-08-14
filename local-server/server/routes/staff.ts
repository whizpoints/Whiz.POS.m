import express from 'express';
import bcrypt from 'bcrypt';
import prisma from '../prisma.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const authenticate = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing authorization header' });

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

router.use(authenticate);

// Get all staff
router.get('/', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const staff = await prisma.user.findMany({
      where: { businessId },
      include: { outlet: true }
    }).catch(() => []);
    const safeStaff = staff.map((s: any) => {
      const { password, ...rest } = s;
      return rest;
    });
    res.json(safeStaff);
  } catch (error: any) {
    console.error('Staff GET error:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Failed to fetch staff' });
  }
});

// Create staff
router.post('/', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { name, email, password, pin, role, outletId, locationId } = req.body;

    const trimmedEmail = typeof email === 'string' ? email.trim() : '';
    const trimmedPin = typeof pin === 'string' ? pin.trim() : '';
    const trimmedName = typeof name === 'string' ? name.trim() : '';

    if (!trimmedName) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const hasValidEmail = !!trimmedEmail;
    const hasValidPin = !!trimmedPin;

    // Check PIN uniqueness if provided
    if (hasValidPin) {
      const existingPin = await prisma.user.findFirst({ where: { pin: trimmedPin, businessId } });
      if (existingPin) return res.status(400).json({ error: 'PIN is already in use by another user' });
    }

    // Check email uniqueness if provided
    if (hasValidEmail) {
      const existingEmail = await prisma.user.findFirst({ where: { email: trimmedEmail, businessId } });
      if (existingEmail) return res.status(400).json({ error: 'Email is already in use' });
    }

    // Role-based validation hint
    const upperRole = (role || 'CASHIER').toUpperCase();
    if (!hasValidEmail && !hasValidPin) {
      if (upperRole === 'ADMIN') {
        return res.status(400).json({ error: 'Admin accounts require an Email and Password' });
      }
      return res.status(400).json({ error: 'Must provide either an Email (for Admin) or a 4-digit PIN (for Cashier)' });
    }

    const dummyEmail = `cashier_${Date.now()}@whizpos.local`;
    const finalEmail = hasValidEmail ? trimmedEmail : dummyEmail;
    
    const hashedPassword = password ? await bcrypt.hash(password, 10) : await bcrypt.hash('123456', 10);

    const user = await prisma.user.create({
      data: {
        businessId,
        name: trimmedName,
        email: finalEmail,
        password: hashedPassword,
        pin: hasValidPin ? trimmedPin : null,
        role: upperRole,
        outletId: outletId || null,
        locationId: locationId || null
      }
    });

    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (error: any) {
    console.error('Staff POST error:', error?.message || error);
    if (error?.code === 'P2002') {
      const target = (error?.meta?.target as string[])?.join(', ') || 'field';
      return res.status(400).json({ error: `Duplicate value for ${target}` });
    }
    res.status(500).json({ error: error?.message || 'Failed to create staff' });
  }
});

// Update staff
router.put('/:id', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { id } = req.params;
    const { name, email, password, pin, role, outletId, locationId } = req.body;

    const trimmedEmail = typeof email === 'string' ? email.trim() : '';
    const trimmedPin = typeof pin === 'string' ? pin.trim() : '';
    const trimmedName = typeof name === 'string' ? name.trim() : '';

    const hasValidEmail = !!trimmedEmail;
    const hasValidPin = !!trimmedPin;

    // First verify the user belongs to this business
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser || existingUser.businessId !== businessId) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    if (hasValidPin) {
      const dupePin = await prisma.user.findFirst({
        where: { pin: trimmedPin, businessId, NOT: { id } }
      });
      if (dupePin) return res.status(400).json({ error: 'PIN is already in use' });
    }

    if (hasValidEmail) {
      const dupeEmail = await prisma.user.findFirst({
        where: { email: trimmedEmail, businessId, NOT: { id } }
      });
      if (dupeEmail) return res.status(400).json({ error: 'Email is already in use' });
    }

    const updateData: any = {
      outletId: outletId || null,
      locationId: locationId || null
    };
    if (trimmedName) updateData.name = trimmedName;
    if (role) updateData.role = (role || 'CASHIER').toUpperCase();
    if (hasValidPin) updateData.pin = trimmedPin;
    if (hasValidEmail) updateData.email = trimmedEmail;
    if (password && String(password).length >= 4) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData
    });

    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (error: any) {
    console.error('Staff PUT error:', error?.message || error);
    if (error?.code === 'P2002') {
      const target = (error?.meta?.target as string[])?.join(', ') || 'field';
      return res.status(400).json({ error: `Duplicate value for ${target}` });
    }
    res.status(500).json({ error: error?.message || 'Failed to update staff' });
  }
});

// Delete staff
router.delete('/:id', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { id } = req.params;
    await prisma.user.deleteMany({
      where: { id, businessId }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete staff' });
  }
});

export default router;
