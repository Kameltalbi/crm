import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { UserRole } from '@prisma/client';

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

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: '7d',
    });

    res.status(201).json({
      token,
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

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: '7d',
    });
    res.json({
      token,
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
