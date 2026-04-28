import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { AffaireType, StatutAffaire } from '@prisma/client';
import multer from 'multer';
import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';

export const affairesRoutes = Router();
affairesRoutes.use(requireAuth);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), '../frontend/public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'import-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

const affaireSchema = z.object({
  clientId: z.string(),
  productId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.nativeEnum(AffaireType),
  montantHT: z.number().nonnegative(),
  statut: z.nativeEnum(StatutAffaire).optional(),
  probabilite: z.number().min(0).max(100).optional(),
  moisPrevu: z.number().min(1).max(12),
  anneePrevue: z.number().min(2025).max(2030),
  viaPartenaire: z.boolean().optional(),
  tauxCommission: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

// ─── LIST avec filtres ──────────────────────────────────────────
affairesRoutes.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { statut, type, annee, viaPartenaire } = req.query;
    const where: any = { organizationId: req.organizationId };
    if (statut)        where.statut = statut;
    if (type)          where.type = type;
    if (annee)         where.anneePrevue = Number(annee);
    if (viaPartenaire) where.viaPartenaire = viaPartenaire === 'true';

    const affaires = await prisma.affaire.findMany({
      where,
      include: { client: true, product: true, _count: { select: { activites: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(affaires);
  } catch (e) { next(e); }
});

// ─── GET single avec activités ──────────────────────────────────
affairesRoutes.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const affaire = await prisma.affaire.findFirst({
      where: { 
        id: req.params.id as string,
        organizationId: req.organizationId,
      },
      include: {
        client: true,
        product: true,
        activites: { orderBy: { createdAt: 'desc' } },
        emails:    { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!affaire) return res.status(404).json({ error: 'Affaire introuvable' });
    res.json(affaire);
  } catch (e) { next(e); }
});

// ─── CREATE ──────────────────────────────────────────────────────
affairesRoutes.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = affaireSchema.parse(req.body);
    const affaire = await prisma.affaire.create({
      data: { ...data, createdById: req.userId, organizationId: req.organizationId! },
      include: { client: true, product: true },
    });
    // Log activité
    await prisma.activite.create({
      data: {
        affaireId: affaire.id,
        organizationId: req.organizationId!,
        type: 'AUTRE',
        title: 'Affaire créée',
        content: `Nouvelle affaire : ${affaire.title}`,
      },
    });
    res.status(201).json(affaire);
  } catch (e) { next(e); }
});

// ─── UPDATE ──────────────────────────────────────────────────────
affairesRoutes.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const data = affaireSchema.partial().parse(req.body);
    const existing = await prisma.affaire.findFirst({ 
      where: { 
        id: req.params.id as string,
        organizationId: req.organizationId,
      } 
    });
    if (!existing) return res.status(404).json({ error: 'Affaire introuvable' });

    const affaire = await prisma.affaire.update({
      where: { id: req.params.id as string },
      data,
      include: { client: true, product: true },
    });

    // Log changement de statut
    if (data.statut && data.statut !== existing.statut) {
      await prisma.activite.create({
        data: {
          affaireId: affaire.id,
          organizationId: req.organizationId!,
          type: 'CHANGEMENT_STATUT',
          title: `Statut : ${existing.statut} → ${data.statut}`,
          content: `Montant : ${affaire.montantHT} DT`,
        },
      });
      if (data.statut === 'REALISE') {
        await prisma.affaire.update({
          where: { id: affaire.id },
          data: { dateClotureReelle: new Date() },
        });
      }
    }
    res.json(affaire);
  } catch (e) { next(e); }
});

// ─── DELETE ──────────────────────────────────────────────────────
affairesRoutes.delete('/:id', async (req, res, next) => {
  try {
    await prisma.affaire.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// ─── ADD ACTIVITY ────────────────────────────────────────────────
affairesRoutes.post('/:id/activites', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      type: z.enum(['NOTE', 'APPEL', 'EMAIL_ENVOYE', 'EMAIL_RECU', 'RDV', 'AUTRE']),
      title: z.string().min(1),
      content: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const activite = await prisma.activite.create({
      data: { ...data, affaireId: req.params.id as string, organizationId: req.organizationId! },
    });
    res.status(201).json(activite);
  } catch (e) { next(e); }
});

// ─── IMPORT FROM EXCEL ───────────────────────────────────────────
affairesRoutes.post('/import', upload.single('file'), async (req: AuthRequest, res, next) => {
  try {
    console.log('Import request received');
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    console.log('File uploaded:', req.file.path);

    // Read Excel file
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    console.log('Excel data parsed, rows:', data.length);

    const results = {
      created: 0,
      updated: 0,
      errors: [] as string[],
    };

    for (const row of data as any[]) {
      try {
        // Expected columns (all optional, with defaults)
        const clientName = row.clientName || row['Nom du client'] || row['Client'] || 'Client inconnu';
        const clientEmail = row.clientEmail || row['Email client'] || row['Email'] || '';
        const clientPhone = row.clientPhone || row['Téléphone client'] || row['Téléphone'] || '';
        const productName = row.productName || row['Produit'] || row['Product'] || '';
        const title = row.title || row['Titre'] || row['Affaire'] || `${clientName}`;
        const typeStr = row.type || row['Type'] || 'BILAN_CARBONE';
        const montantHT = Number(row.montantHT || row['Montant HT'] || row['Montant'] || row['Prix'] || 0);
        const statutStr = row.statut || row['Statut'] || 'PROSPECTION';
        const probabilite = Number(row.probabilite || row['Probabilité'] || 50);
        const moisPrevu = Number(row.moisPrevu || row['Mois prévu'] || row['Mois'] || new Date().getMonth() + 1);
        const anneePrevue = Number(row.anneePrevue || row['Année prévu'] || row['Année'] || new Date().getFullYear());

        console.log('Processing row:', { clientName, clientEmail, productName, title });

        // Create or find client
        let client;
        if (clientEmail) {
          client = await prisma.client.findFirst({
            where: { 
              email: clientEmail,
              organizationId: req.organizationId!,
            },
          });
        }

        if (!client) {
          client = await prisma.client.create({
            data: {
              name: clientName,
              email: clientEmail || null,
              phone: clientPhone || null,
              organizationId: req.organizationId!,
            },
          });
          console.log('Client created:', client.id);
          results.created++;
        } else {
          console.log('Client found:', client.id);
          results.updated++;
        }

        // Create or find product
        let product = null;
        if (productName) {
          product = await prisma.product.findFirst({
            where: { 
              name: productName,
              organizationId: req.organizationId!,
            },
          });

          if (!product) {
            product = await prisma.product.create({
              data: {
                name: productName,
                type: typeStr as any,
                price: 0, // Default price for imported products
                organizationId: req.organizationId!,
              },
            });
            console.log('Product created:', product.id);
          }
        }

        // Create affaire
        const affaire = await prisma.affaire.create({
          data: {
            clientId: client.id,
            productId: product?.id,
            title: title || `${clientName}${productName ? ' - ' + productName : ''}`,
            type: typeStr as AffaireType,
            montantHT,
            statut: statutStr as StatutAffaire,
            probabilite,
            moisPrevu,
            anneePrevue,
            createdById: req.userId,
            organizationId: req.organizationId!,
          },
        });
        console.log('Affaire created:', affaire.id);

        // Log activity
        await prisma.activite.create({
          data: {
            affaireId: affaire.id,
            organizationId: req.organizationId!,
            type: 'AUTRE',
            title: 'Affaire importée',
            content: `Importée depuis Excel`,
          },
        });

        results.created++;
      } catch (err: any) {
        console.error('Error processing row:', err);
        results.errors.push(`Erreur ligne ${results.created + results.updated}: ${err.message}`);
      }
    }

    // Delete uploaded file
    fs.unlinkSync(req.file.path);

    console.log('Import completed:', results);
    res.json(results);
  } catch (e) { next(e); }
});
