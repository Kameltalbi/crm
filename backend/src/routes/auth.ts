import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { UserRole, AuditAction } from '@prisma/client';
import { logAudit } from '../lib/audit.js';
import { checkUserLimit, AuthRequest } from '../middleware/planRestrictions.js';
import auth from '../middleware/auth.js';
import { sendPasswordResetEmail } from '../services/passwordResetMailer.js';

export const authRoutes = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(passwordRegex, 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial (@$!%*?&)'),
  name: z.string().min(1),
  organizationName: z.string().min(1),
  phone: z.string().optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).regex(passwordRegex, 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial (@$!%*?&)'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).regex(passwordRegex, 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial (@$!%*?&)'),
});

authRoutes.post('/register', async (req, res, next) => {
  try {
    const { email, password, name, organizationName, phone } = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create organization first
    const organization = await prisma.organization.create({
      data: {
        name: organizationName,
        email: email,
        paymentStatus: 'PENDING',
      },
    });

    // Create default email templates
    await prisma.emailTemplate.createMany({
      data: [
        {
          organizationId: organization.id,
          name: 'Suivi de devis',
          subject: 'Votre devis de {montant} DT pour {titre}',
          body: `Bonjour {client},

Nous avons le plaisir de vous envoyer votre devis de {montant} DT concernant : {titre}.

Détails de l'affaire :
- Montant : {montant} DT
- Probabilité : {probabilite}
- Statut : {statut}
- Date : {date}

N'hésitez pas à nous contacter pour toute question.

Cordialement`,
          variables: JSON.stringify(['client', 'montant', 'titre', 'probabilite', 'statut', 'date']),
          isActive: true,
        },
        {
          organizationId: organization.id,
          name: 'Relance client',
          subject: 'Relance : Votre affaire {titre}',
          body: `Bonjour {client},

Nous faisons suite à notre dernière échange concernant votre affaire : {titre}.

Statut actuel : {statut}
Montant : {montant} DT

Nous restons à votre disposition pour avancer sur ce dossier.

Cordialement`,
          variables: JSON.stringify(['client', 'titre', 'statut', 'montant']),
          isActive: true,
        },
        {
          organizationId: organization.id,
          name: 'Confirmation de commande',
          subject: 'Confirmation de votre commande - {titre}',
          body: `Bonjour {client},

Nous avons bien reçu votre commande pour : {titre}.

Montant : {montant} DT
Date : {date}

Votre commande est maintenant en cours de traitement. Nous vous tiendrons informé de son évolution.

Merci pour votre confiance.

Cordialement`,
          variables: JSON.stringify(['client', 'titre', 'montant', 'date']),
          isActive: true,
        },
      ],
    });

    // Create default subscription (1 month trial from registration date)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    
    await prisma.subscription.create({
      data: {
        organizationId: organization.id,
        plan: organization.plan || 'FREE',
        price: organization.plan === 'ENTERPRISE' ? 980 : organization.plan === 'BUSINESS' ? 290 : 0,
        paymentMethod: 'VIREMENT',
        paymentStatus: 'PENDING',
        startDate,
        endDate,
      },
    });

    // Create user with organization
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        phone,
        role: UserRole.OWNER,
        organizationId: organization.id,
      },
    });

    // Generate access token (short-lived: 15 minutes)
    const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: '15m',
    });

    // Generate refresh token (long-lived: 30 days)
    const refreshToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: '30d',
    });

    // Hash refresh token before storing
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    // Store refresh token hash in database
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenHash,
        expiresAt,
      },
    });

    // Log audit
    await logAudit({
      organizationId: organization.id,
      userId: user.id,
      action: AuditAction.CREATE,
      entityType: 'User',
      entityId: user.id,
      newValues: { email: user.email, name: user.name, role: user.role },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
      },
      paymentStatus: organization.paymentStatus,
    });
  } catch (e) {
    next(e);
  }
});

authRoutes.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Identifiants invalides' });

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return res.status(423).json({ error: `Compte verrouillé. Réessayez dans ${remainingMinutes} minutes.` });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      // Increment failed attempts
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      if (failedAttempts >= 5) {
        // Lock account for 15 minutes
        const lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: failedAttempts, lockedUntil },
        });
        return res.status(423).json({ error: 'Trop de tentatives échouées. Compte verrouillé pendant 15 minutes.' });
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: failedAttempts },
        });
        return res.status(401).json({ error: `Identifiants invalides. ${5 - failedAttempts} tentatives restantes avant verrouillage.` });
      }
    }

    // Reset failed attempts on successful login
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    // Generate access token (short-lived: 15 minutes)
    const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: '15m',
    });

    // Generate refresh token (long-lived: 30 days)
    const refreshToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: '30d',
    });

    // Hash refresh token before storing
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    // Store refresh token hash in database
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenHash,
        expiresAt,
      },
    });

    // Log audit
    await logAudit({
      organizationId: user.organizationId,
      userId: user.id,
      action: AuditAction.LOGIN,
      entityType: 'User',
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { paymentStatus: true },
    });

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, organizationId: user.organizationId },
      paymentStatus: organization?.paymentStatus,
    });
  } catch (e) {
    next(e);
  }
});

authRoutes.get('/me', async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }
  try {
    const { userId } = jwt.verify(authHeader.substring(7), process.env.JWT_SECRET!) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        organizationId: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'User introuvable' });

    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { paymentStatus: true },
    });

    res.json({ user, paymentStatus: organization?.paymentStatus });
  } catch (e) {
    next(e);
  }
});

authRoutes.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token manquant' });
    }

    // Verify refresh token JWT
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as { userId: string };

    // Find all refresh tokens for user and compare hashes
    const allTokens = await prisma.refreshToken.findMany({
      where: { userId: decoded.userId },
      include: { user: true },
    });

    // Find matching token by hash comparison
    let storedToken = null;
    for (const token of allTokens) {
      if (await bcrypt.compare(refreshToken, token.token)) {
        storedToken = token;
        break;
      }
    }

    if (!storedToken || storedToken.expiresAt < new Date()) {
      // Delete expired tokens
      await prisma.refreshToken.deleteMany({
        where: { userId: decoded.userId, expiresAt: { lt: new Date() } },
      });
      return res.status(401).json({ error: 'Refresh token invalide ou expiré' });
    }

    // Generate new access token
    const accessToken = jwt.sign({ userId: decoded.userId }, process.env.JWT_SECRET!, {
      expiresIn: '15m',
    });

    res.json({ accessToken });
  } catch (e) {
    next(e);
  }
});

authRoutes.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      // Get user info from refresh token for audit logging
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as { userId: string };
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

      // Refresh tokens are stored hashed; find matching token by bcrypt comparison.
      const allTokens = await prisma.refreshToken.findMany({
        where: { userId: decoded.userId },
      });
      let deleted = false;
      for (const tokenRow of allTokens) {
        if (await bcrypt.compare(refreshToken, tokenRow.token)) {
          await prisma.refreshToken.delete({ where: { id: tokenRow.id } });
          deleted = true;
          break;
        }
      }
      if (!deleted) {
        // Cleanup expired tokens if no direct match found.
        await prisma.refreshToken.deleteMany({
          where: { userId: decoded.userId, expiresAt: { lt: new Date() } },
        });
      }

      // Log audit
      if (user) {
        await logAudit({
          organizationId: user.organizationId,
          userId: user.id,
          action: AuditAction.LOGOUT,
          entityType: 'User',
          entityId: user.id,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
      }
    }
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

authRoutes.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return generic message to avoid user enumeration.
    const genericResponse = {
      message: 'Si un compte existe avec cet email, un lien de réinitialisation a été généré.',
    };

    if (!user) {
      return res.json(genericResponse);
    }

    const passwordFingerprint = user.passwordHash.slice(0, 16);
    const token = jwt.sign(
      { userId: user.id, purpose: 'password_reset', fingerprint: passwordFingerprint },
      process.env.JWT_SECRET!,
      { expiresIn: '30m' }
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

    const sent = await sendPasswordResetEmail({
      toEmail: email,
      userName: user.name,
      resetUrl,
    });
    if (!sent) {
      // Fallback for environments without SMTP config.
      console.log(`[auth] Password reset link generated for ${email}: ${resetUrl}`);
    }

    if ((process.env.NODE_ENV || 'development') !== 'production') {
      return res.json({ ...genericResponse, resetUrl, emailSent: sent });
    }
    return res.json(genericResponse);
  } catch (e) {
    next(e);
  }
});

authRoutes.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      purpose: string;
      fingerprint?: string;
    };

    if (decoded.purpose !== 'password_reset') {
      return res.status(400).json({ error: 'Token invalide' });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    if (decoded.fingerprint && user.passwordHash.slice(0, 16) !== decoded.fingerprint) {
      return res.status(400).json({ error: 'Le lien de réinitialisation n\'est plus valide' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
    });

    // Revoke existing sessions after password reset.
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

authRoutes.post('/change-password', auth, async (req: AuthRequest, res, next) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const userId = req.userId!;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(400).json({ error: 'Mot de passe actuel incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
    });

    // Revoke all sessions except the current one by deleting all refresh tokens.
    await prisma.refreshToken.deleteMany({ where: { userId } });

    res.json({ success: true, message: 'Mot de passe mis à jour avec succès' });
  } catch (e) {
    next(e);
  }
});
