import { useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { SeedBoard, SeedCard } from './seed';
import { Column } from './Column';
import { planMove, type DropTarget } from './moves';
import styles from './Board.module.css';

interface Props {
  board: SeedBoard;
}

/** Group the flat card list by column, sorted by position. */
export function cardsByColumn(cards: readonly SeedCard[]): Map<string, SeedCard[]> {
  const groups = new Map<string, SeedCard[]>();
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

export function Board({ board }: Props) {
  // Milestone 1: local state. From T2.7 this becomes the Apollo cache + moveCard mutation.
  const [cards, setCards] = useState<readonly SeedCard[]>(board.cards);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return;
    const plan = planMove(cards, String(active.id), toDropTarget(String(over.id)));
    if (!plan) return;
    setCards(prev => prev.map(c => (c.id === active.id ? { ...c, ...plan } : c)));
  };

  const grouped = cardsByColumn(cards);
  const columns = [...board.columns].sort((a, b) => a.position - b.position);
  const last = columns.at(-1);
  return (
    <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragEnd={onDragEnd}>
      <main className={styles.board}>
        {columns.map(column => (
          <Column
            key={column.id}
            column={column}
            cards={grouped.get(column.id) ?? []}
            done={column === last}
          />
        ))}
      </main>
    </DndContext>
  );
}
