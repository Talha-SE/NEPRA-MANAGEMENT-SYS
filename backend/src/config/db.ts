import mongoose from 'mongoose';
import { env } from './env';

export async function connectDB() {
  if (!env.MONGODB_URI) {
    console.error('[DB] Missing MONGODB_URI in environment. Please set it in backend/.env');
    throw new Error('MONGODB_URI not set');
  }
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('[DB] Connected to MongoDB Atlas');
  } catch (err) {
    console.error('[DB] Connection error:', err);
    throw err;
  }
}
