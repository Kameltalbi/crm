import { Router } from 'express';
import auth, { AuthRequest } from '../middleware/auth.js';
import { prisma } from '../db/prisma.js';

export const adminRoutes = Router();
adminRoutes.use(auth);

const checkAdmin = async (req: any, res: any, next: any) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(403).json({ error: 'Access denied' });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (user?.email !== 'admin@ktoptima.com') return res.status(403).json({ error: 'Access denied' });
    next();
  } catch { return res.status(500).json({ error: 'Internal error' }); }
};
adminRoutes.use(checkAdmin);

// ─── DASHBOARD STATS ────────────────────────────────────────
adminRoutes.get('/stats', async (_req: AuthRequest, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [totalOrganizations, totalUsers, totalClients, totalAffaires] = await Promise.all([
      prisma.organization.count(), prisma.user.count(), prisma.client.count(), prisma.affaire.count(),
    ]);
    let activeSubscriptions = 0, pendingPayments = 0, paidThisMonth = 0, expiredSubscriptions = 0, caThisMonth = 0;
    try {
      activeSubscriptions = await (prisma as any).subscription.count({ where: { paymentStatus: 'PAID', endDate: { gte: now } } });
      pendingPayments = await (prisma as any).subscription.count({ where: { paymentStatus: 'PENDING' } });
      paidThisMonth = await (prisma as any).subscription.count({ where: { paymentStatus: 'PAID', updatedAt: { gte: startOfMonth } } });
      expiredSubscriptions = await (prisma as any).subscription.count({ where: { paymentStatus: 'PAID', endDate: { lt: now } } });
      const paidSubs = await (prisma as any).subscription.findMany({ where: { paymentStatus: 'PAID', updatedAt: { gte: startOfMonth } }, select: { price: true } });
      caThisMonth = paidSubs.reduce((sum: number, s: any) => sum + (s.price || 0), 0);
    } catch {}
    const dbSizeResult = await prisma.$queryRaw`SELECT pg_size_pretty(pg_database_size(current_database())) as size` as any[];
    const uptime = process.uptime();
    res.json({ totalOrganizations, activeSubscriptions, pendingPayments, paidThisMonth, expiredSubscriptions, caThisMonth, totalUsers, totalClients, totalAffaires, databaseSize: dbSizeResult[0]?.size || 'N/A', systemUptime: `${Math.floor(uptime/3600)}h ${Math.floor((uptime%3600)/60)}m` });
  } catch (error) { next(error); }
});

// ─── ENTREPRISES ─────────────────────────────────────────────
adminRoutes.get('/organizations', async (_req: AuthRequest, res, next) => {
  try {
    const organizations = await prisma.organization.findMany({
      include: { users: { where: { role: 'OWNER' }, select: { name: true, email: true }, take: 1 }, _count: { select: { users: true, clients: true, affaires: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const orgsWithSubs = await Promise.all(organizations.map(async (org: any) => {
      let subscription = null;
      try { subscription = await (prisma as any).subscription.findFirst({ where: { organizationId: org.id }, orderBy: { createdAt: 'desc' } }); } catch {}
      return {
        id: org.id, name: org.name, phone: org.phone, createdAt: org.createdAt,
        responsable: org.users[0]?.name || 'N/A', emailResponsable: org.users[0]?.email || 'N/A',
        plan: subscription?.plan || 'Aucun', usersCount: org._count.users, clientsCount: org._count.clients, affairesCount: org._count.affaires,
        status: subscription ? (subscription.paymentStatus === 'PAID' && new Date(subscription.endDate) > new Date() ? 'actif' : subscription.paymentStatus === 'PENDING' ? 'en_attente' : 'expiré') : 'aucun',
      };
    }));
    res.json(orgsWithSubs);
  } catch (error) { next(error); }
});

// ─── ABONNEMENTS ─────────────────────────────────────────────
adminRoutes.get('/subscriptions', async (_req: AuthRequest, res, next) => {
  try {
    const subscriptions = await (prisma as any).subscription.findMany({ include: { organization: { select: { name: true } } }, orderBy: { createdAt: 'desc' } });
    const now = new Date();
    res.json(subscriptions.map((s: any) => ({
      ...s, organizationName: s.organization?.name || 'N/A',
      status: s.paymentStatus === 'PAID' && new Date(s.endDate) > now ? 'actif' : s.paymentStatus === 'PENDING' ? 'en_attente' : s.paymentStatus === 'REFUSED' ? 'refusé' : 'expiré',
    })));
  } catch (error) { next(error); }
});

// ─── PAIEMENTS ───────────────────────────────────────────────
adminRoutes.get('/payments', async (_req: AuthRequest, res, next) => {
  try {
    const payments = await (prisma as any).subscription.findMany({ include: { organization: { select: { name: true } } }, orderBy: { createdAt: 'desc' } });
    res.json(payments.map((p: any) => ({ id: p.id, organizationName: p.organization?.name || 'N/A', plan: p.plan, price: p.price, paymentMethod: p.paymentMethod, paymentStatus: p.paymentStatus, startDate: p.startDate, endDate: p.endDate, createdAt: p.createdAt, updatedAt: p.updatedAt })));
  } catch (error) { next(error); }
});

adminRoutes.post('/payments/:id/validate', async (req: AuthRequest, res, next) => {
  try {
    const now = new Date();
    const endDate = new Date(now); endDate.setFullYear(endDate.getFullYear() + 1);
    const subscription = await (prisma as any).subscription.update({ where: { id: req.params.id }, data: { paymentStatus: 'PAID', startDate: now, endDate } });
    res.json({ message: 'Paiement validé', subscription });
  } catch (error) { next(error); }
});

adminRoutes.post('/payments/:id/reject', async (req: AuthRequest, res, next) => {
  try {
    const subscription = await (prisma as any).subscription.update({ where: { id: req.params.id }, data: { paymentStatus: 'REFUSED' } });
    res.json({ message: 'Paiement refusé', subscription });
  } catch (error) { next(error); }
});

// ─── UTILISATEURS ────────────────────────────────────────────
adminRoutes.get('/users', async (_req: AuthRequest, res, next) => {
  try {
    const users = await prisma.user.findMany({ include: { organization: { select: { name: true } } }, orderBy: { createdAt: 'desc' } });
    res.json(users.map((u: any) => ({ id: u.id, name: u.name, email: u.email, role: u.role, organizationName: u.organization?.name || 'N/A', createdAt: u.createdAt })));
  } catch (error) { next(error); }
});

// ─── ACTIVITÉ ────────────────────────────────────────────────
adminRoutes.get('/activity', async (_req: AuthRequest, res, next) => {
  try {
    const [recentAffaires, recentUsers] = await Promise.all([
      prisma.affaire.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { client: true } }),
      prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);
    const activity = [
      ...recentAffaires.map((a: any) => ({ action: `Nouvelle opportunité: ${a.client?.name || 'N/A'} (${a.montantHT} DT)`, timestamp: a.createdAt, type: 'affaire' })),
      ...recentUsers.map((u: any) => ({ action: `Nouvel utilisateur: ${u.name}`, timestamp: u.createdAt, type: 'user' })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);
    res.json(activity);
  } catch (error) { next(error); }
});
