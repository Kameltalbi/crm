import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import auth from '../middleware/auth.js';

export const expensesRoutes = Router();
const prisma = new PrismaClient();

// Apply auth middleware to all routes
expensesRoutes.use(auth);

// GET /expenses - List expenses with pagination
expensesRoutes.get('/', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const organizationId = (req as any).organizationId;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const category = req.query.category as string;
    const status = req.query.status as string;
    const month = req.query.month as string;
    const semester = req.query.semester as string;
    const year = req.query.year as string;

    const where: any = {
      organizationId,
      deletedAt: null,
    };

    if (category) where.category = category;
    if (status) where.status = status;
    if (month || semester || year) {
      const dateFilter: any = {};
      if (month) {
        dateFilter.gte = new Date(parseInt(year || '2026'), parseInt(month) - 1, 1);
        dateFilter.lt = new Date(parseInt(year || '2026'), parseInt(month), 1);
      } else if (semester === 'S1') {
        // S1: January to June (months 1-6)
        dateFilter.gte = new Date(parseInt(year || '2026'), 0, 1);
        dateFilter.lt = new Date(parseInt(year || '2026'), 6, 1);
      } else if (semester === 'S2') {
        // S2: July to December (months 7-12)
        dateFilter.gte = new Date(parseInt(year || '2026'), 6, 1);
        dateFilter.lt = new Date(parseInt(year || '2026') + 1, 0, 1);
      } else if (year) {
        dateFilter.gte = new Date(parseInt(year), 0, 1);
        dateFilter.lt = new Date(parseInt(year) + 1, 0, 1);
      }
      where.date = dateFilter;
    }

    const [data, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          relatedAffaire: { include: { client: true } },
          relatedLead: true,
          createdBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.expense.count({ where }),
    ]);

    res.json({
      data,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        total,
        limit,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /expenses/:id - Get expense by ID
expensesRoutes.get('/:id', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const organizationId = (req as any).organizationId;

    const expense = await prisma.expense.findFirst({
      where: {
        id: req.params.id,
        organizationId,
        deletedAt: null,
      },
      include: {
        relatedAffaire: { include: { client: true } },
        relatedLead: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!expense) {
      return res.status(404).json({ error: 'Dépense non trouvée' });
    }

    res.json(expense);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /expenses - Create expense
expensesRoutes.post('/', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const organizationId = (req as any).organizationId;

    const { title, description, amount, currency, category, date, relatedAffaireId, relatedLeadId, status, receiptUrl, isRecurrent, recurrenceMonths, notes } = req.body;

    const expense = await prisma.expense.create({
      data: {
        organizationId,
        title,
        description,
        amount: parseFloat(amount),
        currency: currency || 'TND',
        category: category || 'Autre',
        date: date ? new Date(date) : new Date(),
        relatedAffaireId,
        relatedLeadId,
        status: status || 'PENDING',
        receiptUrl,
        isRecurrent: isRecurrent === true || isRecurrent === 'true',
        recurrenceMonths: recurrenceMonths || null,
        notes,
        createdById: userId,
      },
      include: {
        relatedAffaire: { include: { client: true } },
        relatedLead: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(201).json(expense);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /expenses/:id - Update expense
expensesRoutes.put('/:id', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const organizationId = (req as any).organizationId;

    const { title, description, amount, currency, category, date, relatedAffaireId, relatedLeadId, status, receiptUrl, isRecurrent, recurrenceMonths, notes } = req.body;

    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data: {
        title,
        description,
        amount: amount ? parseFloat(amount) : undefined,
        currency,
        category,
        date: date ? new Date(date) : undefined,
        relatedAffaireId,
        relatedLeadId,
        status,
        receiptUrl,
        isRecurrent: isRecurrent !== undefined ? (isRecurrent === true || isRecurrent === 'true') : undefined,
        recurrenceMonths,
        notes,
      },
      include: {
        relatedAffaire: { include: { client: true } },
        relatedLead: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    res.json(expense);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /expenses/:id - Soft delete expense
expensesRoutes.delete('/:id', async (req, res) => {
  try {
    const organizationId = (req as any).organizationId;

    await prisma.expense.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
