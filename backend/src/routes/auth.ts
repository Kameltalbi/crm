import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { UserRole, AuditAction } from '@prisma/client';
import { logAudit } from '../lib/audit.js';

export const authRoutes = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  organizationName: z.string().min(1),
});

authRoutes.post('/register', async (req, res, next) => {
  try {
    const { email, password, name, organizationName } = registerSchema.parse(req.body);

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
      },
    });

    // Create user with organization
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
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

    // Store refresh token in database
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
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

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Identifiants invalides' });

    // Generate access token (short-lived: 15 minutes)
    const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: '15m',
    });

    // Generate refresh token (long-lived: 30 days)
    const refreshToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: '30d',
    });

    // Store refresh token in database
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
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

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
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
        role: true,
        organizationId: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'User introuvable' });
    res.json({ user });
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

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as { userId: string };

    // Check if refresh token exists in database and is not expired
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      // Delete expired token if exists
      if (storedToken) {
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      }
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

      // Delete refresh token from database
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });

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
