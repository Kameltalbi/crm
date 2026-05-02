import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import auth, { AuthRequest } from '../middleware/auth.js';
import { StatutAffaire } from '@prisma/client';
import multer from 'multer';
import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';
import { parsePagination } from '../lib/pagination.js';
import { getUploadsDir } from '../lib/uploadsDir.js';

export const affairesRoutes = Router();
affairesRoutes.use(auth);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, getUploadsDir());
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'import-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Lead Scoring Calculation
function calculateLeadScore(affaire: any, clientHistory?: number): number {
  let score = 0;
  
  // Montant HT (0-30 points)
  const montant = Number(affaire.montantHT);
  if (montant >= 10000) score += 30;
  else if (montant >= 5000) score += 20;
  else if (montant >= 1000) score += 10;
  else score += 5;
  
  // Probabilité (0-30 points)
  score += (affaire.probabilite / 100) * 30;
  
  // Statut (0-25 points)
  const statusScores: Record<string, number> = {
    'PROSPECT': 10,
    'QUALIFIE': 20,
    'PROPOSITION': 30,
    'NEGOCIATION': 40,
    'GAGNE': 0, // Already won, no need to score
    'PERDU': 0, // Lost, no need to score
  };
  score += statusScores[affaire.statut] || 0;
  
  // Historique client (0-15 points)
  if (clientHistory && clientHistory > 0) {
    score += Math.min(15, clientHistory * 5); // Up to 15 points based on past deals
  }
  
  return Math.round(Math.min(100, score));
}

const affaireSchema = z.object({
  clientId: z.string().min(1),
  productId: z.string().optional().transform(v => v === '' ? undefined : v),
  title: z.string().optional(),
  description: z.string().optional(),
  type: z.string().min(1),
  montantHT: z.number().nonnegative(),
  statut: z.string().optional(),
  probabilite: z.number().min(0).max(100).optional(),
  moisPrevu: z.number().min(1).max(12),
  anneePrevue: z.number().min(2020).max(2035),
  viaPartenaire: z.boolean().optional(),
  tauxCommission: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

// ─── LIST avec filtres ──────────────────────────────────────────
affairesRoutes.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { statut, type, annee, viaPartenaire } = req.query;
    const where: any = { organizationId: req.organizationId, deletedAt: null };
    if (statut)        where.statut = statut;
    if (type)          where.type = type;
    if (annee)         where.anneePrevue = Number(annee);
    if (viaPartenaire) where.viaPartenaire = viaPartenaire === 'true';

    const [affaires, total] = await Promise.all([
      prisma.affaire.findMany({
        where,
        include: { client: true, product: true, _count: { select: { activites: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.affaire.count({ where }),
    ]);

    res.json({
      data: affaires,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
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
    const data = affaireSchema.parse(req.body) as any;

    // Auto-generate title if not provided
    let title = data.title;
    if (!title) {
      const client = await prisma.client.findUnique({
        where: { id: data.clientId },
        select: { name: true },
      });
      const product = data.productId ? await prisma.product.findUnique({
        where: { id: data.productId },
        select: { name: true },
      }) : null;
      title = product ? `${product.name} - ${client?.name || 'Client'}` : `${data.type === 'BILAN_CARBONE' ? 'Bilan Carbone' : 'Formation'} - ${client?.name || 'Client'}`;
    }

    // Calculate lead score based on client history
    const clientHistory = await prisma.affaire.count({
      where: {
        clientId: data.clientId,
        statut: 'GAGNE',
        organizationId: req.organizationId!,
      },
    });
    const score = calculateLeadScore({ ...data, title }, clientHistory);

    const affaire = await prisma.affaire.create({
      data: { ...data, title, score, createdById: req.userId, organizationId: req.organizationId! },
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
    const data = affaireSchema.partial().parse(req.body) as any;
    const existing = await prisma.affaire.findFirst({ 
      where: { 
        id: req.params.id as string,
        organizationId: req.organizationId,
      } 
    });
    if (!existing) return res.status(404).json({ error: 'Affaire introuvable' });

    // Recalculate lead score if relevant fields changed
    const shouldRecalculate = data.montantHT !== undefined || data.probabilite !== undefined || data.statut !== undefined;
    let score = (existing as any).score || 0;
    if (shouldRecalculate) {
      const clientHistory = await prisma.affaire.count({
        where: {
          clientId: existing.clientId,
          statut: 'GAGNE',
          organizationId: req.organizationId!,
        },
      });
      score = calculateLeadScore({ ...existing, ...data }, clientHistory);
    }

    const affaire = await prisma.affaire.update({
      where: { id: req.params.id as string },
      data: { ...data, score },
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

// POST /:id/duplicate - Duplicate affaire with new date
affairesRoutes.post('/:id/duplicate', async (req: AuthRequest, res, next) => {
  try {
    const { moisPrevu, anneePrevue } = req.body;
    
    const existing = await prisma.affaire.findFirst({
      where: { id: req.params.id as string, organizationId: req.organizationId },
      include: { client: true },
    });
    if (!existing) return res.status(404).json({ error: 'Affaire introuvable' });
    
    // Get client history for lead scoring
    const clientHistory = await prisma.affaire.findMany({
      where: { clientId: existing.clientId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    
    const duplicated = await prisma.affaire.create({
      data: {
        organizationId: req.organizationId!,
        clientId: existing.clientId,
        productId: existing.productId,
        type: existing.type,
        title: existing.title ? `${existing.title} (copie)` : null,
        description: existing.description,
        montantHT: existing.montantHT,
        statut: 'PROSPECT',
        probabilite: existing.probabilite,
        moisPrevu: moisPrevu || existing.moisPrevu,
        anneePrevue: anneePrevue || existing.anneePrevue,
        viaPartenaire: existing.viaPartenaire,
        tauxCommission: existing.tauxCommission,
        notes: existing.notes,
      },
      include: { client: true, product: true },
    });
    
    // Log activity
    await prisma.activite.create({
      data: {
        affaireId: duplicated.id,
        organizationId: req.organizationId!,
        type: 'AUTRE',
        title: 'Affaire dupliquée',
        content: `Dupliquée depuis ${existing.title || 'affaire #' + existing.id}`,
      },
    });
    
    res.status(201).json(duplicated);
  } catch (e) { next(e); }
});

// ─── DELETE ──────────────────────────────────────────────────────
affairesRoutes.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const id = req.params.id as string;
    await prisma.affaire.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
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
    console.log('Sheet names:', workbook.SheetNames);
    
    // Try to find a sheet with data
    let data: any[] = [];
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      console.log(`Sheet ${sheetName} range:`, worksheet['!ref']);
      
      // Try with header option
      const sheetData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
      console.log(`Sheet ${sheetName} raw rows: ${sheetData.length}`);
      
      // If only header row exists, try without header option
      if (sheetData.length === 1) {
        console.log(`Only header row found, trying with header: 0`);
        const sheetDataNoHeader = xlsx.utils.sheet_to_json(worksheet, { header: 0 });
        console.log(`Sheet ${sheetName} rows with header:0: ${sheetDataNoHeader.length}`);
        if (sheetDataNoHeader.length > 0) {
          // Convert array to objects using first row as header
          if (sheetDataNoHeader.length > 1) {
            const headers = sheetDataNoHeader[0] as string[];
            const rows = sheetDataNoHeader.slice(1).map((row: any) => {
              const obj: any = {};
              headers.forEach((header: string, index: number) => {
                obj[header] = row[index];
              });
              return obj;
            });
            data = rows;
            console.log(`Using sheet: ${sheetName} with ${data.length} data rows`);
            break;
          }
        }
      } else if (sheetData.length > 1) {
        // Normal case with header and data rows
        data = xlsx.utils.sheet_to_json(worksheet);
        console.log(`Sheet ${sheetName} has ${data.length} rows`);
        console.log(`Using sheet: ${sheetName}`);
        break;
      }
    }

    console.log('Excel data parsed, rows:', data.length);
    console.log('First row sample:', JSON.stringify(data[0] || 'No rows'));
    if (data.length === 0) {
      console.log('No data found in Excel file');
      return res.json({ created: 0, updated: 0, errors: ['Aucune donnée trouvée dans le fichier Excel'] });
    }

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
            type: typeStr,
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
