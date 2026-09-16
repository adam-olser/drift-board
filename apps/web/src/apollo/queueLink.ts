import { ApolloLink, Observable, type FetchResult } from '@apollo/client';
import { syncStore } from '@/features/sync/SyncStore';

/**
 * T6.3: parks card mutations (the ones carrying an opId) while offline, observable left open
 * so Apollo keeps the optimistic layer; the store forwards them on reconnect. Everything else
 * passes straight through — graphql-ws itself waits for the socket on queries/subscriptions.
 */
export const queueLink = new ApolloLink((operation, forward) => {
  const vars = operation.variables;
  if (!vars['opId'] || syncStore.connection === 'online') return forward(operation);
  return new Observable<FetchResult>(observer => {
    syncStore.park({
      op: operation.operationName,
      cardId: (vars['cardId'] ?? vars['id'] ?? null) as string | null,
      baseVersion: (vars['baseVersion'] ?? null) as number | null,
      operation,
      forward,
      observer,
    });
  });
});
