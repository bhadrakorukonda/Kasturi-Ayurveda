import { connectDB } from './config/database';
import { env, PAYMENTS_ENABLED } from './config/env';
import { createApp } from './app';
import { expireStaleHolds } from './utils/holdExpiry.util';
import { logger } from './utils/logger';

// Process entry point: wires up crash handlers, connects to MongoDB, starts
// listening, and runs the best-effort hold-expiry timer. All app/route
// setup lives in app.ts.

process.on('uncaughtException', (err: Error) => {
  logger.error('uncaught exception, shutting down', { err });
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('unhandled promise rejection, shutting down', { err: reason });
  process.exit(1);
});

const start = async (): Promise<void> => {
  await connectDB();

  const app = createApp();
  const port = parseInt(env.PORT);
  // Express 5 also calls this callback on failure, passing the error (the
  // 'error' handler below deals with it), so only log success without one.
  const server = app.listen(port, '0.0.0.0', (error?: Error) => {
    if (error) return;
    logger.info('server started', {
      port,
      nodeEnv: env.NODE_ENV,
      paymentsEnabled: PAYMENTS_ENABLED,
      emailProvider: env.EMAIL_PROVIDER,
    });
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    logger.error(error.code === 'EADDRINUSE' ? 'port already in use' : 'server error', { port, err: error });
    process.exit(1);
  });

  // Best-effort periodic cleanup of expired payment holds. This is NOT the
  // real guarantee (Render's free tier sleeps, so this may not run
  // reliably): the lazy check on every availability/create request is what
  // actually frees a slot, and GitHub Actions calls POST /api/jobs/run
  // (see .github/workflows/scheduled-jobs.yml).
  setInterval(() => {
    expireStaleHolds().catch((err) => logger.error('hold expiry failed', { err }));
  }, 5 * 60 * 1000);
};

start().catch((err) => {
  logger.error('failed to start', { err });
  process.exit(1);
});
