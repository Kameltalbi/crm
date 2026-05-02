import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import auth, { AuthRequest } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getUploadsDir } from '../lib/uploadsDir.js';
import {
  mapOrganizationLogoInPlace,
  normalizeOrganizationLogoUrlForApi,
  organizationLogoFilenameFromStored,
} from '../lib/organizationLogoUrl.js';

export const organizationsRoutes = Router();
organizationsRoutes.use(auth);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, getUploadsDir());
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

const organizationSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  tva: z.string().optional(),
  logoUrl: z.string().optional(),
});

// GET /api/organizations - Get current user's organization
organizationsRoutes.get('/', async (req: AuthRequest, res, next) => {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: req.organizationId },
      include: {
        _count: {
          select: {
            users: true,
            clients: true,
            affaires: true,
          },
        },
      },
    });

    if (!organization) return res.status(404).json({ error: 'Organisation introuvable' });
    res.json(mapOrganizationLogoInPlace(organization));
  } catch (e) { next(e); }
});

// GET /api/organizations/logo — authenticated binary logo (must be registered BEFORE /:id)
organizationsRoutes.get('/logo', async (req: AuthRequest, res, next) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: req.organizationId as string },
      select: { logoUrl: true },
    });
    const filename = organizationLogoFilenameFromStored(org?.logoUrl ?? null);
    if (!filename) {
      return res.status(404).end();
    }
    const filePath = path.resolve(path.join(getUploadsDir(), filename));
    if (!filePath.startsWith(path.resolve(getUploadsDir()))) {
      return res.status(400).end();
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).end();
    }
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.sendFile(filePath, (err) => {
      if (err) next(err);
    });
  } catch (e) {
    next(e);
  }
});

// GET /api/organizations/:id - Get single organization (must belong to user)
organizationsRoutes.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    if (req.params.id !== req.organizationId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: req.params.id as string },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            users: true,
            clients: true,
            affaires: true,
          },
        },
      },
    });

    if (!organization) return res.status(404).json({ error: 'Organisation introuvable' });
    res.json(mapOrganizationLogoInPlace(organization));
  } catch (e) { next(e); }
});

// POST /api/organizations - Create new organization (owner only)
organizationsRoutes.post('/', async (req: AuthRequest, res, next) => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!currentUser || currentUser.role !== 'OWNER') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const data = organizationSchema.parse(req.body);

    const organization = await prisma.organization.create({
      data,
    });

    res.status(201).json(mapOrganizationLogoInPlace(organization));
  } catch (e) { next(e); }
});

// PUT /api/organizations/:id - Update organization (must belong to user)
organizationsRoutes.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    if (req.params.id !== req.organizationId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const data = organizationSchema.partial().parse(req.body);

    const organization = await prisma.organization.update({
      where: { id: req.params.id as string },
      data,
    });

    res.json(mapOrganizationLogoInPlace(organization));
  } catch (e) { next(e); }
});

// DELETE /api/organizations/:id - Delete organization (must belong to user)
organizationsRoutes.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    if (req.params.id !== req.organizationId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    // Check if organization has users
    const organization = await prisma.organization.findUnique({
      where: { id: req.params.id as string },
      include: { _count: { select: { users: true } } },
    });

    if (!organization) return res.status(404).json({ error: 'Organisation introuvable' });
    if (organization._count.users > 0) {
      return res.status(400).json({ error: 'Impossible de supprimer une organisation avec des utilisateurs' });
    }

    await prisma.organization.delete({
      where: { id: req.params.id as string },
    });

    res.json({ success: true });
  } catch (e) { next(e); }
});

// POST /api/organizations/:id/logo - Upload organization logo (must belong to user)
organizationsRoutes.post('/:id/logo', upload.single('logo'), async (req: AuthRequest, res, next) => {
  try {
    if (req.params.id !== req.organizationId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const logoUrl = `/api/uploads/${req.file.filename}`;

    const organization = await prisma.organization.update({
      where: { id: req.params.id as string },
      data: { logoUrl },
    });

    const normalized = normalizeOrganizationLogoUrlForApi(logoUrl);
    res.json({
      logoUrl: normalized,
      organization: mapOrganizationLogoInPlace(organization),
    });
  } catch (e) { next(e); }
});
