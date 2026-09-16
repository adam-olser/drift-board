import { ApolloLink, Observable, type FetchResult } from '@apollo/client';
import { syncStore } from '@/features/sync/SyncStore';

/** Every operation lands in the sync log with its timing; Milestone 7 renders the log. */
export const logLink = new ApolloLink((operation, forward) => {
  const ts = Date.now();
  const entry = { ts, op: operation.operationName, vars: operation.variables };
  return new Observable<FetchResult>(observer => {
    const sub = forward(operation).subscribe({
      next: result => {
        const status = result.errors?.length ? 'error' : 'ok';
        syncStore.addLog({ ...entry, status, ms: Date.now() - ts });
        observer.next(result);
      },
      error: err => {
        syncStore.addLog({ ...entry, status: 'error', ms: Date.now() - ts });
        observer.error(err);
      },
      complete: () => observer.complete(),
    });
    return () => sub.unsubscribe();
  });
});
