import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const clientsRoutes = Router();
clientsRoutes.use(requireAuth);

const clientSchema = z.object({
  name: z.string().min(1),
  contactName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  matricule: z.string().optional(),
  qualificatif: z.string().optional(),
  notes: z.string().optional(),
});

clientsRoutes.get('/', async (req: AuthRequest, res, next) => {
  try {
    const clients = await prisma.client.findMany({
      where: { organizationId: req.organizationId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { affaires: true } } },
    });
    res.json(clients);
  } catch (e) { next(e); }
});

clientsRoutes.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const client = await prisma.client.findFirst({
      where: { 
        id: req.params.id as string,
        organizationId: req.organizationId!,
      },
      include: {
        affaires: {
          include: { _count: { select: { activites: true } } },
          orderBy: [{ anneePrevue: 'desc' }, { moisPrevu: 'desc' }],
        },
      },
    });
    if (!client) return res.status(404).json({ error: 'Client introuvable' });
    res.json(client);
  } catch (e) { next(e); }
});

clientsRoutes.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = clientSchema.parse(req.body);
    const client = await prisma.client.create({
      data: { ...data, createdById: req.userId, organizationId: req.organizationId! },
    });
    res.status(201).json(client);
  } catch (e) { next(e); }
});

clientsRoutes.put('/:id', async (req, res, next) => {
  try {
    const data = clientSchema.parse(req.body);
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data,
    });
    res.json(client);
  } catch (e) { next(e); }
});

clientsRoutes.delete('/:id', async (req, res, next) => {
  try {
    await prisma.client.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

clientsRoutes.post('/import', async (req: AuthRequest, res, next) => {
  try {
    const importSchema = z.object({
      clients: z.array(clientSchema),
    });
    const { clients } = importSchema.parse(req.body);
    
    const createdClients = await prisma.client.createMany({
      data: clients.map(c => ({
        ...c,
        createdById: req.userId,
        organizationId: req.organizationId!,
      })),
      skipDuplicates: true,
    });
    
    res.status(201).json({ success: true, count: createdClients.count });
  } catch (e) { next(e); }
});
