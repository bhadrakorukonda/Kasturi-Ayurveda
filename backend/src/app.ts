import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { env, PAYMENTS_ENABLED } from './config/env';
import appointmentRoutes from './routes/appointment.routes';
import contactRoutes from './routes/contact.routes';
import authRoutes from './routes/auth.routes';
import doctorRoutes from './routes/doctor.routes';
import configRoutes from './routes/config.routes';
import settingsRoutes from './routes/settings.routes';
import availabilityRoutes from './routes/availability.routes';
import paymentRoutes from './routes/payment.routes';
import jobsRoutes from './routes/jobs.routes';
import { errorHandler } from './middleware/error.middleware';
import { requestLogger } from './middleware/requestLogger.middleware';

// Builds the Express app without connecting to the DB or listening, so
// tests can drive it directly (supertest). server.ts does the rest.
export const createApp = (): Application => {
  const app = express();

  // Render sits behind a reverse proxy; trust the first hop so req.ip
  // (used by rate limiting) reflects the real client IP.
  app.set('trust proxy', 1);

  app.use(requestLogger);
  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));

  // Razorpay webhook. Mounted before express.json() (it needs the raw body
  // for signature verification) and before the general /api rate limiter
  // (Razorpay retries must never be throttled; every request is HMAC-checked
  // anyway). Not mounted at all while PAYMENTS_ENABLED=false, so it 404s.
  if (PAYMENTS_ENABLED) {
    app.use('/api/payments', paymentRoutes);
  }

  app.use(
    '/api/',
    rateLimit({
      windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS),
      max: parseInt(env.RATE_LIMIT_MAX_REQUESTS),
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req: Request, res: Response) => {
    const isDbConnected = mongoose.connection.readyState === 1;
    res.status(isDbConnected ? 200 : 503).json({
      status: isDbConnected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/appointments', appointmentRoutes);
  app.use('/api/contact', contactRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/doctors', doctorRoutes);
  app.use('/api/config', configRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/availability', availabilityRoutes);
  app.use('/api/jobs', jobsRoutes);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ status: 'error', message: 'Route not found' });
  });

  app.use(errorHandler);

  return app;
};
