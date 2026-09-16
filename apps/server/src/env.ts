/** Parse and validate process.env exactly once. Anything missing fails fast at boot. */
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

export const env = {
  databaseUrl: required('DATABASE_URL'),
  cookieSecret: required('COOKIE_SECRET'),
  port: Number(process.env['PORT'] ?? 4000),
  isProduction: process.env['NODE_ENV'] === 'production',
} as const;
