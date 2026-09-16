import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { BoardQuery, CardFieldsFragment } from '@/gql/graphql';
import { Column } from './Column';
import { CardRowView } from './CardRow';
import { planMove, type DropTarget, type MovePlan } from './moves';
import styles from './Board.module.css';

export type BoardData = NonNullable<BoardQuery['board']>;

interface Props {
  board: BoardData;
  /** Called with the planned placement when a drag ends somewhere meaningful. */
  onMove: (cardId: string, plan: MovePlan) => void;
  onCreate: (columnId: string, title: string) => void;
  onRename: (card: CardFieldsFragment, title: string) => void;
  onDelete: (card: CardFieldsFragment) => void;
}

/** Group the flat card list by column, sorted by position. */
export function cardsByColumn(
  cards: readonly CardFieldsFragment[]
): Map<string, CardFieldsFragment[]> {
  const groups = new Map<string, CardFieldsFragment[]>();
  for (const card of cards) {
    const list = groups.get(card.columnId);
    if (list) list.push(card);
    else groups.set(card.columnId, [card]);
  }
  for (const list of groups.values()) list.sort((a, b) => a.position - b.position);
  return groups;
}

/**
 * Whatever the pointer is inside wins (a card, else its column — so an empty column is a valid
 * target); closestCorners only as a fallback for keyboard dragging, where there is no pointer.
 */
const collisionDetection: CollisionDetection = args => {
  const within = pointerWithin(args);
  return within.length > 0 ? within : closestCorners(args);
};

function toDropTarget(overId: string): DropTarget {
  return overId.startsWith('column:')
    ? { kind: 'column', id: overId.slice('column:'.length) }
    : { kind: 'card', id: overId };
}

export function Board({ board, onMove, onCreate, onRename, onDelete }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragStart = ({ active }: DragStartEvent) => setActiveId(String(active.id));
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) return;
    const plan = planMove(board.cards, String(active.id), toDropTarget(String(over.id)));
    if (plan) onMove(String(active.id), plan);
  };

  const grouped = cardsByColumn(board.cards);
  const columns = [...board.columns].sort((a, b) => a.position - b.position);
  const last = columns.at(-1);
  const activeCard = activeId ? board.cards.find(c => c.id === activeId) : undefined;
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <main className={styles.board}>
        {columns.map(column => (
          <Column
            key={column.id}
            column={column}
            cards={grouped.get(column.id) ?? []}
            done={column === last}
            onCreate={title => onCreate(column.id, title)}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}
      </main>
      <DragOverlay dropAnimation={null}>
        {activeCard ? <CardRowView card={activeCard} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
