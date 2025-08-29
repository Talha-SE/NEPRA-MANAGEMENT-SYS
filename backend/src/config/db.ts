import sql, { ConnectionPool } from 'mssql';
import { env } from './env';

let pool: ConnectionPool | null = null;

export function getPool(): ConnectionPool {
  if (!pool) throw new Error('[DB] Pool not initialized. Call connectDB() first.');
  return pool;
}

export async function connectDB() {
  if (!env.SQL_SERVER || !env.SQL_DATABASE || !env.SQL_USER) {
    console.error('[DB] Missing SQL_* env vars. Please set SQL_SERVER, SQL_DATABASE, SQL_USER, SQL_PASSWORD');
    throw new Error('SQL configuration not set');
  }

  if (pool) {
    // already connected
    return pool;
  }

  try {
    pool = await new sql.ConnectionPool({
      user: env.SQL_USER,
      password: env.SQL_PASSWORD,
      server: env.SQL_SERVER,
      port: env.SQL_PORT,
      database: env.SQL_DATABASE,
      options: {
        encrypt: env.SQL_ENCRYPT,
        trustServerCertificate: env.SQL_TRUST_SERVER_CERT,
      },
    }).connect();

    console.log('[DB] Connected to SQL Server');
    return pool;
  } catch (err) {
    console.error('[DB] Connection error:', err);
    throw err;
  }
}
