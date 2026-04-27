import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const kpisRoutes = Router();
kpisRoutes.use(requireAuth);

// Algorithme de prévision intelligent
function calculateSmartForecast(
  realise: any[],
  pipeline: any[],
  prospect: any[],
  perdu: any[]
) {
  // Taux de conversion historique
  const totalOpportunities = realise.length + pipeline.length + prospect.length + perdu.length;
  const conversionRate = totalOpportunities > 0 ? (realise.length / totalOpportunities) : 0;
  const pipelineToRealiseRate = (realise.length + pipeline.length) > 0 ? (realise.length / (realise.length + pipeline.length)) : 0;
  const prospectToPipelineRate = (prospect.length + pipeline.length) > 0 ? (pipeline.length / (prospect.length + pipeline.length)) : 0;

  // Facteur de confiance basé sur la taille de l'échantillon
  const confidenceScore = Math.min(100, (totalOpportunities / 10) * 100);

  // Prévision pondérée avec taux de conversion réels
  const sum = (arr: any[]) => arr.reduce((s, a) => s + Number(a.montantHT), 0);
  
  const prospectValue = sum(prospect);
  const pipelineValue = sum(pipeline);
  const realiseValue = sum(realise);

  // Ajuster la prospection avec le taux de conversion historique
  const adjustedProspect = prospectValue * Math.max(0.3, prospectToPipelineRate * pipelineToRealiseRate);
  
  // Ajuster le pipeline avec le taux de conversion historique
  const adjustedPipeline = pipelineValue * Math.max(0.5, pipelineToRealiseRate);

  // Prévision totale ajustée
  const forecast = realiseValue + adjustedPipeline + adjustedProspect;

  // Écart type pour l'intervalle de confiance
  const variance = (forecast - realiseValue) * 0.2;
  const lowerBound = Math.max(0, forecast - variance);
  const upperBound = forecast + variance;

  return {
    forecast,
    lowerBound,
    upperBound,
    confidenceScore: Math.round(confidenceScore),
    conversionRates: {
      overall: Math.round(conversionRate * 100),
      prospectToPipeline: Math.round(prospectToPipelineRate * 100),
      pipelineToRealise: Math.round(pipelineToRealiseRate * 100),
    },
    breakdown: {
      realise: realiseValue,
      adjustedPipeline,
      adjustedProspect,
    },
  };
}

// GET /api/kpis?annee=2026
kpisRoutes.get('/', async (req: any, res, next) => {
  try {
    const annee = Number(req.query.annee) || new Date().getFullYear();
    const affaires = await prisma.affaire.findMany({
      where: { anneePrevue: annee, organizationId: req.organizationId },
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

    // Calculer la prévision intelligente
    const smartForecast = calculateSmartForecast(realise, pipeline, prospect, perdu);

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
      smartForecast,
    });
  } catch (e) { next(e); }
});
