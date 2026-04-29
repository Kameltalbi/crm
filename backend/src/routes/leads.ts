import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Apply auth middleware to all routes
router.use(requireAuth);

// GET /leads - Get all leads for the organization
router.get('/', async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { status, source, page = 1, limit = 50 } = req.query;

    const where: any = { organizationId, deletedAt: null };
    if (status) where.status = status;
    if (source) where.source = source;

    const skip = (Number(page) - 1) * Number(limit);

    const [data, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          client: true,
          createdBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({
      data,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        total,
      },
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// GET /leads/:id - Get a single lead
router.get('/:id', async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, organizationId, deletedAt: null },
      include: {
        client: true,
        createdBy: { select: { id: true, name: true, email: true } },
        activites: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json(lead);
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// POST /leads - Create a new lead
router.post('/', async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const userId = req.user.id;

    const lead = await prisma.lead.create({
      data: {
        organizationId,
        createdById: userId,
        ...req.body,
      },
      include: {
        client: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(201).json(lead);
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// PUT /leads/:id - Update a lead
router.put('/:id', async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;

    const existingLead = await prisma.lead.findFirst({
      where: { id: req.params.id, organizationId, deletedAt: null },
    });

    if (!existingLead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: req.body,
      include: {
        client: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    res.json(lead);
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// DELETE /leads/:id - Soft delete a lead
router.delete('/:id', async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;

    const existingLead = await prisma.lead.findFirst({
      where: { id: req.params.id, organizationId, deletedAt: null },
    });

    if (!existingLead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    await prisma.lead.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// POST /leads/:id/convert - Convert lead to client
router.post('/:id/convert', async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const userId = req.user.id;

    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, organizationId, deletedAt: null },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (lead.status === 'CONVERTED') {
      return res.status(400).json({ error: 'Lead already converted' });
    }

    // Create client from lead
    const client = await prisma.client.create({
      data: {
        organizationId,
        createdById: userId,
        name: lead.company || lead.name,
        contactName: lead.contactName,
        email: lead.email,
        phone: lead.phone,
        notes: lead.notes,
        qualificatif: 'CLIENT',
      },
    });

    // Update lead
    const updatedLead = await prisma.lead.update({
      where: { id: req.params.id },
      data: {
        status: 'CONVERTED',
        convertedToClientId: client.id,
      },
      include: {
        client: true,
        convertedToClient: true,
      },
    });

    res.json({ lead: updatedLead, client });
  } catch (error) {
    console.error('Error converting lead:', error);
    res.status(500).json({ error: 'Failed to convert lead' });
  }
});

export default router;
