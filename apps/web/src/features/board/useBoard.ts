import { useMutation, useQuery } from '@apollo/client';
import { between } from '@shared/ordering';
import { appendCard, removeCard } from '@/apollo/cardList';
import {
  BoardDocument,
  CreateCardDocument,
  DeleteCardDocument,
  MoveCardDocument,
  UpdateCardDocument,
  type CardFieldsFragment,
} from '@/gql/graphql';
import type { MovePlan } from './moves';

const opId = () => crypto.randomUUID();

/** The canonical board for a slug plus the four card mutations. Optimistic layers come in M5. */
export function useBoard(slug: string) {
  const { data, loading, error } = useQuery(BoardDocument, { variables: { slug } });
  const board = data?.board ?? null;
  const [moveCard] = useMutation(MoveCardDocument);
  const [updateCard] = useMutation(UpdateCardDocument);
  const [createCard] = useMutation(CreateCardDocument);
  const [deleteCard] = useMutation(DeleteCardDocument);

  const move = (cardId: string, plan: MovePlan) =>
    moveCard({ variables: { opId: opId(), cardId, ...plan } });

  const rename = (card: CardFieldsFragment, title: string) =>
    updateCard({ variables: { opId: opId(), cardId: card.id, baseVersion: card.version, title } });

  const create = (columnId: string, title: string) => {
    if (!board) return Promise.resolve(undefined);
    const last = board.cards
      .filter(c => c.columnId === columnId)
      .reduce<number | null>(
        (max, c) => (max === null || c.position > max ? c.position : max),
        null
      );
    const boardId = board.id;
    return createCard({
      variables: {
        opId: opId(),
        id: crypto.randomUUID(),
        boardId,
        columnId,
        title,
        position: between(last, null),
      },
      update: (cache, { data: result }) => {
        if (result) appendCard(cache, boardId, result.createCard);
      },
    });
  };

  const remove = (cardId: string) => {
    if (!board) return Promise.resolve(undefined);
    const boardId = board.id;
    return deleteCard({
      variables: { opId: opId(), cardId },
      update: cache => removeCard(cache, boardId, cardId),
    });
  };

  return { board, loading, error, move, rename, create, remove };
}
