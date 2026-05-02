import { Router } from 'express';
import auth, { AuthRequest } from '../middleware/auth.js';
import { prisma } from '../db/prisma.js';

export const adminRoutes = Router();
adminRoutes.use(auth);

// Middleware to check if user is admin
const checkAdmin = (req: any, res: any, next: any) => {
  console.log('[Admin Check] User email:', req.user?.email);
  console.log('[Admin Check] Expected: admin@ktoptima.com');
  if (req.user?.email !== 'admin@ktoptima.com') {
    console.log('[Admin Check] Access denied');
    return res.status(403).json({ error: 'Access denied' });
  }
  console.log('[Admin Check] Access granted');
  next();
};

adminRoutes.use(checkAdmin);

// GET /api/admin/stats
adminRoutes.get('/stats', async (req: AuthRequest, res, next) => {
  try {
    console.log('[Admin Stats] Fetching stats...');
    
    const totalUsers = await prisma.user.count();
    console.log('[Admin Stats] Total users:', totalUsers);
    
    const totalOrganizations = await prisma.organization.count();
    console.log('[Admin Stats] Total organizations:', totalOrganizations);
    
    const totalAffaires = await prisma.affaire.count();
    console.log('[Admin Stats] Total affaires:', totalAffaires);
    
    const totalClients = await prisma.client.count();
    console.log('[Admin Stats] Total clients:', totalClients);
    
    const activeSubscriptions = (prisma as any).subscription.count({ where: { statut: 'ACTIF' } });
    const pendingSubscriptions = (prisma as any).subscription.count({ where: { statut: 'EN_ATTENTE' } });

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

    const stats = {
      totalUsers,
      totalOrganizations,
      totalAffaires,
      totalClients,
      activeSubscriptions: await activeSubscriptions,
      pendingSubscriptions: await pendingSubscriptions,
      databaseSize,
      systemUptime,
    };
    
    console.log('[Admin Stats] Returning:', stats);
    res.json(stats);
  } catch (error) {
    console.error('[Admin Stats] Error:', error);
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
