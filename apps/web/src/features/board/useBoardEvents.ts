import { useQuery, useSubscription } from '@apollo/client';
import { appendCard, removeCard } from '@/apollo/cardList';
import { syncStore } from '@/features/sync/SyncStore';
import { BoardEventsDocument, ViewerDocument } from '@/gql/graphql';

/**
 * T4.5: one boardEvents subscription per board screen. Own events are dropped (the mutation
 * result already applied them). CardUpdated/CardMoved need no handler: Apollo writes the
 * subscription result to the cache and normalises the Card objects by id.
 */
export function useBoardEvents(boardId: string | undefined) {
  const { data } = useQuery(ViewerDocument);
  const sessionId = data?.viewer.session?.id;
  useSubscription(BoardEventsDocument, {
    variables: { boardId: boardId ?? '' },
    skip: !boardId || !sessionId,
    onData: ({ client, data: { data: result } }) => {
      const event = result?.boardEvents;
      if (!event || !boardId) return;
      if (event.__typename === 'PresenceChanged') {
        syncStore.setPeers(event.peers);
        return;
      }
      if (event.origin === sessionId) return;
      if (event.__typename === 'CardCreated') appendCard(client.cache, boardId, event.card);
      if (event.__typename === 'CardDeleted') removeCard(client.cache, boardId, event.cardId);
    },
  });
}
