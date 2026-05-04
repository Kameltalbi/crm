import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import auth, { requireSuperAdmin, AuthRequest } from '../middleware/auth.js';

export const superadminRoutes = Router();
superadminRoutes.use(auth);
superadminRoutes.use(requireSuperAdmin);

const updatePaymentStatusSchema = z.object({
  paymentStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
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
    });
  } catch (e) { next(e); }
});
