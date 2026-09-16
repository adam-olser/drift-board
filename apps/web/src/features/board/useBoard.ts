import { useMutation, useQuery } from '@apollo/client';
import { between } from '@shared/ordering';
import { appendCard, removeCard } from '@/apollo/cardList';
import {
  BoardDocument,
  CreateCardDocument,
  DeleteCardDocument,
  MoveCardDocument,
  SetViewingDocument,
  UpdateCardDocument,
  ViewerDocument,
  type CardFieldsFragment,
} from '@/gql/graphql';
import type { MovePlan } from './moves';

const opId = () => crypto.randomUUID();
/** Mutation failures are already toasts (errorLink) and rolled-back layers; nothing to rethrow. */
const settled = <T>(p: Promise<T>) => p.catch(() => undefined);

/**
 * The canonical board for a slug plus the four card mutations, each with an optimistic layer
 * (T5.2) that the server result replaces. Errors surface as toasts via errorLink.
 */
export function useBoard(slug: string) {
  const { data, loading, error } = useQuery(BoardDocument, { variables: { slug } });
  const board = data?.board ?? null;
  const viewer = useQuery(ViewerDocument).data?.viewer.session;
  const me = () => ({
    __typename: 'Peer' as const,
    sessionId: viewer?.id ?? '',
    name: viewer?.displayName ?? '',
    color: viewer?.color ?? 'transparent',
  });
  const stamp = () => ({ updatedAt: new Date().toISOString(), updatedBy: me() });
  const [moveCard] = useMutation(MoveCardDocument);
  const [updateCard] = useMutation(UpdateCardDocument);
  const [createCard] = useMutation(CreateCardDocument);
  const [deleteCard] = useMutation(DeleteCardDocument);
  const [setViewingMutation] = useMutation(SetViewingDocument);

  const move = (cardId: string, plan: MovePlan) => {
    const card = board?.cards.find(c => c.id === cardId);
    return settled(
      moveCard({
        variables: { opId: opId(), cardId, ...plan },
        optimisticResponse: card ? { moveCard: [{ ...card, ...plan, ...stamp() }] } : undefined,
      })
    );
  };

  const edit = (card: CardFieldsFragment, fields: { title?: string; description?: string }) =>
    settled(
      updateCard({
        variables: { opId: opId(), cardId: card.id, baseVersion: card.version, ...fields },
        optimisticResponse: {
          updateCard: { ...card, ...fields, version: card.version + 1, ...stamp() },
        },
      })
    );
  const rename = (card: CardFieldsFragment, title: string) => edit(card, { title });

  /** Position after the last card in a column. */
  const tailPosition = (columnId: string) => {
    const last = (board?.cards ?? [])
      .filter(c => c.columnId === columnId)
      .reduce<number | null>(
        (max, c) => (max === null || c.position > max ? c.position : max),
        null
      );
    return between(last, null);
  };

  const create = (columnId: string, title: string) => {
    if (!board) return Promise.resolve(undefined);
    const boardId = board.id;
    const id = crypto.randomUUID();
    const position = tailPosition(columnId);
    return settled(
      createCard({
        variables: { opId: opId(), id, boardId, columnId, title, position },
        // Apollo runs `update` for the optimistic layer too, so the card appears instantly with
        // a placeholder key until the server assigns one.
        optimisticResponse: {
          createCard: {
            __typename: 'Card',
            id,
            key: '···',
            title,
            description: '',
            columnId,
            position,
            version: 1,
            ...stamp(),
          },
        },
        update: (cache, { data: result }) => {
          if (result) appendCard(cache, boardId, result.createCard);
        },
      })
    );
  };

  const remove = (cardId: string) => {
    if (!board) return Promise.resolve(undefined);
    const boardId = board.id;
    return settled(
      deleteCard({
        variables: { opId: opId(), cardId },
        optimisticResponse: { deleteCard: cardId },
        update: cache => removeCard(cache, boardId, cardId),
      })
    );
  };

  /** Card-level presence: no opId, never queued, fire and forget. */
  const setViewing = (cardId: string | null) =>
    board ? settled(setViewingMutation({ variables: { boardId: board.id, cardId } })) : undefined;

  return { board, loading, error, move, rename, edit, create, remove, tailPosition, setViewing };
}
