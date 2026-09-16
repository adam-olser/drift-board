import { ApolloClient, from } from '@apollo/client';
import { createCache } from './cache';
import { errorLink } from './errorLink';
import { createLagLink } from './lagLink';
import { logLink } from './logLink';
import { queueLink } from './queueLink';
import { transportLink } from './split';

/** Link chain `lag? → error → log → queue → split(session ops → http, else → ws)` (PLAN.md). */
export function createApolloClient() {
  const lag = createLagLink();
  const links = [...(lag ? [lag] : []), errorLink, logLink, queueLink, transportLink];
  return new ApolloClient({ link: from(links), cache: createCache() });
}
