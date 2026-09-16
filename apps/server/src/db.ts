import pg from 'pg';
import { env } from './env';

export type Queryable = Pick<pg.Pool, 'query'> | Pick<pg.PoolClient, 'query'>;

export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  ssl: env.databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
});

/** Run `fn` inside one transaction; commit on return, roll back on throw. One per mutation. */
export async function withTx<T>(fn: (tx: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
