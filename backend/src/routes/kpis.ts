import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const kpisRoutes = Router();
kpisRoutes.use(requireAuth);

// GET /api/kpis?annee=2026
kpisRoutes.get('/', async (req, res, next) => {
  try {
    const annee = Number(req.query.annee) || new Date().getFullYear();
    const affaires = await prisma.affaire.findMany({
      where: { anneePrevue: annee },
      include: { client: true },
    });

    const realise  = affaires.filter(a => a.statut === 'REALISE');
    const pipeline = affaires.filter(a => a.statut === 'PIPELINE');
    const prospect = affaires.filter(a => a.statut === 'PROSPECTION');
    const perdu    = affaires.filter(a => a.statut === 'PERDU');

    const sum = (arr: typeof affaires) =>
      arr.reduce((s, a) => s + Number(a.montantHT), 0);

    const commissionDue = realise
      .filter(a => a.viaPartenaire)
      .reduce((s, a) => s + Number(a.montantHT) * (Number(a.tauxCommission) / 100), 0);

    const netRealise = sum(realise) - commissionDue;
    const netPondere = sum(realise) +
      pipeline.reduce((s, a) => s + Number(a.montantHT) * (a.probabilite / 100), 0);

    // Répartition par type
    const ca_bilans     = sum(affaires.filter(a => a.type === 'BILAN_CARBONE'));
    const ca_formations = sum(affaires.filter(a => a.type === 'FORMATION'));

    // Distribution mensuelle
    const parMois: Record<number, { realise: number; pipeline: number; prospect: number }> = {};
    for (let m = 1; m <= 12; m++) parMois[m] = { realise: 0, pipeline: 0, prospect: 0 };
    for (const a of affaires) {
      const k = a.statut === 'REALISE' ? 'realise' :
                a.statut === 'PIPELINE' ? 'pipeline' :
                a.statut === 'PROSPECTION' ? 'prospect' : null;
      if (k) parMois[a.moisPrevu][k] += Number(a.montantHT);
    }

    res.json({
      annee,
      caRealise: sum(realise),
      caPipeline: sum(pipeline),
      caProspection: sum(prospect),
      caTotal: sum([...realise, ...pipeline, ...prospect]),
      caPondere: netPondere,
      commissionPartenaireDue: commissionDue,
      netRealise,
      caBilans: ca_bilans,
      caFormations: ca_formations,
      counts: {
        realise: realise.length,
        pipeline: pipeline.length,
        prospect: prospect.length,
        perdu: perdu.length,
      },
      parMois,
    });
  } catch (e) { next(e); }
});
