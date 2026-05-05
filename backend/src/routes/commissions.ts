import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import auth, { AuthRequest } from '../middleware/auth.js';
import { checkPlanFeature } from '../middleware/planRestrictions.js';

export const commissionsRoutes = Router();
commissionsRoutes.use(auth);
commissionsRoutes.use(checkPlanFeature('commissions'));

const commissionConfigSchema = z.object({
  name: z.string().min(1).optional(),
  calculationType: z.enum(['SIMPLE', 'TIERS', 'PROGRESSIVE', 'CUSTOM']),
  periodicity: z.enum(['MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL']),
  simpleRate: z.number().min(0).max(100).optional(),
  tierConfig: z.string().optional(),
  progressiveConfig: z.string().optional(),
  customFormula: z.string().optional(),
  minThreshold: z.number().min(0).optional(),
  maxCap: z.union([z.number().min(0), z.string()]).optional(),
  includeNewClients: z.boolean().optional(),
  includeRenewals: z.boolean().optional(),
  includeRecurring: z.boolean().optional(),
  paymentDelay: z.number().min(0).optional(),
});

// GET /api/commissions/config - Get all commission configs for organization
commissionsRoutes.get('/config', async (req: AuthRequest, res, next) => {
  try {
    const configs = await prisma.commissionConfig.findMany({
      where: { organizationId: req.organizationId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(configs);
  } catch (e) { next(e); }
});

// POST /api/commissions/config - Create a new commission config
commissionsRoutes.post('/config', async (req: AuthRequest, res, next) => {
  try {
    const data = commissionConfigSchema.parse(req.body);

    const config = await (prisma.commissionConfig as any).create({
      data: {
        organizationId: req.organizationId!,
        name: data.name || 'Prime',
        calculationType: data.calculationType,
        periodicity: data.periodicity,
        simpleRate: data.simpleRate || 0,
        tierConfig: data.tierConfig,
        progressiveConfig: data.progressiveConfig,
        customFormula: data.customFormula,
        minThreshold: data.minThreshold || 0,
        maxCap: typeof data.maxCap === 'string' ? (data.maxCap === '' ? null : Number(data.maxCap)) : (data.maxCap || null),
        includeNewClients: data.includeNewClients ?? true,
        includeRenewals: data.includeRenewals ?? true,
        includeRecurring: data.includeRecurring ?? true,
        paymentDelay: data.paymentDelay || 30,
      },
    });

    res.json(config);
  } catch (e) { next(e); }
});

// PUT /api/commissions/config/:id - Update a commission config
commissionsRoutes.put('/config/:id', async (req: AuthRequest, res, next) => {
  try {
    const data = commissionConfigSchema.partial().parse(req.body);

    const existing = await prisma.commissionConfig.findFirst({
      where: { id: req.params.id as string, organizationId: req.organizationId },
    });
    if (!existing) return res.status(404).json({ error: 'Configuration introuvable' });

    const config = await (prisma.commissionConfig as any).update({
      where: { id: req.params.id as string },
      data: {
        ...data,
        maxCap: typeof data.maxCap === 'string' ? (data.maxCap === '' ? null : Number(data.maxCap)) : (data.maxCap !== undefined ? (data.maxCap || null) : undefined),
      },
    });

    res.json(config);
  } catch (e) { next(e); }
});

// DELETE /api/commissions/config/:id - Delete a commission config
commissionsRoutes.delete('/config/:id', async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.commissionConfig.findFirst({
      where: { id: req.params.id as string, organizationId: req.organizationId },
    });
    if (!existing) return res.status(404).json({ error: 'Configuration introuvable' });

    await prisma.commissionConfig.delete({ where: { id: req.params.id as string } });
    res.status(204).send();
  } catch (e) { next(e); }
});

// POST /api/commissions/calculate - Calculate commissions automatically for all users
commissionsRoutes.post('/calculate', async (req: AuthRequest, res, next) => {
  try {
    const { year, month } = req.body;

    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || new Date().getMonth() + 1;

    // Get first organization commission config
    const config = await prisma.commissionConfig.findFirst({
      where: { organizationId: req.organizationId },
    });

    if (!config) {
      return res.status(400).json({ error: 'No commission configuration found' });
    }

    // Get all users in the organization
    const users = await prisma.user.findMany({
      where: { organizationId: req.organizationId },
      select: { id: true, name: true },
    });

    const commissions = [];

    for (const user of users) {
      // Get user's objective for the period
      const objective = await prisma.salesObjective.findFirst({
        where: {
          userId: user.id,
          year: currentYear,
          month: currentMonth,
          organizationId: req.organizationId,
        },
      });

      const targetAmount = objective ? Number(objective.targetAmount) : 0;

      // Calculate actual sales for the user (sum of won deals in the period)
      const startDate = new Date(currentYear, currentMonth - 1, 1);
      const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);

      const wonDeals = await prisma.affaire.findMany({
        where: {
          assignedToId: user.id,
          organizationId: req.organizationId,
          statut: 'GAGNE',
          dateClotureReelle: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const salesAmount = wonDeals.reduce((sum, deal) => sum + Number(deal.montantHT), 0);
      const achievementRate = targetAmount > 0 ? (salesAmount / targetAmount) * 100 : 0;

      let commission = 0;
      let calculationDetails = '';

      switch (config.calculationType) {
        case 'SIMPLE':
          commission = salesAmount * (Number(config.simpleRate) / 100);
          calculationDetails = `${Number(config.simpleRate)}% de ${salesAmount.toFixed(2)} DT = ${commission.toFixed(2)} DT`;
          break;

        case 'TIERS':
          if (config.tierConfig) {
            const tiers = JSON.parse(config.tierConfig);
            for (const tier of tiers) {
              if (achievementRate >= tier.min && achievementRate <= tier.max) {
                commission = salesAmount * (tier.rate / 100);
                calculationDetails = `Palier ${tier.min}-${tier.max}% : ${tier.rate}% de ${salesAmount.toFixed(2)} DT = ${commission.toFixed(2)} DT`;
                break;
              }
            }
          }
          break;

        case 'PROGRESSIVE':
          if (config.progressiveConfig) {
            const rules = JSON.parse(config.progressiveConfig);
            for (const rule of rules) {
              if (achievementRate >= rule.min && achievementRate <= rule.max) {
                commission = achievementRate * rule.multiplier;
                calculationDetails = `Progressif (${achievementRate.toFixed(2)}% × ${rule.multiplier}) = ${commission.toFixed(2)} DT`;
                break;
              }
            }
          }
          break;

        case 'CUSTOM':
          calculationDetails = 'Formule personnalisée - à implémenter';
          break;
      }

      // Apply min threshold and max cap
      if (config.minThreshold && commission < Number(config.minThreshold)) {
        commission = 0;
        calculationDetails += ' (en dessous du seuil minimum)';
      }
      if (config.maxCap && commission > Number(config.maxCap)) {
        commission = Number(config.maxCap);
        calculationDetails += ` (plafonné à ${config.maxCap} DT)`;
      }

      commissions.push({
        userId: user.id,
        userName: user.name,
        targetAmount,
        salesAmount,
        achievementRate: achievementRate.toFixed(2),
        commission: commission.toFixed(2),
        calculationDetails,
      });
    }

    res.json({
      year: currentYear,
      month: currentMonth,
      commissions,
    });
  } catch (e) { next(e); }
});
commissionsRoutes.post('/preview', async (req: AuthRequest, res, next) => {
  try {
    const { userId, year, month, salesAmount } = req.body;

    if (!salesAmount || salesAmount < 0) {
      return res.status(400).json({ error: 'Sales amount is required' });
    }

    const config = await prisma.commissionConfig.findFirst({
      where: { organizationId: req.organizationId },
    });

    if (!config) {
      return res.status(400).json({ error: 'No commission configuration found' });
    }

    const objective = userId ? await prisma.salesObjective.findFirst({
      where: {
        userId,
        year,
        month,
        organizationId: req.organizationId,
      },
    }) : null;

    const targetAmount = objective ? Number(objective.targetAmount) : 0;
    const achievementRate = targetAmount > 0 ? (salesAmount / targetAmount) * 100 : 0;

    let commission = 0;
    let calculationDetails = '';

    switch (config.calculationType) {
      case 'SIMPLE':
        commission = salesAmount * (Number(config.simpleRate) / 100);
        calculationDetails = `${Number(config.simpleRate)}% de ${salesAmount} DT = ${commission} DT`;
        break;

      case 'TIERS':
        if (config.tierConfig) {
          const tiers = JSON.parse(config.tierConfig);
          for (const tier of tiers) {
            if (achievementRate >= tier.min && achievementRate <= tier.max) {
              commission = salesAmount * (tier.rate / 100);
              calculationDetails = `Palier ${tier.min}-${tier.max}% : ${tier.rate}% de ${salesAmount} DT = ${commission} DT`;
              break;
            }
          }
        }
        break;

      case 'PROGRESSIVE':
        if (config.progressiveConfig) {
          const rules = JSON.parse(config.progressiveConfig);
          for (const rule of rules) {
            if (achievementRate >= rule.min && achievementRate <= rule.max) {
              commission = achievementRate * rule.multiplier;
              calculationDetails = `Progressif (${achievementRate}% × ${rule.multiplier}) = ${commission} DT`;
              break;
            }
          }
        }
        break;

      case 'CUSTOM':
        calculationDetails = 'Formule personnalisée - calcul à implémenter';
        break;
    }

    // Apply min threshold and max cap
    if (config.minThreshold && commission < Number(config.minThreshold)) {
      commission = 0;
      calculationDetails += ' (en dessous du seuil minimum)';
    }
    if (config.maxCap && commission > Number(config.maxCap)) {
      commission = Number(config.maxCap);
      calculationDetails += ` (plafonné à ${config.maxCap} DT)`;
    }

    res.json({
      salesAmount,
      targetAmount,
      achievementRate: achievementRate.toFixed(2),
      commission: commission.toFixed(2),
      calculationType: config.calculationType,
      calculationDetails,
    });
  } catch (e) { next(e); }
});
