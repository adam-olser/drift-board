import { ApolloLink, Observable, type ApolloCache, type FetchResult } from '@apollo/client';
import { syncStore } from '@/features/sync/SyncStore';
import { CardFieldsFragmentDoc } from '@/gql/graphql';

const keyOf = (data: Record<string, unknown> | null | undefined): string | undefined => {
  const first = data && Object.values(data)[0];
  const card = Array.isArray(first) ? first[0] : first;
  return card && typeof card === 'object' && 'key' in card ? String(card.key) : undefined;
};

/** Every operation lands in the sync log: pending at request time, settled with timing. */
export const logLink = new ApolloLink((operation, forward) => {
  const ts = Date.now();
  const vars = operation.variables;
  const cardId = (vars['cardId'] ?? vars['id'] ?? null) as string | null;
  // The key from the cache at request time survives a delete's eviction.
  const cache = operation.getContext()['cache'] as ApolloCache<unknown> | undefined;
  const cached = cardId
    ? cache?.readFragment({
        id: `Card:${cardId}`,
        fragment: CardFieldsFragmentDoc,
        fragmentName: 'CardFields',
      })
    : null;
  const entry = syncStore.addLog({
    ts,
    op: operation.operationName,
    vars,
    status: 'pending',
    ms: 0,
    cardId,
    ...(cached?.key ? { key: cached.key } : {}),
  });
  return new Observable<FetchResult>(observer => {
    const sub = forward(operation).subscribe({
      next: result => {
        const error = result.errors?.[0];
        syncStore.settleLog(entry, {
          status: error ? 'error' : 'ok',
          ms: Date.now() - ts,
          key: keyOf(result.data as Record<string, unknown> | null) ?? entry.key,
          error: error ? String(error.extensions?.['code'] ?? error.message) : undefined,
        });
        observer.next(result);
      },
      error: err => {
        syncStore.settleLog(entry, { status: 'error', ms: Date.now() - ts, error: String(err) });
        observer.error(err);
      },
      complete: () => observer.complete(),
    });
    return () => sub.unsubscribe();
  });
});
