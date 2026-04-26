import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { AffaireType, StatutAffaire } from '@prisma/client';

export const affairesRoutes = Router();
affairesRoutes.use(requireAuth);

const affaireSchema = z.object({
  clientId: z.string(),
  productId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.nativeEnum(AffaireType),
  montantHT: z.number().nonnegative(),
  statut: z.nativeEnum(StatutAffaire).optional(),
  probabilite: z.number().min(0).max(100).optional(),
  moisPrevu: z.number().min(1).max(12),
  anneePrevue: z.number().min(2025).max(2030),
  viaPartenaire: z.boolean().optional(),
  tauxCommission: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

// ─── LIST avec filtres ──────────────────────────────────────────
affairesRoutes.get('/', async (req, res, next) => {
  try {
    const { statut, type, annee, viaPartenaire } = req.query;
    const where: any = {};
    if (statut)        where.statut = statut;
    if (type)          where.type = type;
    if (annee)         where.anneePrevue = Number(annee);
    if (viaPartenaire) where.viaPartenaire = viaPartenaire === 'true';

    const affaires = await prisma.affaire.findMany({
      where,
      include: { client: true, product: true, _count: { select: { activites: true } } },
      orderBy: [{ anneePrevue: 'desc' }, { moisPrevu: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(affaires);
  } catch (e) { next(e); }
});

// ─── GET single avec activités ──────────────────────────────────
affairesRoutes.get('/:id', async (req, res, next) => {
  try {
    const affaire = await prisma.affaire.findUnique({
      where: { id: req.params.id },
      include: {
        client: true,
        product: true,
        activites: { orderBy: { createdAt: 'desc' } },
        emails:    { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!affaire) return res.status(404).json({ error: 'Affaire introuvable' });
    res.json(affaire);
  } catch (e) { next(e); }
});

// ─── CREATE ──────────────────────────────────────────────────────
affairesRoutes.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = affaireSchema.parse(req.body);
    const affaire = await prisma.affaire.create({
      data: { ...data, createdById: req.userId },
      include: { client: true, product: true },
    });
    // Log activité
    await prisma.activite.create({
      data: {
        affaireId: affaire.id,
        type: 'AUTRE',
        title: 'Affaire créée',
        content: `Nouvelle affaire : ${affaire.title}`,
      },
    });
    res.status(201).json(affaire);
  } catch (e) { next(e); }
});

// ─── UPDATE ──────────────────────────────────────────────────────
affairesRoutes.put('/:id', async (req, res, next) => {
  try {
    const data = affaireSchema.partial().parse(req.body);
    const existing = await prisma.affaire.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Affaire introuvable' });

    const affaire = await prisma.affaire.update({
      where: { id: req.params.id },
      data,
      include: { client: true, product: true },
    });

    // Log changement de statut
    if (data.statut && data.statut !== existing.statut) {
      await prisma.activite.create({
        data: {
          affaireId: affaire.id,
          type: 'CHANGEMENT_STATUT',
          title: `Statut : ${existing.statut} → ${data.statut}`,
          content: `Montant : ${affaire.montantHT} DT`,
        },
      });
      if (data.statut === 'REALISE') {
        await prisma.affaire.update({
          where: { id: affaire.id },
          data: { dateClotureReelle: new Date() },
        });
      }
    }
    res.json(affaire);
  } catch (e) { next(e); }
});

// ─── DELETE ──────────────────────────────────────────────────────
affairesRoutes.delete('/:id', async (req, res, next) => {
  try {
    await prisma.affaire.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// ─── ADD ACTIVITY ────────────────────────────────────────────────
affairesRoutes.post('/:id/activites', async (req, res, next) => {
  try {
    const schema = z.object({
      type: z.enum(['NOTE', 'APPEL', 'EMAIL_ENVOYE', 'EMAIL_RECU', 'RDV', 'AUTRE']),
      title: z.string().min(1),
      content: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const activite = await prisma.activite.create({
      data: { ...data, affaireId: req.params.id },
    });
    res.status(201).json(activite);
  } catch (e) { next(e); }
});
