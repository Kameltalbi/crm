import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { gmailService } from '../services/gmail.js';

export const gmailRoutes = Router();

// ─── OAuth2 : initier la connexion ─────────────────────────────
gmailRoutes.get('/auth', requireAuth, (req: AuthRequest, res) => {
  const url = gmailService.getAuthUrl(req.userId!);
  res.json({ url });
});

// ─── OAuth2 : callback (après consentement Google) ─────────────
gmailRoutes.get('/callback', async (req, res, next) => {
  try {
    const { code, state } = req.query;
    if (!code || !state) return res.status(400).send('Paramètres manquants');

    const userId = String(state);
    const tokens = await gmailService.exchangeCode(String(code));

    await prisma.gmailToken.upsert({
      where: { userId },
      update: {
        accessToken:  tokens.access_token!,
        refreshToken: tokens.refresh_token!,
        expiresAt:    new Date(tokens.expiry_date!),
        scope:        tokens.scope || '',
      },
      create: {
        userId,
        accessToken:  tokens.access_token!,
        refreshToken: tokens.refresh_token!,
        expiresAt:    new Date(tokens.expiry_date!),
        scope:        tokens.scope || '',
      },
    });

    res.redirect(`${process.env.FRONTEND_URL}/settings?gmail=connected`);
  } catch (e) { next(e); }
});

// ─── Statut connexion Gmail ────────────────────────────────────
gmailRoutes.get('/status', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const token = await prisma.gmailToken.findUnique({
      where: { userId: req.userId! },
    });
    res.json({ connected: !!token, email: token ? await gmailService.getEmail(token) : null });
  } catch (e) { next(e); }
});

// ─── Envoyer un email (avec PJ optionnelle) ────────────────────
gmailRoutes.post('/send', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      affaireId:  z.string().optional(),
      to:         z.string().email(),
      subject:    z.string().min(1),
      body:       z.string().min(1),
      htmlBody:   z.string().optional(),
      attachPdfUrl: z.string().url().optional(),
      attachName: z.string().optional(),
    });
    const data = schema.parse(req.body);

    const token = await prisma.gmailToken.findUnique({
      where: { userId: req.userId! },
    });
    if (!token) return res.status(400).json({ error: 'Gmail non connecté' });

    const sent = await gmailService.sendMail(token, {
      to:       data.to,
      subject:  data.subject,
      text:     data.body,
      html:     data.htmlBody,
      pdfUrl:   data.attachPdfUrl,
      pdfName:  data.attachName,
    });

    const emailLog = await prisma.email.create({
      data: {
        affaireId: data.affaireId,
        messageId: sent.messageId,
        fromEmail: sent.from,
        toEmail:   data.to,
        subject:   data.subject,
        body:      data.body,
        sent:      true,
        sentAt:    new Date(),
      },
    });

    if (data.affaireId) {
      await prisma.activite.create({
        data: {
          affaireId: data.affaireId,
          type: 'EMAIL_ENVOYE',
          title: `Email envoyé à ${data.to}`,
          content: data.subject,
        },
      });
    }
    res.json(emailLog);
  } catch (e) { next(e); }
});
