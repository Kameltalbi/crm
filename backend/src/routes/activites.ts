import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { ActiviteType } from '@prisma/client';

export const activitesRoutes = Router();
activitesRoutes.use(requireAuth);

const activiteSchema = z.object({
  affaireId: z.string(),
  type: z.nativeEnum(ActiviteType),
  title: z.string().min(1),
  content: z.string().optional(),
});

// ─── LIST ─────────────────────────────────────────────────────
activitesRoutes.get('/', async (req, res, next) => {
  try {
    const activites = await prisma.activite.findMany({
      include: { affaire: { include: { client: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(activites);
  } catch (e) { next(e); }
});

// ─── GET single ───────────────────────────────────────────────
activitesRoutes.get('/:id', async (req, res, next) => {
  try {
    const activite = await prisma.activite.findUnique({
      where: { id: req.params.id },
      include: { affaire: { include: { client: true } } },
    });
    if (!activite) return res.status(404).json({ error: 'Activité introuvable' });
    res.json(activite);
  } catch (e) { next(e); }
});

// ─── CREATE ───────────────────────────────────────────────────
activitesRoutes.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = activiteSchema.parse(req.body);
    const activite = await prisma.activite.create({
      data,
      include: { affaire: { include: { client: true } } },
    });
    res.status(201).json(activite);
  } catch (e) { next(e); }
});

// ─── UPDATE ───────────────────────────────────────────────────
activitesRoutes.put('/:id', async (req, res, next) => {
  try {
    const data = activiteSchema.partial().parse(req.body);
    const activite = await prisma.activite.update({
      where: { id: req.params.id },
      data,
      include: { affaire: { include: { client: true } } },
    });
    res.json(activite);
  } catch (e) { next(e); }
});

// ─── DELETE ───────────────────────────────────────────────────
activitesRoutes.delete('/:id', async (req, res, next) => {
  try {
    await prisma.activite.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) { next(e); }
});
