import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// One structured line per request, replacing morgan.
//
// Deliberately logs the PATH ONLY, never the query string: patient links
// carry their access token as ?token=..., and morgan's default formats
// were writing those tokens into the production logs.
//
// No IP address either (personal data under DPDP, and nothing here needs
// it; rate limiting reads req.ip on its own). Each request gets an id,
// echoed in the X-Request-Id header so a user-reported error can be
// matched to its log line.
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = crypto.randomBytes(8).toString('hex');
  const started = process.hrtime.bigint();
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const durationMs = Number((process.hrtime.bigint() - started) / 1_000_000n);
    const fields = {
      requestId,
      method: req.method,
      path: (req.originalUrl || req.url).split('?')[0],
      status: res.statusCode,
      durationMs,
    };
    if (fields.path === '/health') logger.debug('request', fields);
    else if (res.statusCode >= 500) logger.error('request', fields);
    else logger.info('request', fields);
  });

  next();
};
