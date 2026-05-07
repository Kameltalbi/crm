import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import auth, { AuthRequest, requireSuperAdmin } from '../middleware/auth.js';

export const subscriptionsRoutes = Router();
subscriptionsRoutes.use(auth);

const subscriptionSchema = z.object({
  plan: z.enum(['STARTER', 'PRO']),
  paymentMethod: z.enum(['VIREMENT', 'ESPECES']),
});

// PLANS CONFIGURATION
const PLANS = {
  STARTER: {
    monthlyPrice: 30,
    annualPrice: 360,
    maxUsers: 1,
    features: ['3 opportunités', '1 utilisateur', 'Email templates de base', 'Support email'],
  },
  PRO: {
    monthlyPrice: 50,
    annualPrice: 600,
    maxUsers: 5,
    features: [
      'Opportunités illimitées',
      '5 utilisateurs',
      'Assistant IA conversationnel',
      'Lead scoring automatique',
      'Intégration Softfacture',
      'Support prioritaire',
      'Backup quotidien',
    ],
  },
};

// GET /api/subscriptions/plans - Get available plans
subscriptionsRoutes.get('/plans', (_, res) => {
  res.json(PLANS);
});

// GET /api/subscriptions/current - Get current organization subscription
subscriptionsRoutes.get('/current', async (req: AuthRequest, res, next) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        organizationId: req.organizationId,
        paymentStatus: 'PAID',
        endDate: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(subscription);
  } catch (e) { next(e); }
});

// POST /api/subscriptions - Create subscription request
subscriptionsRoutes.post('/', async (req: AuthRequest, res, next) => {
  try {
    const { plan, paymentMethod } = subscriptionSchema.parse(req.body);
    const planConfig = PLANS[plan as keyof typeof PLANS];

    // Check if organization already has active subscription
    const existing = await prisma.subscription.findFirst({
      where: {
        organizationId: req.organizationId,
        paymentStatus: 'PAID',
        endDate: { gte: new Date() },
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Vous avez déjà un abonnement actif' });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    const subscription = await prisma.subscription.create({
      data: {
        organizationId: req.organizationId!,
        plan,
        price: planConfig.annualPrice,
        paymentMethod,
        paymentStatus: 'PENDING',
        startDate,
        endDate,
      },
    });

    res.status(201).json(subscription);
  } catch (e) { next(e); }
});

// POST /api/subscriptions/:id/confirm - Confirm payment (admin only)
subscriptionsRoutes.post('/:id/confirm', requireSuperAdmin, async (req: AuthRequest, res, next) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { id: req.params.id as string },
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Abonnement introuvable' });
    }

    const updated = await prisma.subscription.update({
      where: { id: req.params.id as string },
      data: { paymentStatus: 'PAID' },
    });

    res.json(updated);
  } catch (e) { next(e); }
});
