import { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.js';

export function requireTenantFilter(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.organizationId) {
    return res.status(400).json({ error: 'Organization ID manquant' });
  }
  next();
}
