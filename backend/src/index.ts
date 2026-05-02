import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { authRoutes } from './routes/auth.js';
import { clientsRoutes } from './routes/clients.js';
import { leadsRoutes } from './routes/leads.js';
import { affairesRoutes } from './routes/affaires.js';
import { previsionnelRoutes } from './routes/previsionnel.js';
import { softfactureRoutes } from './routes/softfacture.js';
import { gmailRoutes } from './routes/gmail.js';
import { kpisRoutes } from './routes/kpis.js';
import { usersRoutes } from './routes/users.js';
import { productsRoutes } from './routes/products.js';
import { activitesRoutes } from './routes/activites.js';
import { organizationsRoutes } from './routes/organizations.js';
import { uploadRoutes } from './routes/upload.js';
import { notificationsRouter } from './routes/notifications.js';
import { calendarRoutes } from './routes/calendar.js';
import { expensesRoutes } from './routes/expenses.js';
import { categoriesRoutes } from './routes/categories.js';
import { emailTemplatesRoutes } from './routes/email-templates.js';
import { aiAssistantRoutes } from './routes/ai-assistant.js';
import { subscriptionsRoutes } from './routes/subscriptions.js';
import { adminRoutes } from './routes/admin.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// ─── Middleware ──────────────────────────────────────────
app.set('trust proxy', 1);

// Enhanced Helmet configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.FRONTEND_URL || ''],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

// Rate limit : 100 req/min (general)
app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Stricter rate limit for auth routes (20 req/min)
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Trop de tentatives de connexion. Réessayez dans 1 minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Health check ────────────────────────────────────────
app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ─── API Routes ──────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/affaires', affairesRoutes);
app.use('/api/previsionnel', previsionnelRoutes);
app.use('/api/softfacture', softfactureRoutes);
app.use('/api/gmail', gmailRoutes);
app.use('/api/kpis', kpisRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/activites', activitesRoutes);
app.use('/api/organizations', organizationsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationsRouter);
app.use('/api/calendar', calendarRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/email-templates', emailTemplatesRoutes);
app.use('/api/ai-assistant', aiAssistantRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/admin', adminRoutes);

// ─── Error handler ───────────────────────────────────────
app.use(errorHandler);

// ─── Start ───────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});
