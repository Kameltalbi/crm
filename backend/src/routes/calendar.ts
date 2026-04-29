import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import auth from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Apply auth middleware to all routes
router.use(auth);

// GET /calendar - Get all calendar events for the organization
router.get('/', async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { startDate, endDate, eventType, page = 1, limit = 50 } = req.query;

    const where: any = { organizationId, deletedAt: null };
    if (startDate) where.startDate = { gte: new Date(startDate as string) };
    if (endDate) where.endDate = { lte: new Date(endDate as string) };
    if (eventType) where.eventType = eventType;

    const skip = (Number(page) - 1) * Number(limit);

    const [data, total] = await Promise.all([
      prisma.calendarEvent.findMany({
        where,
        include: {
          relatedAffaire: { include: { client: true } },
          relatedLead: true,
          createdBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { startDate: 'asc' },
        skip,
        take: Number(limit),
      }),
      prisma.calendarEvent.count({ where }),
    });

    res.json({
      data,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        total,
      },
    });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

// GET /calendar/:id - Get a single calendar event
router.get('/:id', async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const event = await prisma.calendarEvent.findFirst({
      where: { id: req.params.id, organizationId, deletedAt: null },
      include: {
        relatedAffaire: { include: { client: true } },
        relatedLead: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Calendar event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('Error fetching calendar event:', error);
    res.status(500).json({ error: 'Failed to fetch calendar event' });
  }
});

// POST /calendar - Create a new calendar event
router.post('/', async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const userId = req.user.id;

    const event = await prisma.calendarEvent.create({
      data: {
        organizationId,
        createdById: userId,
        ...req.body,
      },
      include: {
        relatedAffaire: { include: { client: true } },
        relatedLead: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(201).json(event);
  } catch (error) {
    console.error('Error creating calendar event:', error);
    res.status(500).json({ error: 'Failed to create calendar event' });
  }
});

// PUT /calendar/:id - Update a calendar event
router.put('/:id', async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;

    const existingEvent = await prisma.calendarEvent.findFirst({
      where: { id: req.params.id, organizationId, deletedAt: null },
    });

    if (!existingEvent) {
      return res.status(404).json({ error: 'Calendar event not found' });
    }

    const event = await prisma.calendarEvent.update({
      where: { id: req.params.id },
      data: req.body,
      include: {
        relatedAffaire: { include: { client: true } },
        relatedLead: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    res.json(event);
  } catch (error) {
    console.error('Error updating calendar event:', error);
    res.status(500).json({ error: 'Failed to update calendar event' });
  }
});

// DELETE /calendar/:id - Soft delete a calendar event
router.delete('/:id', async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;

    const existingEvent = await prisma.calendarEvent.findFirst({
      where: { id: req.params.id, organizationId, deletedAt: null },
    });

    if (!existingEvent) {
      return res.status(404).json({ error: 'Calendar event not found' });
    }

    await prisma.calendarEvent.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    res.status(500).json({ error: 'Failed to delete calendar event' });
  }
});

export default router;
