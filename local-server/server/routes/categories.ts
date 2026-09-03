// @ts-nocheck
import express from 'express';
import { randomUUID } from 'crypto';
import db from '../db.js';
import jwt from 'jsonwebtoken';

const router = express.Router();


const authenticate = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing authorization header' });

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, (process.env.JWT_SECRET || 'fallback_secret'));
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

router.use(authenticate);

// Get all categories
router.get('/', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const categories = await db.selectFrom('Category')
      .selectAll()
      .where('businessId', '=', businessId)
      .orderBy('name', 'asc')
      .execute();
    res.json(categories);
  } catch (error) {
    console.error('Categories GET error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create category
router.post('/', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });

    const category = await db.insertInto('Category')
      .values({
        id: randomUUID(),
        businessId,
        name
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    res.json(category);
  } catch (error) {
    console.error('Categories POST error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category
router.put('/:id', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    const { name } = req.body;
    const category = await db.updateTable('Category')
      .set({ name })
      .where('id', '=', req.params.id)
      .where('businessId', '=', businessId)
      .returningAll()
      .executeTakeFirstOrThrow();
    res.json(category);
  } catch (error) {
    console.error('Categories PUT error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category
router.delete('/:id', async (req: any, res: any) => {
  try {
    const { businessId } = req.user;
    await db.deleteFrom('Category')
      .where('id', '=', req.params.id)
      .where('businessId', '=', businessId)
      .execute();
    res.json({ success: true });
  } catch (error) {
    console.error('Categories DELETE error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
