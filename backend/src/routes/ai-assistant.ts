import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import auth, { AuthRequest } from '../middleware/auth.js';

export const aiAssistantRoutes = Router();
aiAssistantRoutes.use(auth);

const querySchema = z.object({
  message: z.string().min(1),
});

// Simple natural language query processor
function processQuery(message: string, organizationId: string): string {
  const lowerMessage = message.toLowerCase();
  
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
    case 'opportunities_this_week':
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
      
    case 'opportunities_this_month':
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
      
    case 'total_opportunities':
      const totalAffaires = await prisma.affaire.count({
        where: { organizationId },
      });
      return {
        type: 'metric',
        title: 'Total opportunités',
        value: totalAffaires.toString(),
      };
      
    case 'ca_realise':
      const realiseAffaires = await prisma.affaire.findMany({
        where: { 
          organizationId,
          statut: 'REALISE',
          anneePrevue: currentYear,
        },
      });
      const caRealise = realiseAffaires.reduce((sum, a) => sum + Number(a.montantHT), 0);
      return {
        type: 'metric',
        title: `CA réalisé ${currentYear}`,
        value: caRealise.toLocaleString('fr-TN') + ' DT',
      };
      
    case 'ca_pipeline':
      const pipelineAffaires = await prisma.affaire.findMany({
        where: { 
          organizationId,
          statut: 'PIPELINE',
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
      
    case 'ca_total':
      const allAffaires = await prisma.affaire.findMany({
        where: { organizationId },
      });
      const caTotal = allAffaires.reduce((sum, a) => sum + Number(a.montantHT), 0);
      return {
        type: 'metric',
        title: 'CA total',
        value: caTotal.toLocaleString('fr-TN') + ' DT',
      };
      
    case 'total_clients':
      const totalClients = await prisma.client.count({
        where: { organizationId },
      });
      return {
        type: 'metric',
        title: 'Total clients',
        value: totalClients.toString(),
      };
      
    case 'clients_list':
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
      
    case 'priority_actions':
      const highScoreAffaires = await prisma.affaire.findMany({
        where: { 
          organizationId,
          statut: { in: ['PROSPECTION', 'PIPELINE'] },
        },
        include: { client: true },
        orderBy: { montantHT: 'desc' },
        take: 5,
      });
      return {
        type: 'list',
        title: 'Actions prioritaires',
        data: (highScoreAffaires as any[]).map(a => ({
          action: a.statut === 'PIPELINE' ? 'Confirmer' : 'Contacter',
          client: a.client?.name || 'N/A',
          montant: Number(a.montantHT).toLocaleString('fr-TN') + ' DT',
        })),
      };
      
    case 'risks_alerts':
      const oldPipeline = await prisma.affaire.findMany({
        where: { 
          organizationId,
          statut: 'PIPELINE',
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
      
    case 'breakeven_analysis':
      const allAffairesBE = await prisma.affaire.findMany({
        where: { organizationId, statut: 'REALISE' },
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
      
    case 'ca_vs_expenses':
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
