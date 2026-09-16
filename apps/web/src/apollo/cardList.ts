import type { ApolloCache, Reference } from '@apollo/client';
import { CardFieldsFragmentDoc, type CardFieldsFragment } from '@/gql/graphql';

const boardRef = (cache: ApolloCache<unknown>, boardId: string) =>
  cache.identify({ __typename: 'Board', id: boardId });

/** The only code that adds to or removes from Board.cards. Everything else normalises by id. */
export function appendCard(cache: ApolloCache<unknown>, boardId: string, card: CardFieldsFragment) {
  const id = boardRef(cache, boardId);
  const ref = cache.writeFragment({
    fragment: CardFieldsFragmentDoc,
    fragmentName: 'CardFields',
    data: card,
  });
  if (!id || !ref) return;
  cache.modify({
    id,
    fields: {
      cards: (existing, { readField }) => {
        const list = Array.isArray(existing) ? (existing as readonly Reference[]) : [];
        return list.some(r => readField('id', r) === card.id) ? list : [...list, ref];
      },
    },
  });
}

export function removeCard(cache: ApolloCache<unknown>, boardId: string, cardId: string) {
  const id = boardRef(cache, boardId);
  const cardRef = cache.identify({ __typename: 'Card', id: cardId });
  if (id) {
    cache.modify({
      id,
      fields: {
        cards: (existing, { readField }) => {
          const list = Array.isArray(existing) ? (existing as readonly Reference[]) : [];
          return list.filter(r => readField('id', r) !== cardId);
        },
      },
    });
  }
  if (cardRef) cache.evict({ id: cardRef });
  cache.gc();
}
