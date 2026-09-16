import { ApolloClient, from } from '@apollo/client';
import { syncStore } from '@/features/sync/SyncStore';
import { createCache } from './cache';
import { logLink } from './logLink';
import { transportLink } from './split';

/** Link chain `log → split(session ops → http, else → ws)`; queue and lag links arrive in M5–6. */
export function createApolloClient() {
  const client = new ApolloClient({ link: from([logLink, transportLink]), cache: createCache() });
  syncStore.attach(client);
  return client;
}
