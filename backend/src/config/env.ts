import dotenv from 'dotenv';

dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';

export const env = {
  NODE_ENV,
  PORT: Number(process.env.PORT || 4000),
  MONGODB_URI: process.env.MONGODB_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || 'change-me-in-.env',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  COOKIE_SECURE: NODE_ENV === 'production',
  // SQL Server
  SQL_SERVER: process.env.SQL_SERVER || '',
  SQL_PORT: process.env.SQL_PORT ? Number(process.env.SQL_PORT) : undefined,
  SQL_DATABASE: process.env.SQL_DATABASE || '',
  SQL_USER: process.env.SQL_USER || '',
  SQL_PASSWORD: process.env.SQL_PASSWORD || '',
  SQL_ENCRYPT: (process.env.SQL_ENCRYPT || 'false').toLowerCase() === 'true',
  SQL_TRUST_SERVER_CERT: (process.env.SQL_TRUST_SERVER_CERT || 'true').toLowerCase() === 'true',
};

if (!env.MONGODB_URI) {
  // Do not throw; allow app to start and show clear error on connection attempt
  // This will be logged by the DB connector.
}
