import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { runScheduledJobs } from '../utils/notifications.util';

// Hash both sides so the constant-time compare works on equal lengths.
const secretMatches = (provided: string): boolean => {
  const a = crypto.createHash('sha256').update(provided).digest();
  const b = crypto.createHash('sha256').update(env.CRON_SECRET).digest();
  return crypto.timingSafeEqual(a, b);
};

// @desc    Run scheduled work: expire holds, retry pending confirmations
//          and Meet links, send 24h reminders
// @route   POST /api/jobs/run
// @access  Scheduler only (Authorization: Bearer <CRON_SECRET>)
export const runJobs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const header = req.headers.authorization ?? '';
    const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!provided || !secretMatches(provided)) {
      res.status(401).json({ status: 'error', message: 'Not authorized' });
      return;
    }

    const started = Date.now();
    const result = await runScheduledJobs();
    console.log(`⏰ Scheduled jobs ran in ${Date.now() - started}ms: ${JSON.stringify(result)}`);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};
