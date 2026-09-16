import { ApolloLink, Observable, type FetchResult } from '@apollo/client';

/** `?lag=<ms>` delays every operation so the optimistic layer is visible in a demo. Dev only. */
export function createLagLink(): ApolloLink | null {
  const ms = Number(new URLSearchParams(location.search).get('lag'));
  if (!ms) return null;
  return new ApolloLink(
    (operation, forward) =>
      new Observable<FetchResult>(observer => {
        let sub: { unsubscribe(): void } | undefined;
        const timer = setTimeout(() => {
          sub = forward(operation).subscribe(observer);
        }, ms);
        return () => {
          clearTimeout(timer);
          sub?.unsubscribe();
        };
      })
  );
}
