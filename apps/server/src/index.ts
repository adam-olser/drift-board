import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { env } from './env';
import { registerGraphql } from './graphql';

const app = Fastify({
  logger: { level: env.isProduction ? 'info' : 'debug' },
  trustProxy: env.isProduction, // Render terminates TLS; the rate limiter keys on the real client IP
});

await app.register(cookie, { secret: env.cookieSecret });
await app.register(rateLimit, { global: false });
await registerGraphql(app);

// Single origin: serve the built web bundle next to the API so cookies and WSS just work.
// In dev the bundle usually does not exist and Vite serves the app with a proxy instead.
const webDist = fileURLToPath(new URL('../../web/dist/', import.meta.url));
if (existsSync(webDist)) {
  await app.register(fastifyStatic, { root: webDist, wildcard: false, index: 'index.html' });
  app.setNotFoundHandler((request, reply) => {
    if (request.method === 'GET' && !request.url.startsWith('/graphql')) {
      return reply.sendFile('index.html'); // SPA fallback for /b/:slug
    }
    return reply.code(404).send({ error: 'Not found' });
  });
  app.log.info({ webDist }, 'serving web bundle');
}

await app.listen({ port: env.port, host: '0.0.0.0' });
