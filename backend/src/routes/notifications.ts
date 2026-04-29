import express from 'express';
import { prisma } from '../db/prisma.js';
import type { AuthRequest } from '../middleware/auth';
import type { NotificationType } from '@prisma/client';
import { parsePagination } from '../lib/pagination.js';

const notificationsRouter = express.Router();

// ─── GET USER NOTIFICATIONS ───────────────────────────────────────────
notificationsRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const where = {
      userId: req.userId,
      organizationId: req.organizationId,
    };

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    res.json({
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (e) { next(e); }
});

// ─── GET UNREAD COUNT ───────────────────────────────────────────────────
notificationsRouter.get('/unread-count', async (req: AuthRequest, res, next) => {
  try {
    const count = await prisma.notification.count({
      where: {
        userId: req.userId,
        organizationId: req.organizationId,
        read: false,
      },
    });
    res.json({ count });
  } catch (e) { next(e); }
});

// ─── MARK AS READ ───────────────────────────────────────────────────────
notificationsRouter.patch('/:id/read', async (req: AuthRequest, res, next) => {
  try {
    const notification = await prisma.notification.update({
      where: {
        id: req.params.id,
        userId: req.userId,
        organizationId: req.organizationId,
      },
      data: { read: true },
    });
    res.json(notification);
  } catch (e) { next(e); }
});

// ─── MARK ALL AS READ ────────────────────────────────────────────────────
notificationsRouter.patch('/mark-all-read', async (req: AuthRequest, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: req.userId,
        organizationId: req.organizationId,
        read: false,
      },
      data: { read: true },
    });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// ─── DELETE NOTIFICATION ─────────────────────────────────────────────────
notificationsRouter.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    await prisma.notification.delete({
      where: {
        id: req.params.id,
        userId: req.userId,
        organizationId: req.organizationId,
      },
    });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// ─── CHECK AFFAIRES WITHOUT ACTIVITY ──────────────────────────────────────
// This endpoint creates notifications for affaires without recent activity
notificationsRouter.post('/check-activity', async (req: AuthRequest, res, next) => {
  try {
    const daysThreshold = 14; // 14 days without activity
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

    // Find affaires without activity since threshold date
    const affairesWithoutActivity = await prisma.affaire.findMany({
      where: {
        organizationId: req.organizationId,
        statut: { in: ['PROSPECTION', 'PIPELINE'] },
        NOT: {
          activites: {
            some: {
              createdAt: { gte: thresholdDate },
            },
          },
        },
      },
      include: {
        client: true,
        activites: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // Create notifications for each affaire without activity
    for (const affaire of affairesWithoutActivity) {
      const lastActivity = affaire.activites[0];
      const daysSinceActivity = lastActivity 
        ? Math.floor((Date.now() - lastActivity.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        : Math.floor((Date.now() - affaire.createdAt.getTime()) / (1000 * 60 * 60 * 24));

      // Check if notification already exists for this affaire
      const existingNotification = await prisma.notification.findFirst({
        where: {
          userId: req.userId,
          organizationId: req.organizationId,
          type: 'AFFAIRE_SANS_ACTIVITE',
          content: { contains: affaire.id },
        },
      });

      if (!existingNotification && daysSinceActivity >= daysThreshold) {
        await prisma.notification.create({
          data: {
            userId: req.userId,
            organizationId: req.organizationId,
            type: 'AFFAIRE_SANS_ACTIVITE' as NotificationType,
            title: `Affaire sans activité depuis ${daysSinceActivity} jours`,
            content: `L'affaire "${affaire.title}" (${affaire.client.name}) n'a pas d'activité depuis ${daysSinceActivity} jours.`,
            link: `/affaires/${affaire.id}`,
            read: false,
          },
        });
      }
    }

    res.json({ 
      checked: affairesWithoutActivity.length,
      message: `Vérifié ${affairesWithoutActivity.length} affaires sans activité récente`,
    });
  } catch (e) { next(e); }
});

export { notificationsRouter };
