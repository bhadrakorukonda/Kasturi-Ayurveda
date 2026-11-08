import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { connectDB } from './config/database';
import { env } from './config/env';
import appointmentRoutes from './routes/appointment.routes';
import contactRoutes from './routes/contact.routes';
import authRoutes from './routes/auth.routes';
import doctorRoutes from './routes/doctor.routes';
import configRoutes from './routes/config.routes';
import settingsRoutes from './routes/settings.routes';
import { errorHandler } from './middleware/error.middleware';

// Handle uncaught exceptions - MUST be at the top!
process.on('uncaughtException', (err: Error) => {
  console.log('❌ Uncaught Exception:', err.message);
  console.log(err.stack);
  console.log('⚠️  Shutting down server...');
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.log('❌ Unhandled Promise Rejection:', err.message);
  console.log(err.stack);
  console.log('⚠️  Shutting down server...');
  process.exit(1);
});

// Create Express app
const app: Application = express();

// Render sits behind a reverse proxy; trust the first hop so req.ip
// (used by rate limiting) reflects the real client IP.
app.set('trust proxy', 1);

// Initialize server
const initializeServer = async () => {
  // Database connection - wait for it to complete
  await connectDB();
};

// Start database connection
initializeServer().catch((error) => {
  console.error('❌ Failed to initialize server:', error);
  process.exit(1);
});

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS),
  max: parseInt(env.RATE_LIMIT_MAX_REQUESTS),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  const isDbConnected = mongoose.connection.readyState === 1;

  if (!isDbConnected) {
    res.status(503).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// API routes
console.log('📌 Registering API routes...');
app.use('/api/appointments', appointmentRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/config', configRoutes);
app.use('/api/settings', settingsRoutes);
console.log('✅ Routes registered');

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = parseInt(env.PORT);
const HOST = '0.0.0.0'; // Listen on all IPv4 addresses

console.log(`🔄 Attempting to start server on ${HOST}:${PORT}...`);

const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running in ${env.NODE_ENV} mode on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 API endpoints: http://localhost:${PORT}/api`);
});

console.log(`📊 Server object created, listening status: ${server.listening}`);

setTimeout(() => {
  console.log(`📊 Server address after timeout:`, server.address());
  console.log(`📊 Server listening status:`, server.listening);
  console.log(`📊 Event loop is active, server should stay running...`);
}, 1000);

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});

// Keep the process alive
setInterval(() => {
  // This keeps the event loop active
}, 60000);

// Log if process is about to exit
process.on('beforeExit', (code) => {
  console.log(`⚠️  Process beforeExit event with code: ${code}`);
});

process.on('exit', (code) => {
  console.log(`⚠️  Process exit event with code: ${code}`);
});

// export default app; // REMOVED - this file is not meant to be imported
