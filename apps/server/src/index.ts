import { pool } from './db';

// Milestone 2 T2.1: proves the pool talks to Postgres. Fastify arrives in T2.2.
const { rows } = await pool.query<{ boards: string }>(
  'select count(*)::text as boards from boards'
);
process.stdout.write(`boards: ${rows[0]?.boards ?? '?'}\n`);
await pool.end();
