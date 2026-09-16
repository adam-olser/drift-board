import { ApolloClient, from } from '@apollo/client';
import { syncStore } from '@/features/sync/SyncStore';
import { createCache } from './cache';
import { errorLink } from './errorLink';
import { createLagLink } from './lagLink';
import { logLink } from './logLink';
import { transportLink } from './split';

/** Link chain `lag? → error → log → split(session ops → http, else → ws)`; the queue link arrives in M6. */
export function createApolloClient() {
  const lag = createLagLink();
  const links = [...(lag ? [lag] : []), errorLink, logLink, transportLink];
  const client = new ApolloClient({ link: from(links), cache: createCache() });
  syncStore.attach(client);
  return client;
}
