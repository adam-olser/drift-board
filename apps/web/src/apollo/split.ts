import { HttpLink, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { Kind, type DocumentNode } from 'graphql';
import { syncStore } from '@/features/sync/SyncStore';

/** The four cookie-setting mutations stay on HTTP (PLAN.md); everything else rides the socket. */
const SESSION_OPS = new Set(['startGuestSession', 'signUp', 'logIn', 'logOut']);

export function touchesSessionOp(document: DocumentNode): boolean {
  return document.definitions.some(
    def =>
      def.kind === Kind.OPERATION_DEFINITION &&
      def.operation === 'mutation' &&
      def.selectionSet.selections.some(
        sel => sel.kind === Kind.FIELD && SESSION_OPS.has(sel.name.value)
      )
  );
}

const wsUrl = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/graphql`;

/** One socket for the app's lifetime; "socket connected?" is the single offline signal. */
export const wsClient = createClient({
  url: wsUrl,
  lazy: false,
  retryAttempts: Infinity,
  shouldRetry: () => true,
  // why: the default backoff starts at 1–4 s; the name dialog terminates the socket to re-auth
  // and should not wait that long. 250 ms, doubling, capped at 8 s.
  retryWait: retries => new Promise(r => setTimeout(r, Math.min(250 * 2 ** retries, 8000))),
  on: {
    connected: () => syncStore.replay(),
    closed: () => syncStore.setConnection('offline'),
  },
});

export const transportLink = split(
  ({ query }) => touchesSessionOp(query),
  new HttpLink({ uri: '/graphql', credentials: 'same-origin' }),
  new GraphQLWsLink(wsClient)
);
