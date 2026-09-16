import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../../env';

export const SESSION_COOKIE = 'dbsid';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** D-011: httpOnly, lax (single origin), secure outside development, signed, one year. */
export function setSessionCookie(reply: FastifyReply, sessionId: string): void {
  reply.setCookie(SESSION_COOKIE, sessionId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProduction,
    signed: true,
    maxAge: ONE_YEAR_SECONDS,
  });
}

/** The session id from a valid signed cookie, or null. Works for HTTP requests and WS upgrades. */
export function readSessionId(request: FastifyRequest): string | null {
  const raw = request.cookies[SESSION_COOKIE];
  if (!raw) return null;
  const unsigned = request.unsignCookie(raw);
  return unsigned.valid && unsigned.value ? unsigned.value : null;
}
