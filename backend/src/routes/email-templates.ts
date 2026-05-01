import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import auth, { AuthRequest } from '../middleware/auth.js';

export const emailTemplatesRoutes = Router();
emailTemplatesRoutes.use(auth);

const emailTemplateSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  variables: z.string().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/email-templates - List all templates
emailTemplatesRoutes.get('/', async (req: AuthRequest, res, next) => {
  try {
    const templates = await prisma.emailTemplate.findMany({
      where: { organizationId: req.organizationId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(templates);
  } catch (e) { next(e); }
});

// GET /api/email-templates/:id - Get single template
emailTemplatesRoutes.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const template = await prisma.emailTemplate.findFirst({
      where: {
        id: req.params.id as string,
        organizationId: req.organizationId,
      },
    });
    if (!template) return res.status(404).json({ error: 'Template introuvable' });
    res.json(template);
  } catch (e) { next(e); }
});

// POST /api/email-templates - Create template
emailTemplatesRoutes.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = emailTemplateSchema.parse(req.body);
    const template = await prisma.emailTemplate.create({
      data: {
        ...data,
        variables: data.variables || JSON.stringify(['client', 'montant', 'date', 'statut']),
        organizationId: req.organizationId!,
      },
    });
    res.status(201).json(template);
  } catch (e) { next(e); }
});

// PUT /api/email-templates/:id - Update template
emailTemplatesRoutes.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const data = emailTemplateSchema.partial().parse(req.body);
    const existing = await prisma.emailTemplate.findFirst({
      where: {
        id: req.params.id as string,
        organizationId: req.organizationId,
      },
    });
    if (!existing) return res.status(404).json({ error: 'Template introuvable' });
    
    const template = await prisma.emailTemplate.update({
      where: { id: req.params.id as string },
      data,
    });
    res.json(template);
  } catch (e) { next(e); }
});

// DELETE /api/email-templates/:id - Delete template
emailTemplatesRoutes.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.emailTemplate.findFirst({
      where: {
        id: req.params.id as string,
        organizationId: req.organizationId,
      },
    });
    if (!existing) return res.status(404).json({ error: 'Template introuvable' });
    
    await prisma.emailTemplate.delete({
      where: { id: req.params.id as string },
    });
    res.status(204).send();
  } catch (e) { next(e); }
});

// POST /api/email-templates/:id/preview - Preview with affaire data
emailTemplatesRoutes.post('/:id/preview', async (req: AuthRequest, res, next) => {
  try {
    const { affaireId } = req.body;
    
    const template = await prisma.emailTemplate.findFirst({
      where: {
        id: req.params.id as string,
        organizationId: req.organizationId,
      },
    });
    if (!template) return res.status(404).json({ error: 'Template introuvable' });
    
    const affaire = await prisma.affaire.findFirst({
      where: {
        id: affaireId,
        organizationId: req.organizationId,
      },
      include: { client: true },
    });
    if (!affaire) return res.status(404).json({ error: 'Affaire introuvable' });
    
    // Replace variables
    let subject = template.subject;
    let body = template.body;
    
    const variables = {
      client: affaire.client?.name || 'N/A',
      montant: Number(affaire.montantHT).toLocaleString('fr-TN') + ' DT',
      date: `${new Date().toLocaleDateString('fr-FR')}`,
      statut: affaire.statut,
      titre: affaire.title || 'N/A',
      probabilite: `${affaire.probabilite}%`,
    };
    
    Object.entries(variables).forEach(([key, value]) => {
      subject = subject.replace(new RegExp(`{${key}}`, 'g'), value);
      body = body.replace(new RegExp(`{${key}}`, 'g'), value);
    });
    
    res.json({ subject, body });
  } catch (e) { next(e); }
});

// POST /api/email-templates/:id/send - Send email using template
emailTemplatesRoutes.post('/:id/send', async (req: AuthRequest, res, next) => {
  try {
    const { affaireId, toEmail } = req.body;
    
    const template = await prisma.emailTemplate.findFirst({
      where: {
        id: req.params.id as string,
        organizationId: req.organizationId,
        isActive: true,
      },
    });
    if (!template) return res.status(404).json({ error: 'Template introuvable ou désactivé' });
    
    const affaire = await prisma.affaire.findFirst({
      where: {
        id: affaireId,
        organizationId: req.organizationId,
      },
      include: { client: true },
    });
    if (!affaire) return res.status(404).json({ error: 'Affaire introuvable' });
    
    // Replace variables
    let subject = template.subject;
    let body = template.body;
    
    const variables = {
      client: affaire.client?.name || 'N/A',
      montant: Number(affaire.montantHT).toLocaleString('fr-TN') + ' DT',
      date: new Date().toLocaleDateString('fr-FR'),
      statut: affaire.statut,
      titre: affaire.title || 'N/A',
      probabilite: `${affaire.probabilite}%`,
    };
    
    Object.entries(variables).forEach(([key, value]) => {
      subject = subject.replace(new RegExp(`{${key}}`, 'g'), value);
      body = body.replace(new RegExp(`{${key}}`, 'g'), value);
    });
    
    // Log email activity
    await prisma.activite.create({
      data: {
        affaireId,
        organizationId: req.organizationId!,
        type: 'EMAIL_ENVOYE',
        title: 'Email envoyé via template',
        content: `Template: ${template.name}\nDestinataire: ${toEmail || affaire.client?.email}`,
      },
    });
    
    res.json({ success: true, subject, body, to: toEmail || affaire.client?.email });
  } catch (e) { next(e); }
});
