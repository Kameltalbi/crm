import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const previsionnelRoutes = Router();
previsionnelRoutes.use(requireAuth);

previsionnelRoutes.get('/:annee', async (req, res, next) => {
  try {
    const annee = Number(req.params.annee);
    const mois = await prisma.previsionMois.findMany({
      where: { annee },
      orderBy: { mois: 'asc' },
    });

    // Agrégats + croisement avec affaires réalisées
    const affairesReelles = await prisma.affaire.findMany({
      where: { anneePrevue: annee, statut: 'REALISE' },
    });
    const reelParMois: Record<number, number> = {};
    for (const a of affairesReelles) {
      reelParMois[a.moisPrevu] = (reelParMois[a.moisPrevu] || 0) + Number(a.montantHT);
    }

    const data = mois.map(m => {
      const caBilans = Number(m.prixMoyenBilan) * m.nbBilansPrevu;
      const caForm = Number(m.tarifJourFormation) * m.joursFormation;
      const total = caBilans + caForm;
      const commEstim = Math.round(total * Number(m.tauxPartenaire) / 100 * 0.40);
      return {
        ...m,
        prixMoyenBilan:     Number(m.prixMoyenBilan),
        tarifJourFormation: Number(m.tarifJourFormation),
        tauxPartenaire:     Number(m.tauxPartenaire),
        caBilansPrevu:      caBilans,
        caFormationsPrevu:  caForm,
        caTotalPrevu:       total,
        commissionEstimee:  commEstim,
        netEstime:          total - commEstim,
        caReelRealise:      reelParMois[m.mois] || 0,
        chargeJours:        m.nbBilansPrevu * 4 + m.joursFormation,
      };
    });

    const totalHT       = data.reduce((s, m) => s + m.caTotalPrevu, 0);
    const totalComm     = data.reduce((s, m) => s + m.commissionEstimee, 0);
    const totalNet      = totalHT - totalComm;
    const totalBilans   = data.reduce((s, m) => s + m.caBilansPrevu, 0);
    const totalFormat   = data.reduce((s, m) => s + m.caFormationsPrevu, 0);
    const totalReel     = data.reduce((s, m) => s + m.caReelRealise, 0);

    res.json({
      annee,
      mois: data,
      totaux: {
        caBrutHT:        totalHT,
        caBilansHT:      totalBilans,
        caFormationsHT:  totalFormat,
        commissionEstimee: totalComm,
        tvaCollectee:    Math.round(totalHT * 0.19),
        netHT:           totalNet,
        caTTC:           Math.round(totalHT * 1.19),
        caReelRealise:   totalReel,
      },
    });
  } catch (e) { next(e); }
});

previsionnelRoutes.put('/:annee/:mois', async (req, res, next) => {
  try {
    const { annee, mois } = req.params;
    const schema = z.object({
      nbBilansPrevu:     z.number().nonnegative().optional(),
      prixMoyenBilan:    z.number().nonnegative().optional(),
      joursFormation:    z.number().nonnegative().optional(),
      tarifJourFormation:z.number().nonnegative().optional(),
      tauxPartenaire:    z.number().min(0).max(100).optional(),
      notes:             z.string().optional(),
    });
    const data = schema.parse(req.body);

    const updated = await prisma.previsionMois.upsert({
      where:  { annee_mois: { annee: Number(annee), mois: Number(mois) } },
      update: data,
      create: { annee: Number(annee), mois: Number(mois), ...data },
    });
    res.json(updated);
  } catch (e) { next(e); }
});
