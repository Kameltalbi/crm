import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const organizationsRoutes = Router();
organizationsRoutes.use(requireAuth);

const organizationSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  tva: z.string().optional(),
  logoUrl: z.string().optional(),
});

// GET /api/organizations - List all organizations (owner only)
organizationsRoutes.get('/', async (req: AuthRequest, res, next) => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!currentUser || currentUser.role !== 'OWNER') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const organizations = await prisma.organization.findMany({
      include: {
        _count: {
          select: {
            users: true,
            clients: true,
            affaires: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(organizations);
  } catch (e) { next(e); }
});

// GET /api/organizations/:id - Get single organization (owner only)
organizationsRoutes.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!currentUser || currentUser.role !== 'OWNER') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: req.params.id as string },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            users: true,
            clients: true,
            affaires: true,
          },
        },
      },
    });

    if (!organization) return res.status(404).json({ error: 'Organisation introuvable' });
    res.json(organization);
  } catch (e) { next(e); }
});

// POST /api/organizations - Create new organization (owner only)
organizationsRoutes.post('/', async (req: AuthRequest, res, next) => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!currentUser || currentUser.role !== 'OWNER') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const data = organizationSchema.parse(req.body);

    const organization = await prisma.organization.create({
      data,
    });

    res.status(201).json(organization);
  } catch (e) { next(e); }
});

// PUT /api/organizations/:id - Update organization (owner only)
organizationsRoutes.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!currentUser || currentUser.role !== 'OWNER') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const data = organizationSchema.partial().parse(req.body);

    const organization = await prisma.organization.update({
      where: { id: req.params.id as string },
      data,
    });

    res.json(organization);
  } catch (e) { next(e); }
});

// DELETE /api/organizations/:id - Delete organization (owner only)
organizationsRoutes.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!currentUser || currentUser.role !== 'OWNER') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    // Check if organization has users
    const organization = await prisma.organization.findUnique({
      where: { id: req.params.id as string },
      include: { _count: { select: { users: true } } },
    });

    if (!organization) return res.status(404).json({ error: 'Organisation introuvable' });
    if (organization._count.users > 0) {
      return res.status(400).json({ error: 'Impossible de supprimer une organisation avec des utilisateurs' });
    }

    await prisma.organization.delete({
      where: { id: req.params.id as string },
    });

    res.json({ success: true });
  } catch (e) { next(e); }
});
