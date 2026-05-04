import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import auth, { AuthRequest } from '../middleware/auth.js';

export const commissionsRoutes = Router();
commissionsRoutes.use(auth);

const commissionConfigSchema = z.object({
  calculationType: z.enum(['SIMPLE', 'TIERS', 'PROGRESSIVE', 'CUSTOM']),
  periodicity: z.enum(['MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL']),
  simpleRate: z.number().min(0).max(100).optional(),
  tierConfig: z.string().optional(),
  progressiveConfig: z.string().optional(),
  customFormula: z.string().optional(),
  minThreshold: z.number().min(0).optional(),
  maxCap: z.number().min(0).optional(),
  includeNewClients: z.boolean().optional(),
  includeRenewals: z.boolean().optional(),
  includeRecurring: z.boolean().optional(),
  paymentDelay: z.number().min(0).optional(),
});

// GET /api/commissions/config - Get organization's commission config
commissionsRoutes.get('/config', async (req: AuthRequest, res, next) => {
  try {
    const config = await prisma.commissionConfig.findUnique({
      where: { organizationId: req.organizationId },
    });

    // If no config exists, return default config
    if (!config) {
      return res.json({
        calculationType: 'SIMPLE',
        periodicity: 'MONTHLY',
        simpleRate: 0,
        minThreshold: 0,
        includeNewClients: true,
        includeRenewals: true,
        includeRecurring: true,
        paymentDelay: 30,
      });
    }

    res.json(config);
  } catch (e) { next(e); }
});

// POST /api/commissions/config - Create or update commission config
commissionsRoutes.post('/config', async (req: AuthRequest, res, next) => {
  try {
    const data = commissionConfigSchema.parse(req.body);

    const config = await prisma.commissionConfig.upsert({
      where: { organizationId: req.organizationId },
      create: {
        organizationId: req.organizationId!,
        calculationType: data.calculationType,
        periodicity: data.periodicity,
        simpleRate: data.simpleRate || 0,
        tierConfig: data.tierConfig,
        progressiveConfig: data.progressiveConfig,
        customFormula: data.customFormula,
        minThreshold: data.minThreshold || 0,
        maxCap: data.maxCap,
        includeNewClients: data.includeNewClients ?? true,
        includeRenewals: data.includeRenewals ?? true,
        includeRecurring: data.includeRecurring ?? true,
        paymentDelay: data.paymentDelay || 30,
      },
      update: {
        calculationType: data.calculationType,
        periodicity: data.periodicity,
        simpleRate: data.simpleRate,
        tierConfig: data.tierConfig,
        progressiveConfig: data.progressiveConfig,
        customFormula: data.customFormula,
        minThreshold: data.minThreshold,
        maxCap: data.maxCap,
        includeNewClients: data.includeNewClients,
        includeRenewals: data.includeRenewals,
        includeRecurring: data.includeRecurring,
        paymentDelay: data.paymentDelay,
      },
    });

    res.json(config);
  } catch (e) { next(e); }
});

// POST /api/commissions/preview - Preview commission calculation
commissionsRoutes.post('/preview', async (req: AuthRequest, res, next) => {
  try {
    const { userId, year, month, salesAmount } = req.body;

    if (!salesAmount || salesAmount < 0) {
      return res.status(400).json({ error: 'Sales amount is required' });
    }

    const config = await prisma.commissionConfig.findUnique({
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
