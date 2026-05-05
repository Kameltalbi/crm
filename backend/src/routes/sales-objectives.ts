import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import auth, { AuthRequest } from '../middleware/auth.js';
import { checkPlanFeature } from '../middleware/planRestrictions.js';

export const salesObjectivesRoutes = Router();
salesObjectivesRoutes.use(auth);

const objectiveSchema = z.object({
  userId: z.string().min(1),
  year: z.number().min(2020).max(2035),
  period: z.enum(['MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL']).default('MONTHLY'),
  month: z.number().min(1).max(12).optional(),
  quarter: z.number().min(1).max(4).optional(),
  semester: z.number().min(1).max(2).optional(),
  targetAmount: z.number().positive(),
}).refine((data) => {
  if (data.period === 'MONTHLY') return data.month !== undefined;
  if (data.period === 'QUARTERLY') return data.quarter !== undefined;
  if (data.period === 'SEMI_ANNUAL') return data.semester !== undefined;
  return true; // ANNUAL doesn't need month/quarter/semester
}, {
  message: "Le champ requis pour cette période est manquant",
});

// GET all objectives for organization
salesObjectivesRoutes.get('/', checkPlanFeature('objectives'), async (req: AuthRequest, res, next) => {
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
salesObjectivesRoutes.get('/:id', checkPlanFeature('objectives'), async (req: AuthRequest, res, next) => {
  try {
    const objective = await prisma.salesObjective.findFirst({
      where: {
        id: req.params.id as string,
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
salesObjectivesRoutes.post('/', checkPlanFeature('objectives'), async (req: AuthRequest, res, next) => {
  try {
    const data = objectiveSchema.parse(req.body);

    // Check if user belongs to organization
    const user = await prisma.user.findFirst({
      where: { id: data.userId, organizationId: req.organizationId },
    });
    if (!user) return res.status(400).json({ error: 'Utilisateur introuvable dans cette organisation' });

    // Check for duplicate (unique constraint)
    const where: any = {
      organizationId: req.organizationId,
      userId: data.userId,
      year: data.year,
      period: data.period,
    };
    if (data.period === 'MONTHLY') where.month = data.month;
    if (data.period === 'QUARTERLY') where.quarter = data.quarter;
    if (data.period === 'SEMI_ANNUAL') where.semester = data.semester;

    const existing = await prisma.salesObjective.findFirst({ where });
    if (existing) return res.status(400).json({ error: 'Un objectif existe déjà pour ce commercial, année et période' });

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
salesObjectivesRoutes.put('/:id', checkPlanFeature('objectives'), async (req: AuthRequest, res, next) => {
  try {
    const data = objectiveSchema.partial().parse(req.body);

    // Check if objective exists and belongs to organization
    const existing = await prisma.salesObjective.findFirst({
      where: { id: req.params.id as string, organizationId: req.organizationId },
    });
    if (!existing) return res.status(404).json({ error: 'Objectif introuvable' });

    // If updating userId, year, period, or period fields, check for duplicate
    if (data.userId || data.year || data.period || data.month || data.quarter || data.semester) {
      const where: any = {
        organizationId: req.organizationId,
        userId: data.userId || existing.userId,
        year: data.year || existing.year,
        period: data.period || existing.period,
        id: { not: req.params.id as string },
      };
      const period = data.period || existing.period;
      if (period === 'MONTHLY') where.month = data.month ?? existing.month;
      if (period === 'QUARTERLY') where.quarter = data.quarter ?? existing.quarter;
      if (period === 'SEMI_ANNUAL') where.semester = data.semester ?? existing.semester;

      const checkDuplicate = await prisma.salesObjective.findFirst({ where });
      if (checkDuplicate) return res.status(400).json({ error: 'Un objectif existe déjà pour ce commercial, année et période' });
    }

    const objective = await prisma.salesObjective.update({
      where: { id: req.params.id as string },
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
salesObjectivesRoutes.delete('/:id', checkPlanFeature('objectives'), async (req: AuthRequest, res, next) => {
  try {
    const objective = await prisma.salesObjective.findFirst({
      where: { id: req.params.id as string, organizationId: req.organizationId },
    });
    if (!objective) return res.status(404).json({ error: 'Objectif introuvable' });

    await prisma.salesObjective.delete({ where: { id: req.params.id as string } });
    res.status(204).send();
  } catch (e) { next(e); }
});
