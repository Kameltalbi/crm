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
async function predictYearEndCA(organizationId: string) {
  const currentYear = new Date().getFullYear();
  
  // Get historical CA by month
  const affaires = await prisma.affaire.findMany({
    where: { 
      organizationId,
      statut: 'GAGNE',
      anneePrevue: { lte: currentYear },
    },
  });
  
  // Group by month
  const monthlyCA: { [key: string]: number } = {};
  affaires.forEach(a => {
    const key = `${a.anneePrevue}-${a.moisPrevu}`;
    monthlyCA[key] = (monthlyCA[key] || 0) + Number(a.montantHT);
  });
  
  // Calculate average monthly growth
  const months = Object.keys(monthlyCA).sort();
  let growthRates: number[] = [];
  for (let i = 1; i < months.length; i++) {
    const prev = monthlyCA[months[i - 1]] || 0;
    const curr = monthlyCA[months[i]] || 0;
    if (prev > 0) {
      growthRates.push((curr - prev) / prev);
    }
  }
  
  const avgGrowth = growthRates.length > 0 
    ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length 
    : 0;
  
  // Get current year CA so far
  const currentYearCA = affaires
    .filter(a => a.anneePrevue === currentYear)
    .reduce((sum, a) => sum + Number(a.montantHT), 0);
  
  // Get pipeline CA for remaining months
  const currentMonth = String(new Date().getMonth() + 1);
  const remainingMonths = months.filter(m => {
    const [year, month] = m.split('-');
    return parseInt(year) === currentYear && parseInt(month) > parseInt(currentMonth);
  });
  
  const pipelineCA = await prisma.affaire.findMany({
    where: {
      organizationId,
      statut: { in: ['QUALIFIE', 'PROPOSITION', 'NEGOCIATION'] },
      anneePrevue: String(currentYear),
      moisPrevu: { in: remainingMonths.map(m => parseInt(m.split('-')[1])) },
    } as any,
  });
  
  const pipelineTotal = pipelineCA.reduce((sum, a) => sum + Number(a.montantHT), 0);
  
  // Predict based on trend + pipeline
  const predictedCA = currentYearCA + pipelineTotal * (1 + avgGrowth);
  
  return {
    currentYearCA,
    predictedCA,
    pipelineCA: pipelineTotal,
    avgGrowth: Math.round(avgGrowth * 100),
    monthsData: monthlyCA,
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
      statut: { in: ['PROSPECT', 'QUALIFIE', 'PROPOSITION', 'NEGOCIATION'] },
      probabilite: { gte: 60 },
    },
    orderBy: { montantHT: 'desc' },
    take: 5,
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
        currentCA: prediction.currentYearCA,
        predictedCA: prediction.predictedCA,
        pipelineCA: prediction.pipelineCA,
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
          createdAt: { gte: weekAgo }
        },
        include: { client: true },
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
          moisPrevu: currentMonth,
          anneePrevue: currentYear,
        },
        include: { client: true },
        orderBy: { montantHT: 'desc' },
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
        where: { organizationId },
      });
      return {
        type: 'metric',
        title: 'Total opportunités',
        value: totalAffaires.toString(),
      };
    }
    
    case 'ca_realise': {
      const realiseAffaires = await prisma.affaire.findMany({
        where: { 
          organizationId,
          statut: 'GAGNE',
        },
      });
      // Filter by actual close date or current year
      const currentYearAffaires = realiseAffaires.filter(a => {
        const closeDate = a.dateClotureReelle ? new Date(a.dateClotureReelle) : null;
        const createDate = new Date(a.createdAt);
        const year = closeDate ? closeDate.getFullYear() : createDate.getFullYear();
        return year === currentYear;
      });
      const caRealiseCurrentYear = currentYearAffaires.reduce((sum, a) => sum + Number(a.montantHT), 0);
      
      console.log('DEBUG CA Réalisé:', {
        totalRealise: realiseAffaires.length,
        currentYearAffaires: currentYearAffaires.length,
        currentYear,
        affaires: currentYearAffaires.map(a => ({
          id: a.id,
          montant: Number(a.montantHT),
          dateClotureReelle: a.dateClotureReelle,
          createdAt: a.createdAt,
        })),
      });
      
      return {
        type: 'metric',
        title: `CA réalisé ${currentYear}`,
        value: caRealiseCurrentYear.toLocaleString('fr-TN') + ' DT',
      };
    }
    
    case 'ca_pipeline': {
      const pipelineAffaires = await prisma.affaire.findMany({
        where: { 
          organizationId,
          statut: { in: ['QUALIFIE', 'PROPOSITION', 'NEGOCIATION'] },
          moisPrevu: currentMonth,
          anneePrevue: currentYear,
        },
      });
      const caPipeline = pipelineAffaires.reduce((sum, a) => sum + Number(a.montantHT), 0);
      return {
        type: 'metric',
        title: `CA pipeline ce mois`,
        value: caPipeline.toLocaleString('fr-TN') + ' DT',
      };
    }
    
    case 'ca_total': {
      const allAffaires = await prisma.affaire.findMany({
        where: { organizationId },
      });
      const caTotal = allAffaires.reduce((sum, a) => sum + Number(a.montantHT), 0);
      return {
        type: 'metric',
        title: 'CA total',
        value: caTotal.toLocaleString('fr-TN') + ' DT',
      };
    }
    
    case 'total_clients': {
      const totalClients = await prisma.client.count({
        where: { organizationId },
      });
      return {
        type: 'metric',
        title: 'Total clients',
        value: totalClients.toString(),
      };
    }
    
    case 'clients_list': {
      const clients = await prisma.client.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 10,
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
          statut: { in: ['PROSPECT', 'QUALIFIE', 'PROPOSITION', 'NEGOCIATION'] },
        },
        include: { client: true },
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
          statut: { in: ['QUALIFIE', 'PROPOSITION', 'NEGOCIATION'] },
          createdAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // 30 days
        },
        include: { client: true },
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
      const allAffairesBE = await prisma.affaire.findMany({
        where: { organizationId, statut: 'GAGNE' },
      });
      const caTotalBE = allAffairesBE.reduce((sum, a) => sum + Number(a.montantHT), 0);
      
      const allExpenses = await prisma.expense.findMany({
        where: { organizationId },
      });
      const expensesTotal = allExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      
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
      const affairesYear = await prisma.affaire.findMany({
        where: { organizationId, anneePrevue: currentYear },
      });
      const caYear = affairesYear.reduce((sum, a) => sum + Number(a.montantHT), 0);
      
      const expensesYear = await prisma.expense.findMany({
        where: { 
          organizationId,
          date: { gte: new Date(currentYear, 0, 1) },
        },
      });
      const expensesYearTotal = expensesYear.reduce((sum, e) => sum + Number(e.amount), 0);
      
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
