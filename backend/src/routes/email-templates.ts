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

const generateTemplateSchema = z.object({
  type: z.string().min(1),
  tone: z.string().min(1).default('professionnel'),
  language: z.string().min(1).default('français'),
  objective: z.string().optional(),
  context: z.string().optional(),
});

async function callOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Tu es un expert en copywriting commercial B2B. Tu dois produire un JSON strict avec les clés name, subject, body, variables (array).',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 900,
      temperature: 0.6,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

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

// POST /api/email-templates/generate - Generate template with OpenAI
emailTemplatesRoutes.post('/generate', async (req: AuthRequest, res, next) => {
  try {
    const payload = generateTemplateSchema.parse(req.body);
    const prompt = `
Crée un template d'email commercial pour un CRM.

Contraintes:
- Type: ${payload.type}
- Ton: ${payload.tone}
- Langue: ${payload.language}
- Objectif: ${payload.objective || 'Non précisé'}
- Contexte: ${payload.context || 'Non précisé'}

Variables autorisées uniquement: {client}, {montant}, {date}, {statut}, {titre}, {probabilite}
Format exigé (JSON strict):
{
  "name": "...",
  "subject": "...",
  "body": "...",
  "variables": ["client","montant","date","statut","titre","probabilite"]
}
Règles:
- Sujet court et clair
- Corps structuré, professionnel, orienté action
- Pas d'informations inventées
- Utiliser les variables entre accolades quand utile
`;

    const raw = await callOpenAI(prompt);
    const parsed = JSON.parse(raw);

    const safeName = String(parsed.name || `Template ${payload.type}`);
    const safeSubject = String(parsed.subject || 'Objet à compléter');
    const safeBody = String(parsed.body || 'Bonjour {client},\n\n...');
    const safeVariables = Array.isArray(parsed.variables)
      ? parsed.variables
      : ['client', 'montant', 'date', 'statut', 'titre', 'probabilite'];

    res.json({
      name: safeName,
      subject: safeSubject,
      body: safeBody,
      variables: JSON.stringify(safeVariables),
    });
  } catch (e) { next(e); }
});
