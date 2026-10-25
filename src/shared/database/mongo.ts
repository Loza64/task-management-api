import mongoose from 'mongoose';
import { env } from '../config/env';
import { databaseLog } from '../logger/logger';

export const connectMongo = async (): Promise<void> => {
  await mongoose.connect(env.MONGO_URI);
  databaseLog('MongoDB connected');
};

export const disconnectMongo = async (): Promise<void> => {
  await mongoose.disconnect();
};
