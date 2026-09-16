import { useQuery, useSubscription } from '@apollo/client';
import { useRef } from 'react';
import { appendCard, removeCard } from '@/apollo/cardList';
import { syncStore } from '@/features/sync/SyncStore';
import { BoardDocument, BoardEventsDocument, ViewerDocument } from '@/gql/graphql';

/**
 * T4.5: one boardEvents subscription per board screen. Own events are dropped (the mutation
 * result already applied them). CardUpdated/CardMoved need no handler: Apollo writes the
 * subscription result to the cache and normalises the Card objects by id.
 */
export function useBoardEvents(boardId: string | undefined) {
  const { data } = useQuery(ViewerDocument);
  const sessionId = data?.viewer.session?.id;
  const live = useRef<string | null>(null);
  useSubscription(BoardEventsDocument, {
    variables: { boardId: boardId ?? '' },
    skip: !boardId || !sessionId,
    onData: ({ client, data: { data: result } }) => {
      const event = result?.boardEvents;
      if (!event || !boardId) return;
      if (event.__typename === 'PresenceChanged') {
        // Presence events are the one kind we keep even when we caused them (setViewing).
        syncStore.setPeers(event.peers, sessionId ?? null);
        // why: our own join event is the first thing the subscription delivers. Anything
        // published between the board query and this moment was missed; refetch once.
        if (live.current !== boardId) {
          live.current = boardId;
          void client.refetchQueries({ include: [BoardDocument] });
        }
        return;
      }
      if (event.origin === sessionId) return;
      if (event.__typename === 'CardCreated') appendCard(client.cache, boardId, event.card);
      if (event.__typename === 'CardDeleted') removeCard(client.cache, boardId, event.cardId);
    },
  });
}
