import pg from 'pg';
import { env } from './env';
import { transaction } from './tx';

export type { Queryable } from './tx';

export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  ssl: env.databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
});

/** One transaction per mutation on the app pool. */
export const withTx = <T>(fn: (tx: pg.PoolClient) => Promise<T>): Promise<T> =>
  transaction(pool, fn);
