import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { ProductType } from '@prisma/client';

export const productsRoutes = Router();
productsRoutes.use(requireAuth);

const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  type: z.nativeEnum(ProductType).optional(),
  active: z.boolean().optional(),
});

// GET /api/products - List all products
productsRoutes.get('/', async (req: AuthRequest, res, next) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(products);
  } catch (e) { next(e); }
});

// GET /api/products/active - List only active products
productsRoutes.get('/active', async (req: AuthRequest, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
    res.json(products);
  } catch (e) { next(e); }
});

// POST /api/products - Create new product
productsRoutes.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = productSchema.parse(req.body);
    const product = await prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        type: data.type || 'SERVICE',
        active: data.active !== undefined ? data.active : true,
      },
    });
    res.status(201).json(product);
  } catch (e) { next(e); }
});

// PUT /api/products/:id - Update product
productsRoutes.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const data = productSchema.partial().parse(req.body);
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data,
    });
    res.json(product);
  } catch (e) { next(e); }
});

// DELETE /api/products/:id - Delete product
productsRoutes.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    await prisma.product.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  } catch (e) { next(e); }
});
