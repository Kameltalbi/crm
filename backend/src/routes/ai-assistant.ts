import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import auth, { AuthRequest } from '../middleware/auth.js';

export const aiAssistantRoutes = Router();
aiAssistantRoutes.use(auth);

const querySchema = z.object({
  message: z.string().min(1),
});

// Predictive analytics
function sortMonthKeys(keys: string[]) {
  return [...keys].sort((a, b) => {
    const [ya, ma] = a.split('-').map((x) => parseInt(x!, 10));
    const [yb, mb] = b.split('-').map((x) => parseInt(x!, 10));
    if (ya !== yb) return ya - yb;
    return ma - mb;
  });
}

async function predictYearEndCA(organizationId: string) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // 1. Toutes les affaires de l'année (sauf PERDU) — cohérent avec le dashboard
  const allAffaires = await prisma.affaire.findMany({
    where: {
      organizationId,
      deletedAt: null,
      anneePrevue: currentYear,
      statut: { not: 'PERDU' },
    },
    select: { montantHT: true, probabilite: true, moisPrevu: true, statut: true },
  });

  // 2. CA Total (comme dashboard) = toutes affaires sauf PERDU
  const caTotalAll = allAffaires.reduce((sum, a) => sum + Number(a.montantHT), 0);

  // 3. CA Réalisé (GAGNE uniquement)
  const realise = allAffaires.filter(a => a.statut === 'GAGNE');
  const caRealise = realise.reduce((sum, a) => sum + Number(a.montantHT), 0);

  // 4. Détail par mois (réalisé GAGNE)
  const monthlyCA: { [key: string]: number } = {};
  for (const a of realise) {
    const key = `${currentYear}-${a.moisPrevu}`;
    monthlyCA[key] = (monthlyCA[key] || 0) + Number(a.montantHT);
  }

  // 5. Pipeline = affaires non gagnées
  const pipeline = allAffaires.filter(a => a.statut !== 'GAGNE');
  const pipelineTotal = pipeline.reduce((sum, a) => sum + Number(a.montantHT), 0);

  // 6. Pipeline pondéré par probabilité
  const pipelinePondere = pipeline.reduce((sum, a) => {
    return sum + Number(a.montantHT) * (a.probabilite / 100);
  }, 0);

  // 7. Moyenne mensuelle réalisée pour extrapoler
  const monthsWithCA = currentMonth - 1 || 1;
  const avgMonthlyCA = caRealise / monthsWithCA;
  const monthsRemaining = 12 - currentMonth + 1;

  // 8. Prédiction = CA réalisé + pipeline pondéré + extrapolation conservatrice
  const extrapolation = Math.max(0, avgMonthlyCA * monthsRemaining - pipelineTotal);
  const predictedCA = Math.round(caRealise + pipelinePondere + extrapolation * 0.5);

  // 9. Taux de croissance vs année précédente
  const prevYearAgg = await prisma.affaire.aggregate({
    where: {
      organizationId,
      deletedAt: null,
      statut: { not: 'PERDU' },
      anneePrevue: currentYear - 1,
    },
    _sum: { montantHT: true },
  });
  const prevYearCA = Number(prevYearAgg._sum.montantHT ?? 0);
  const growthVsPrev = prevYearCA > 0 ? Math.round(((predictedCA - prevYearCA) / prevYearCA) * 100) : 0;

  return {
    caTotalAll: Math.round(caTotalAll),
    caRealise: Math.round(caRealise),
    predictedCA,
    pipelineCA: Math.round(pipelineTotal),
    pipelinePondere: Math.round(pipelinePondere),
    avgGrowth: growthVsPrev,
    monthsData: monthlyCA,
    avgMonthlyCA: Math.round(avgMonthlyCA),
  };
}

async function generateRecommendations(organizationId: string, prediction: any) {
  const recommendations: string[] = [];
  
  // Check if on track
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const monthsPassed = currentMonth;
  const expectedAtThisPoint = (prediction.predictedCA / 12) * monthsPassed;
  
  if (prediction.currentYearCA < expectedAtThisPoint * 0.8) {
    recommendations.push(`⚠️ Vous êtes en retard de ${Math.round((expectedAtThisPoint - prediction.currentYearCA) / 1000) * 1000} DT par rapport à votre tendance.`);
    recommendations.push('💡 Action prioritaire : Contactez vos opportunités en Pipeline avec probabilité > 50%');
  }
  
  // High probability opportunities
  const highProb = await prisma.affaire.findMany({
    where: {
      organizationId,
      deletedAt: null,
      statut: { in: ['PROSPECT', 'QUALIFIE', 'PROPOSITION', 'NEGOCIATION'] },
      probabilite: { gte: 60 },
    },
    orderBy: { montantHT: 'desc' },
    take: 5,
    select: { montantHT: true },
  });
  
  if (highProb.length > 0) {
    recommendations.push(`🎯 ${highProb.length} opportunités à forte probabilité (${highProb.reduce((s, a) => s + Number(a.montantHT), 0).toLocaleString('fr-TN')} DT)`);
  }
  
  // Seasonal patterns
  const months = Object.keys(prediction.monthsData);
  if (months.length >= 12) {
    const monthlyAvgs: { [key: string]: number[] } = {};
    months.forEach(m => {
      const month = m.split('-')[1];
      if (!monthlyAvgs[month]) monthlyAvgs[month] = [];
      monthlyAvgs[month].push(prediction.monthsData[m]);
    });
    
    const avgByMonth: { [key: string]: number } = {};
    Object.keys(monthlyAvgs).forEach(month => {
      avgByMonth[month] = monthlyAvgs[month].reduce((a, b) => a + b, 0) / monthlyAvgs[month].length;
    });
    
    const nextMonth = String((currentMonth % 12) + 1);
    const nextMonthAvg = avgByMonth[nextMonth] || 0;
    if (nextMonthAvg > 0) {
      recommendations.push(`📊 Historiquement, le mois prochain génère en moyenne ${nextMonthAvg.toLocaleString('fr-TN')} DT`);
    }
  }
  
  return recommendations;
}

// Enhanced query processor with predictive features
function processQuery(message: string, organizationId: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Predictive queries
  if (lowerMessage.includes('prédire') || lowerMessage.includes('predire') || lowerMessage.includes('prévision') || lowerMessage.includes('fin d\'année') || lowerMessage.includes('année')) {
    return 'predict_year_end';
  }
  
  if (lowerMessage.includes('conseil') || lowerMessage.includes('recommandation') || lowerMessage.includes('améliorer') || lowerMessage.includes('atteindre')) {
    return 'recommendations';
  }
  
  if (lowerMessage.includes('objectif') || lowerMessage.includes('cible') || lowerMessage.includes('target')) {
    return 'target_analysis';
  }
  
  // Query patterns
  if (lowerMessage.includes('opportunité') || lowerMessage.includes('affaire')) {
    if (lowerMessage.includes('cette semaine') || lowerMessage.includes('semaine')) {
      return 'opportunities_this_week';
    }
    if (lowerMessage.includes('ce mois') || lowerMessage.includes('mois')) {
      return 'opportunities_this_month';
    }
    if (lowerMessage.includes('total') || lowerMessage.includes('combien')) {
      return 'total_opportunities';
    }
    return 'opportunities_list';
  }
  
  if (lowerMessage.includes('ca') || lowerMessage.includes('chiffre') || lowerMessage.includes('revenu')) {
    if (lowerMessage.includes('réalisé') || lowerMessage.includes('realise')) {
      return 'ca_realise';
    }
    if (lowerMessage.includes('prévision') || lowerMessage.includes('prevision')) {
      return 'ca_prevision';
    }
    if (lowerMessage.includes('pipeline')) {
      return 'ca_pipeline';
    }
    return 'ca_total';
  }
  
  if (lowerMessage.includes('client')) {
    if (lowerMessage.includes('combien')) {
      return 'total_clients';
    }
    return 'clients_list';
  }
  
  if (lowerMessage.includes('action') || lowerMessage.includes('priorité') || lowerMessage.includes('faire')) {
    return 'priority_actions';
  }
  
  if (lowerMessage.includes('risque') || lowerMessage.includes('alerte')) {
    return 'risks_alerts';
  }
  
  if (lowerMessage.includes('breakeven') || lowerMessage.includes('point mort') || lowerMessage.includes('équilibre')) {
    return 'breakeven_analysis';
  }
  
  if (lowerMessage.includes('dépense') || lowerMessage.includes('dépense') && (lowerMessage.includes('ca') || lowerMessage.includes('comparer'))) {
    return 'ca_vs_expenses';
  }
  
  return 'unknown';
}

// Execute query based on intent
async function executeQuery(intent: string, organizationId: string) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  switch (intent) {
    case 'predict_year_end': {
      const prediction = await predictYearEndCA(organizationId);
      return {
        type: 'prediction',
        title: 'Prédiction CA fin d\'année',
        caTotalAll: prediction.caTotalAll,
        caRealise: prediction.caRealise,
        predictedCA: prediction.predictedCA,
        pipelineCA: prediction.pipelineCA,
        pipelinePondere: prediction.pipelinePondere,
        avgMonthlyCA: prediction.avgMonthlyCA,
        growth: prediction.avgGrowth,
        monthsData: prediction.monthsData,
      };
    }
    
    case 'recommendations': {
      const prediction = await predictYearEndCA(organizationId);
      const recommendations = await generateRecommendations(organizationId, prediction);
      return {
        type: 'recommendations',
        title: 'Recommandations personnalisées',
        recommendations,
        prediction,
      };
    }
    
    case 'target_analysis': {
      const prediction = await predictYearEndCA(organizationId);
      const recommendations = await generateRecommendations(organizationId, prediction);
      const monthsRemaining = 12 - currentMonth;
      const monthlyTarget = prediction.predictedCA / 12;
      return {
        type: 'target_analysis',
        title: 'Analyse des objectifs',
        currentCA: prediction.currentYearCA,
        predictedCA: prediction.predictedCA,
        monthlyTarget,
        monthsRemaining,
        recommendations,
      };
    }

    case 'opportunities_this_week': {
      const weekAffaires = await prisma.affaire.findMany({
        where: {
          organizationId,
          deletedAt: null,
          createdAt: { gte: weekAgo },
        },
        include: { client: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
      return {
        type: 'list',
        title: `Opportunités cette semaine (${weekAffaires.length})`,
        data: weekAffaires.map(a => ({
          client: a.client?.name || 'N/A',
          montant: Number(a.montantHT).toLocaleString('fr-TN') + ' DT',
          statut: a.statut,
        })),
      };
    }
    
    case 'opportunities_this_month': {
      const monthAffaires = await prisma.affaire.findMany({
        where: {
          organizationId,
          deletedAt: null,
          moisPrevu: currentMonth,
          anneePrevue: currentYear,
        },
        include: { client: { select: { name: true } } },
        orderBy: { montantHT: 'desc' },
        take: 150,
      });
      return {
        type: 'list',
        title: `Opportunités ce mois (${monthAffaires.length})`,
        data: monthAffaires.map((a: any) => ({
          client: a.client?.name || 'N/A',
          montant: Number(a.montantHT).toLocaleString('fr-TN') + ' DT',
          statut: a.statut,
          score: a.score || 0,
        })),
      };
    }
    
    case 'total_opportunities': {
      const totalAffaires = await prisma.affaire.count({
        where: { organizationId, deletedAt: null },
      });
      return {
        type: 'metric',
        title: 'Total opportunités',
        value: totalAffaires.toString(),
      };
    }
    
    case 'ca_realise': {
      const yearStart = new Date(currentYear, 0, 1);
      const yearEnd = new Date(currentYear + 1, 0, 1);
      const [closedInYear, wonNoCloseInYear] = await Promise.all([
        prisma.affaire.aggregate({
          where: {
            organizationId,
            deletedAt: null,
            statut: 'GAGNE',
            dateClotureReelle: { gte: yearStart, lt: yearEnd },
          },
          _sum: { montantHT: true },
        }),
        prisma.affaire.aggregate({
          where: {
            organizationId,
            deletedAt: null,
            statut: 'GAGNE',
            dateClotureReelle: null,
            createdAt: { gte: yearStart, lt: yearEnd },
          },
          _sum: { montantHT: true },
        }),
      ]);
      const caRealiseCurrentYear =
        Number(closedInYear._sum.montantHT ?? 0) + Number(wonNoCloseInYear._sum.montantHT ?? 0);

      return {
        type: 'metric',
        title: `CA réalisé ${currentYear}`,
        value: caRealiseCurrentYear.toLocaleString('fr-TN') + ' DT',
      };
    }
    
    case 'ca_pipeline': {
      const pipelineAgg = await prisma.affaire.aggregate({
        where: {
          organizationId,
          deletedAt: null,
          statut: { in: ['QUALIFIE', 'PROPOSITION', 'NEGOCIATION'] },
          moisPrevu: currentMonth,
          anneePrevue: currentYear,
        },
        _sum: { montantHT: true },
      });
      const caPipeline = Number(pipelineAgg._sum.montantHT ?? 0);
      return {
        type: 'metric',
        title: `CA pipeline ce mois`,
        value: caPipeline.toLocaleString('fr-TN') + ' DT',
      };
    }
    
    case 'ca_total': {
      const agg = await prisma.affaire.aggregate({
        where: { organizationId, deletedAt: null },
        _sum: { montantHT: true },
      });
      const caTotal = Number(agg._sum.montantHT ?? 0);
      return {
        type: 'metric',
        title: 'CA total',
        value: caTotal.toLocaleString('fr-TN') + ' DT',
      };
    }
    
    case 'total_clients': {
      const totalClients = await prisma.client.count({
        where: { organizationId, deletedAt: null },
      });
      return {
        type: 'metric',
        title: 'Total clients',
        value: totalClients.toString(),
      };
    }
    
    case 'clients_list': {
      const clients = await prisma.client.findMany({
        where: { organizationId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { name: true, email: true, phone: true },
      });
      return {
        type: 'list',
        title: `Derniers clients (${clients.length})`,
        data: clients.map(c => ({
          nom: c.name,
          email: c.email || 'N/A',
          telephone: c.phone || 'N/A',
        })),
      };
    }
    
    case 'priority_actions': {
      const highScoreAffaires = await prisma.affaire.findMany({
        where: {
          organizationId,
          deletedAt: null,
          statut: { in: ['PROSPECT', 'QUALIFIE', 'PROPOSITION', 'NEGOCIATION'] },
        },
        include: { client: { select: { name: true } } },
        orderBy: { montantHT: 'desc' },
        take: 5,
      });
      return {
        type: 'list',
        title: 'Actions prioritaires',
        data: (highScoreAffaires as any[]).map(a => ({
          client: a.client?.name || 'N/A',
          montant: Number(a.montantHT).toLocaleString('fr-TN') + ' DT',
        })),
      };
    }
    
    case 'risks_alerts': {
      const oldPipeline = await prisma.affaire.findMany({
        where: {
          organizationId,
          deletedAt: null,
          statut: { in: ['QUALIFIE', 'PROPOSITION', 'NEGOCIATION'] },
          createdAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        include: { client: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
        take: 40,
      });
      return {
        type: 'list',
        title: `Alertes opportunités à risque (${oldPipeline.length})`,
        data: (oldPipeline as any[]).map(a => ({
          client: a.client?.name || 'N/A',
          montant: Number(a.montantHT).toLocaleString('fr-TN') + ' DT',
          alerte: 'En pipeline depuis plus de 30 jours',
        })),
      };
    }
    
    case 'breakeven_analysis': {
      const [caAgg, expAgg] = await Promise.all([
        prisma.affaire.aggregate({
          where: { organizationId, deletedAt: null, statut: 'GAGNE' },
          _sum: { montantHT: true },
        }),
        prisma.expense.aggregate({
          where: { organizationId, deletedAt: null },
          _sum: { amount: true },
        }),
      ]);
      const caTotalBE = Number(caAgg._sum.montantHT ?? 0);
      const expensesTotal = Number(expAgg._sum.amount ?? 0);
      
      const profit = caTotalBE - expensesTotal;
      const margin = caTotalBE > 0 ? ((profit / caTotalBE) * 100).toFixed(1) : 0;
      const breakevenStatus = profit >= 0 ? 'Rentable' : 'Déficitaire';
      
      return {
        type: 'text',
        title: 'Analyse Breakeven',
        value: `CA Total: ${caTotalBE.toLocaleString('fr-TN')} DT\nDépenses: ${expensesTotal.toLocaleString('fr-TN')} DT\nProfit/Perte: ${profit.toLocaleString('fr-TN')} DT\nMarge: ${margin}%\nStatut: ${breakevenStatus}`,
      };
    }
    
    case 'ca_vs_expenses': {
      const yearStart = new Date(currentYear, 0, 1);
      const yearEnd = new Date(currentYear + 1, 0, 1);
      const [caYearAgg, expYearAgg] = await Promise.all([
        prisma.affaire.aggregate({
          where: {
            organizationId,
            deletedAt: null,
            anneePrevue: currentYear,
          },
          _sum: { montantHT: true },
        }),
        prisma.expense.aggregate({
          where: {
            organizationId,
            deletedAt: null,
            date: { gte: yearStart, lt: yearEnd },
          },
          _sum: { amount: true },
        }),
      ]);
      const caYear = Number(caYearAgg._sum.montantHT ?? 0);
      const expensesYearTotal = Number(expYearAgg._sum.amount ?? 0);
      
      const ratio = caYear > 0 ? ((expensesYearTotal / caYear) * 100).toFixed(1) : 0;
      
      return {
        type: 'text',
        title: `Comparaison CA/Dépenses ${currentYear}`,
        value: `CA: ${caYear.toLocaleString('fr-TN')} DT\nDépenses: ${expensesYearTotal.toLocaleString('fr-TN')} DT\nRatio dépenses/CA: ${ratio}%`,
      };
    }
    
    default:
      return {
        type: 'text',
        title: 'Je n\'ai pas compris',
        value: 'Essayez: "Combien d\'opportunités ?", "CA ce mois", "Actions prioritaires", "Alertes"',
      };
  }
}

// POST /api/ai-assistant/query
aiAssistantRoutes.post('/query', async (req: AuthRequest, res, next) => {
  try {
    const { message } = querySchema.parse(req.body);
    
    const intent = processQuery(message, req.organizationId!);
    const result = await executeQuery(intent, req.organizationId!);
    
    res.json({
      intent,
      result,
    });
  } catch (e) { next(e); }
});
