import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { authRoutes } from './routes/auth.js';
import { clientsRoutes } from './routes/clients.js';
import { affairesRoutes } from './routes/affaires.js';
import { previsionnelRoutes } from './routes/previsionnel.js';
import { softfactureRoutes } from './routes/softfacture.js';
import { gmailRoutes } from './routes/gmail.js';
import { kpisRoutes } from './routes/kpis.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// ─── Middleware ──────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

// Rate limit : 100 req/min
app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ─── Health check ────────────────────────────────────────
app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ─── API Routes ──────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/affaires', affairesRoutes);
app.use('/api/previsionnel', previsionnelRoutes);
app.use('/api/softfacture', softfactureRoutes);
app.use('/api/gmail', gmailRoutes);
app.use('/api/kpis', kpisRoutes);

// ─── Error handler ───────────────────────────────────────
app.use(errorHandler);

// ─── Start ───────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});
