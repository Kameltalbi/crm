import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import auth, { AuthRequest } from '../middleware/auth.js';

export const salesObjectivesRoutes = Router();
salesObjectivesRoutes.use(auth);

const objectiveSchema = z.object({
  userId: z.string().min(1),
  year: z.number().min(2020).max(2035),
  month: z.number().min(1).max(12),
  targetAmount: z.number().positive(),
});

// GET all objectives for organization
salesObjectivesRoutes.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { year, month, userId } = req.query;
    const where: any = { organizationId: req.organizationId };
    if (year) where.year = Number(year);
    if (month) where.month = Number(month);
    if (userId) where.userId = userId;

    const objectives = await prisma.salesObjective.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
      ],
    });

    res.json(objectives);
  } catch (e) { next(e); }
});

// GET single objective
salesObjectivesRoutes.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const objective = await prisma.salesObjective.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.organizationId,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    if (!objective) return res.status(404).json({ error: 'Objectif introuvable' });
    res.json(objective);
  } catch (e) { next(e); }
});

// POST create objective
salesObjectivesRoutes.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = objectiveSchema.parse(req.body);

    // Check if user belongs to organization
    const user = await prisma.user.findFirst({
      where: { id: data.userId, organizationId: req.organizationId },
    });
    if (!user) return res.status(400).json({ error: 'Utilisateur introuvable dans cette organisation' });

    // Check for duplicate (unique constraint)
    const existing = await prisma.salesObjective.findFirst({
      where: {
        organizationId: req.organizationId,
        userId: data.userId,
        year: data.year,
        month: data.month,
      },
    });
    if (existing) return res.status(400).json({ error: 'Un objectif existe déjà pour ce commercial, année et mois' });

    const objective = await prisma.salesObjective.create({
      data: {
        ...data,
        organizationId: req.organizationId!,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(201).json(objective);
  } catch (e) { next(e); }
});

// PUT update objective
salesObjectivesRoutes.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const data = objectiveSchema.partial().parse(req.body);

    // Check if objective exists and belongs to organization
    const existing = await prisma.salesObjective.findFirst({
      where: { id: req.params.id, organizationId: req.organizationId },
    });
    if (!existing) return res.status(404).json({ error: 'Objectif introuvable' });

    // If updating userId, year, or month, check for duplicate
    if (data.userId || data.year || data.month) {
      const checkDuplicate = await prisma.salesObjective.findFirst({
        where: {
          organizationId: req.organizationId,
          userId: data.userId || existing.userId,
          year: data.year || existing.year,
          month: data.month || existing.month,
          id: { not: req.params.id },
        },
      });
      if (checkDuplicate) return res.status(400).json({ error: 'Un objectif existe déjà pour ce commercial, année et mois' });
    }

    const objective = await prisma.salesObjective.update({
      where: { id: req.params.id },
      data,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json(objective);
  } catch (e) { next(e); }
});

// DELETE objective
salesObjectivesRoutes.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const objective = await prisma.salesObjective.findFirst({
      where: { id: req.params.id, organizationId: req.organizationId },
    });
    if (!objective) return res.status(404).json({ error: 'Objectif introuvable' });

    await prisma.salesObjective.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) { next(e); }
});
