import { config } from 'dotenv';

config();

export const env = {
  PORT: Number(process.env.PORT) || 4100,
  ORIGIN: process.env.ORIGIN,
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  isDev: (process.env.NODE_ENV ?? 'development') === 'development',
  MONGO_URI: process.env.MONGO_URI ?? 'mongodb://localhost:27017/tasks_db',
};
