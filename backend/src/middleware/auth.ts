import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma.js';

export interface AuthRequest extends Request {
  userId?: string;
  organizationId?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    organizationId: string;
  };
}

const auth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    req.userId = decoded.userId;
    
    // Fetch user to get organizationId and full user data
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true, organizationId: true }
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Utilisateur introuvable' });
    }
    
    req.organizationId = user.organizationId;
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
};

// Middleware to check if user has permission to access a page
export const requirePage = (page: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    // OWNER has access to everything
    if (req.user.role === 'OWNER') {
      return next();
    }

    // Check user permissions
    const permission = await prisma.userPermission.findFirst({
      where: {
        userId: req.user.id,
        organizationId: req.organizationId,
        page,
      },
    });

    if (!permission || !permission.canView) {
      return res.status(403).json({ error: 'Accès non autorisé à cette page' });
    }

    next();
  };
};

export default auth;
