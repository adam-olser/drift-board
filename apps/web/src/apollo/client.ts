import { ApolloClient, HttpLink } from '@apollo/client';
import { createCache } from './cache';

/** Milestone 2: HTTP only. The socket, log, queue and lag links arrive in Milestones 4–6. */
export const createApolloClient = () =>
  new ApolloClient({
    link: new HttpLink({ uri: '/graphql', credentials: 'same-origin' }),
    cache: createCache(),
  });
