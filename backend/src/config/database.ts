import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI);
    // Host only: the URI itself carries credentials.
    logger.info('mongodb connected', { host: conn.connection.host });

    mongoose.connection.on('error', (err) => logger.error('mongodb connection error', { err }));
    mongoose.connection.on('disconnected', () => logger.warn('mongodb disconnected, reconnecting'));
  } catch (err) {
    logger.error('mongodb connection failed', { err });
    process.exit(1);
  }
};
