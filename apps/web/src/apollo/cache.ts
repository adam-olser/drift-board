import { InMemoryCache } from '@apollo/client';

/**
 * Every entity is keyed by id. Board.cards is one flat list with the default merge (replace);
 * only cardList.ts ever adds to or removes from it. Columns are derived on the client.
 */
export const createCache = () =>
  new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          // board(slug) always resolves to the same normalised Board for a given slug
          board: { keyArgs: ['slug'] },
        },
      },
      // why: Viewer has no id; without merge: true a query selecting only viewer.boards would
      // replace the object and drop viewer.session until the Viewer query answers again.
      Viewer: { merge: true },
      Subscription: {
        // each event replaces the last; the Card objects inside are normalised by id anyway
        fields: { boardEvents: { merge: false } },
      },
    },
  });
