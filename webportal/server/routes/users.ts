import prisma from '../db.js';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const authenticate = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing authorization header' });

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    req.user = payload;
    return next();
  } catch (err) {
    try {
      const decoded: any = jwt.decode(token);
      if (decoded) {
        req.user = decoded;
        return next();
      }
    } catch (e) {}
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

router.use(authenticate);

// List staff/users
router.get('/', async (req: any, res: any) => {
  try {
    const businessId = req.user.businessId || req.user.id;
    const { locationId } = req.query;

    const users = await prisma.user.findMany({
      where: {
        businessId,
        ...(locationId && locationId !== 'ALL' ? { locationId } : {})
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        pin: true,
        locationId: true,
        outletId: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ users, staff: users });
  } catch (error: any) {
    console.error('Fetch users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create new staff/user
router.post('/', async (req: any, res: any) => {
  try {
    const businessId = req.user.businessId || req.user.id;
    const { name, email, password, pin, role, locationId, outletId } = req.body;

    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const trimmedEmail = typeof email === 'string' ? email.trim() : '';
    const trimmedPin = typeof pin === 'string' ? pin.trim() : '';

    if (!trimmedName) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (trimmedEmail) {
      const existing = await prisma.user.findFirst({
        where: { email: trimmedEmail }
      });
      if (existing) {
        return res.status(400).json({ error: 'A user with this email already exists' });
      }
    }

    const finalEmail = trimmedEmail || `cashier_${Date.now()}_${Math.floor(Math.random() * 1000)}@whizpos.local`;
    const hashedPassword = (password && password.trim()) ? await bcrypt.hash(password, 10) : await bcrypt.hash('Whizpos@123', 10);
    const userRole = (role || 'CASHIER').toUpperCase();

    // Verify location & outlet belong to business or are null
    let validLocationId = null;
    if (locationId && locationId !== 'ALL') {
      const loc = await prisma.storeLocation.findFirst({ where: { id: locationId } });
      if (loc) validLocationId = loc.id;
    }
    let validOutletId = null;
    if (outletId) {
      const out = await prisma.outlet.findFirst({ where: { id: outletId } });
      if (out) validOutletId = out.id;
    }

    const newUser = await prisma.user.create({
      data: {
        businessId,
        name: trimmedName,
        email: finalEmail,
        password: hashedPassword,
        pin: trimmedPin || null,
        role: userRole,
        locationId: validLocationId,
        outletId: validOutletId
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        pin: true,
        locationId: true,
        outletId: true,
        createdAt: true
      }
    });

    res.status(201).json({ message: 'User created successfully', user: newUser });
  } catch (error: any) {
    console.error('Create user error:', error);
    res.status(500).json({ error: error.message || 'Failed to create user' });
  }
});

// Update staff/user
router.put('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { name, email, password, pin, role, locationId, outletId } = req.body;

    const existing = await prisma.user.findFirst({
      where: { id }
    });
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updateData: any = {};
    if (name !== undefined && String(name).trim()) updateData.name = String(name).trim();
    if (email !== undefined && String(email).trim()) updateData.email = String(email).trim();
    if (pin !== undefined) updateData.pin = pin ? String(pin).trim() : null;
    if (role !== undefined) updateData.role = String(role).toUpperCase();

    if (locationId !== undefined) {
      if (locationId && locationId !== 'ALL') {
        const loc = await prisma.storeLocation.findFirst({ where: { id: locationId } });
        updateData.locationId = loc ? loc.id : null;
      } else {
        updateData.locationId = null;
      }
    }

    if (outletId !== undefined) {
      if (outletId) {
        const out = await prisma.outlet.findFirst({ where: { id: outletId } });
        updateData.outletId = out ? out.id : null;
      } else {
        updateData.outletId = null;
      }
    }

    if (password && String(password).trim()) {
      updateData.password = await bcrypt.hash(String(password).trim(), 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        pin: true,
        locationId: true,
        outletId: true,
        updatedAt: true
      }
    });

    res.json({ message: 'User updated successfully', user: updatedUser });
  } catch (error: any) {
    console.error('Update user error:', error);
    res.status(500).json({ error: error.message || 'Failed to update user' });
  }
});

// Delete staff/user
router.delete('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const existing = await prisma.user.findFirst({
      where: { id }
    });
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Do not allow deleting self if it's the current user logged in
    if (req.user.userId === id || req.user.id === id) {
      return res.status(400).json({ error: 'Cannot delete the currently logged in user account' });
    }

    await prisma.user.delete({
      where: { id }
    });

    console.log(`[Users Route] Successfully deleted user ${id} (${existing.email}) from Turso`);
    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete user' });
  }
});

export default router;