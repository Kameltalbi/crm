import { Router } from 'express';
import auth, { AuthRequest } from '../middleware/auth.js';
import { prisma } from '../db/prisma.js';

export const adminRoutes = Router();
adminRoutes.use(auth);

// Middleware to check if user is admin
const checkAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'OWNER') {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

adminRoutes.use(checkAdmin);

// GET /api/admin/stats
adminRoutes.get('/stats', async (req: AuthRequest, res, next) => {
  try {
    const [
      totalUsers,
      totalOrganizations,
      totalAffaires,
      totalClients,
      activeSubscriptions,
      pendingSubscriptions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.organization.count(),
      prisma.affaire.count(),
      prisma.client.count(),
      (prisma as any).subscription.count({ where: { statut: 'ACTIF' } }),
      (prisma as any).subscription.count({ where: { statut: 'EN_ATTENTE' } }),
    ]);

    // Get database size (PostgreSQL specific query)
    const dbSizeResult = await prisma.$queryRaw`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    ` as any[];
    const databaseSize = dbSizeResult[0]?.size || 'N/A';

    // System uptime (simplified - in production, use process.uptime())
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const systemUptime = `${hours}h ${minutes}m`;

    res.json({
      totalUsers,
      totalOrganizations,
      totalAffaires,
      totalClients,
      activeSubscriptions,
      pendingSubscriptions,
      databaseSize,
      systemUptime,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/activity
adminRoutes.get('/activity', async (req: AuthRequest, res, next) => {
  try {
    // Get recent activity from various tables
    const [recentAffaires, recentUsers, recentSubscriptions] = await Promise.all([
      prisma.affaire.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { client: true },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
      (prisma as any).subscription.findMany({
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: { organization: true },
      }),
    ]);

    const activity = [
      ...recentAffaires.map((a: any) => ({
        action: `Nouvelle opportunité: ${a.client?.name || 'N/A'} (${a.montantHT} DT)`,
        timestamp: a.createdAt,
        type: 'affaire',
      })),
      ...recentUsers.map((u: any) => ({
        action: `Nouvel utilisateur: ${u.name}`,
        timestamp: u.createdAt,
        type: 'user',
      })),
      ...recentSubscriptions.map((s: any) => ({
        action: `Abonnement ${s.statut}: ${s.plan} - ${s.organization?.name || 'N/A'}`,
        timestamp: s.createdAt,
        type: 'subscription',
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    res.json(activity);
  } catch (error) {
    next(error);
  }
});
