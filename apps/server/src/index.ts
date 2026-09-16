import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { env } from './env';
import { registerGraphql } from './graphql';

const app = Fastify({ logger: { level: env.isProduction ? 'info' : 'debug' } });

await app.register(cookie, { secret: env.cookieSecret });
await app.register(rateLimit, { global: false });
await registerGraphql(app);

await app.listen({ port: env.port, host: '0.0.0.0' });
