import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import auth, { requireSuperAdmin, AuthRequest } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export const superadminRoutes = Router();
superadminRoutes.use(auth);
superadminRoutes.use(requireSuperAdmin);

const updatePaymentStatusSchema = z.object({
  paymentStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
});

const updatePlanSchema = z.object({
  plan: z.enum(['FREE', 'BUSINESS', 'ENTERPRISE']),
});

// GET all organizations with payment status
superadminRoutes.get('/organizations', async (req: AuthRequest, res, next) => {
  try {
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        paymentStatus: true,
        plan: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            clients: true,
            affaires: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(organizations);
  } catch (e) { next(e); }
});

// GET organization details
superadminRoutes.get('/organizations/:id', async (req: AuthRequest, res, next) => {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: req.params.id as string },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            role: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            clients: true,
            affaires: true,
            leads: true,
          },
        },
      },
    });
    if (!organization) {
      return res.status(404).json({ error: 'Organisation introuvable' });
    }
    res.json(organization);
  } catch (e) { next(e); }
});

// DELETE organization
superadminRoutes.delete('/organizations/:id', async (req: AuthRequest, res, next) => {
  try {
    const organization = await prisma.organization.delete({
      where: { id: req.params.id as string },
    });
    res.json({ success: true, message: 'Organisation supprimée avec succès' });
  } catch (e) { next(e); }
});

// PUT update payment status
superadminRoutes.put('/organizations/:id/payment-status', async (req: AuthRequest, res, next) => {
  try {
    const { paymentStatus } = updatePaymentStatusSchema.parse(req.body);
    
    const organization = await prisma.organization.update({
      where: { id: req.params.id as string },
      data: { paymentStatus },
    });
    
    res.json(organization);
  } catch (e) { next(e); }
});

// PUT toggle suspend
superadminRoutes.put('/organizations/:id/suspend', async (req: AuthRequest, res, next) => {
  try {
    const { suspended } = req.body;
    
    const organization = await prisma.organization.update({
      where: { id: req.params.id as string },
      data: { suspended },
    });
    
    res.json(organization);
  } catch (e) { next(e); }
});

// PUT update organization plan
superadminRoutes.put('/organizations/:id/plan', async (req: AuthRequest, res, next) => {
  try {
    const { plan } = updatePlanSchema.parse(req.body);
    
    const organization = await prisma.organization.update({
      where: { id: req.params.id as string },
      data: { plan },
    });

    // Update all subscriptions for this organization
    await prisma.subscription.updateMany({
      where: { organizationId: req.params.id as string },
      data: { plan },
    });
    
    res.json(organization);
  } catch (e) { next(e); }
});

// POST sync all subscriptions with organization plans
superadminRoutes.post('/subscriptions/sync-plans', async (req: AuthRequest, res, next) => {
  try {
    const organizations = await prisma.organization.findMany({
      select: { id: true, plan: true },
    });

    let updatedCount = 0;
    for (const org of organizations) {
      const result = await prisma.subscription.updateMany({
        where: { organizationId: org.id },
        data: { plan: org.plan },
      });
      updatedCount += result.count;
    }
    
    res.json({ message: `Synced ${updatedCount} subscriptions`, updatedCount });
  } catch (e) { next(e); }
});

// SUBSCRIPTIONS MANAGEMENT
superadminRoutes.get('/subscriptions', async (req: AuthRequest, res, next) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      include: {
        organization: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    const now = new Date();
    res.json(subscriptions.map((s: any) => ({
      ...s,
      organizationName: s.organization?.name || 'N/A',
      status: s.paymentStatus === 'PAID' && new Date(s.endDate) > now ? 'actif' : 
              s.paymentStatus === 'PENDING' ? 'en_attente' : 
              s.paymentStatus === 'REFUSED' ? 'refusé' : 'expiré',
    })));
  } catch (e) { next(e); }
});

superadminRoutes.post('/subscriptions', async (req: AuthRequest, res, next) => {
  try {
    const { organizationId, plan, price, paymentMethod, startDate, endDate } = req.body;
    
    // Map subscription plan to organization plan
    const orgPlan = plan === 'STARTER' ? 'FREE' : plan === 'PRO' ? 'BUSINESS' : 'ENTERPRISE';
    
    const subscription = await prisma.subscription.create({
      data: {
        organizationId,
        plan,
        price: Number(price),
        paymentMethod,
        paymentStatus: 'PAID',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });
    
    // Update organization plan
    await prisma.organization.update({
      where: { id: organizationId },
      data: { plan: orgPlan },
    });
    
    res.status(201).json(subscription);
  } catch (e) { next(e); }
});

superadminRoutes.put('/subscriptions/:id', async (req: AuthRequest, res, next) => {
  try {
    const { startDate, endDate, paymentStatus } = req.body;
    
    const subscription = await prisma.subscription.update({
      where: { id: req.params.id as string },
      data: {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        paymentStatus: paymentStatus || undefined,
      },
    });
    
    res.json(subscription);
  } catch (e) { next(e); }
});

// GET statistics
superadminRoutes.get('/stats', async (req: AuthRequest, res, next) => {
  try {
    const totalOrganizations = await prisma.organization.count();
    const pendingPayments = await prisma.organization.count({
      where: { paymentStatus: 'PENDING' },
    });
    const approvedPayments = await prisma.organization.count({
      where: { paymentStatus: 'APPROVED' },
    });
    const rejectedPayments = await prisma.organization.count({
      where: { paymentStatus: 'REJECTED' },
    });
    
    const totalUsers = await prisma.user.count();
    const totalClients = await prisma.client.count();
    const totalAffaires = await prisma.affaire.count();
    
    // Calculate MRR (Monthly Recurring Revenue) - simplified
    // In production, this would be calculated from actual subscriptions
    const mrr = 32000; // Placeholder value
    
    // Calculate churn rate (simplified)
    const churnRate = 2.5; // Placeholder - would need historical data
    
    // New clients this month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newClientsThisMonth = await prisma.organization.count({
      where: {
        createdAt: { gte: firstDayOfMonth },
      },
    });
    
    // Active users in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeUsers = await prisma.user.count({
      where: {
        updatedAt: { gte: thirtyDaysAgo },
      },
    });
    
    res.json({
      organizations: {
        total: totalOrganizations,
        pending: pendingPayments,
        approved: approvedPayments,
        rejected: rejectedPayments,
      },
      users: totalUsers,
      clients: totalClients,
      affaires: totalAffaires,
      mrr,
      churnRate,
      newClientsThisMonth,
      activeUsers,
    });
  } catch (e) { next(e); }
});

// USERS MANAGEMENT
superadminRoutes.get('/users', async (req: AuthRequest, res, next) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        organization: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users.map((u: any) => ({
      ...u,
      organizationName: u.organization.name,
      blocked: u.failedLoginAttempts >= 5,
      lastLogin: u.updatedAt,
    })));
  } catch (e) { next(e); }
});

superadminRoutes.post('/users/:userId/block', async (req: AuthRequest, res, next) => {
  try {
    await prisma.user.update({
      where: { id: req.params.userId as string },
      data: { failedLoginAttempts: 5, lockedUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
    });
    res.json({ success: true });
  } catch (e) { next(e); }
});

superadminRoutes.post('/users/:userId/unblock', async (req: AuthRequest, res, next) => {
  try {
    await prisma.user.update({
      where: { id: req.params.userId as string },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// IMPERSONATION
superadminRoutes.post('/impersonate', async (req: AuthRequest, res, next) => {
  try {
    const { userId } = req.body;
    
    // Get the target user
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });
    
    if (!targetUser) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    
    // Store original token
    const originalToken = req.headers.authorization?.replace('Bearer ', '');
    
    // Generate new token for target user
    const accessToken = jwt.sign({ userId: targetUser.id }, process.env.JWT_SECRET!, {
      expiresIn: '15m',
    });
    
    const refreshToken = await prisma.refreshToken.create({
      data: {
        token: crypto.randomBytes(32).toString('hex'),
        userId: targetUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    
    res.json({
      accessToken,
      refreshToken: refreshToken.token,
      originalToken,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role,
        organizationId: targetUser.organizationId,
      },
    });
  } catch (e) { next(e); }
});

// SETTINGS
superadminRoutes.get('/settings', async (req: AuthRequest, res, next) => {
  try {
    // For now, return default settings
    // In production, these would be stored in a database
    res.json({
      currency: 'TND',
      language: 'fr',
      vatRate: 19,
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
    });
  } catch (e) { next(e); }
});

superadminRoutes.put('/settings', async (req: AuthRequest, res, next) => {
  try {
    const { currency, language, vatRate, smtpHost, smtpPort, smtpUser, smtpPassword } = req.body;
    
    // In production, these would be stored in a database
    // For now, just return success
    res.json({
      currency,
      language,
      vatRate,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPassword,
    });
  } catch (e) { next(e); }
});
