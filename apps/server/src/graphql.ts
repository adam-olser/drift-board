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
import { boardResolvers } from './modules/boards/resolvers';
import { cardResolvers } from './modules/cards/resolvers';
import { onDisconnect, presenceResolvers } from './modules/presence/resolvers';
import { bindPubsub } from './modules/events';

/** Per-request context handed to every resolver. `session` is null until startGuestSession. */
export interface Context {
  request: FastifyRequest;
  /** Absent over the socket; only the HTTP-only session mutations touch it. */
  reply: FastifyReply;
  session: SessionRow | null;
  /** Socket connections only: shared by every operation on the connection and by onDisconnect. */
  conn?: { boardId: string | null };
}

async function buildContext(request: FastifyRequest, reply: FastifyReply): Promise<Context> {
  const sessionId = readSessionId(request);
  const session = sessionId ? await findSession(pool, sessionId) : null;
  return { request, reply, session };
}

/** The socket context is resolved once per connection, from the cookie on the upgrade request. */
async function buildSocketContext(_socket: unknown, request: FastifyRequest) {
  const ctx = await buildContext(request, undefined as unknown as FastifyReply);
  return { ...ctx, conn: { boardId: null } };
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
  Query: { ...sessionResolvers.Query, ...boardResolvers.Query },
  Mutation: {
    ...sessionResolvers.Mutation,
    ...boardResolvers.Mutation,
    ...cardResolvers.Mutation,
    ...presenceResolvers.Mutation,
  },
  Subscription: presenceResolvers.Subscription,
  Session: sessionResolvers.Session,
  BoardEvent: { __resolveType: e => e.__typename ?? null },
  Viewer: boardResolvers.Viewer,
  Board: boardResolvers.Board,
} satisfies Resolvers;

export async function registerGraphql(app: FastifyInstance): Promise<void> {
  await app.register(mercurius, {
    schema,
    // why: codegen's Resolvers and mercurius's IResolvers are structurally equivalent but not
    // assignable; `satisfies Resolvers` above did the real checking.
    resolvers: resolvers as IResolvers,
    graphiql: !env.isProduction,
    context: buildContext,
    // T4.1: queries and mutations ride the socket too; only session ops stay on HTTP.
    subscription: { fullWsTransport: true, context: buildSocketContext, onDisconnect },
  });
  bindPubsub(app);

  const checkSessionOpLimit = app.createRateLimit({ max: 20, timeWindow: '1 minute' });
  app.graphql.addHook('preExecution', async (_schema, document, context) => {
    if (!touchesSessionOp(document)) return;
    if (!context.reply) throw new Error('Session mutations must be sent over HTTP');
    const limit = await checkSessionOpLimit(context.request);
    // isAllowed is only true for allow-listed clients; isExceeded is the actual verdict.
    if (!limit.isAllowed && limit.isExceeded) throw rateLimited();
  });
}
