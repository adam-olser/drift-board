import { readFileSync } from 'node:fs';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import mercurius, { type IResolvers } from 'mercurius';
import { Kind, type DocumentNode } from 'graphql';
import type { Resolvers } from './gql/types';
import { rateLimited } from './errors';
import { env } from './env';
import { pool } from './db';
import { readSessionId } from './modules/sessions/cookie';
import { findSession, type SessionRow } from './modules/sessions/sql';
import { sessionResolvers } from './modules/sessions/resolvers';

/** Per-request context handed to every resolver. `session` is null until startGuestSession. */
export interface Context {
  request: FastifyRequest;
  reply: FastifyReply;
  session: SessionRow | null;
}

async function buildContext(request: FastifyRequest, reply: FastifyReply): Promise<Context> {
  const sessionId = readSessionId(request);
  const session = sessionId ? await findSession(pool, sessionId) : null;
  return { request, reply, session };
}

declare module 'mercurius' {
  // Mercurius hooks receive MercuriusContext; make it carry our fields too.
  interface MercuriusContext {
    request: FastifyRequest;
    session: Context['session'];
  }
}

const schema = readFileSync(new URL('./schema.graphql', import.meta.url), 'utf8');

/** The four cookie-setting mutations: HTTP only, rate limited per IP. */
const SESSION_OPS = new Set(['startGuestSession', 'signUp', 'logIn', 'logOut']);

function touchesSessionOp(document: DocumentNode): boolean {
  return document.definitions.some(
    def =>
      def.kind === Kind.OPERATION_DEFINITION &&
      def.operation === 'mutation' &&
      def.selectionSet.selections.some(
        sel => sel.kind === Kind.FIELD && SESSION_OPS.has(sel.name.value)
      )
  );
}

const resolvers = {
  Query: {
    board: () => null,
    ...sessionResolvers.Query,
  },
  Mutation: {
    ...sessionResolvers.Mutation,
  },
} satisfies Resolvers;

export async function registerGraphql(app: FastifyInstance): Promise<void> {
  await app.register(mercurius, {
    schema,
    // why: codegen's Resolvers and mercurius's IResolvers are structurally equivalent but not
    // assignable; `satisfies Resolvers` above did the real checking.
    resolvers: resolvers as IResolvers,
    graphiql: !env.isProduction,
    context: buildContext,
  });

  const checkSessionOpLimit = app.createRateLimit({ max: 20, timeWindow: '1 minute' });
  app.graphql.addHook('preExecution', async (_schema, document, context) => {
    if (!touchesSessionOp(document)) return;
    const limit = await checkSessionOpLimit(context.request);
    // isAllowed is only true for allow-listed clients; isExceeded is the actual verdict.
    if (!limit.isAllowed && limit.isExceeded) throw rateLimited();
  });
}
