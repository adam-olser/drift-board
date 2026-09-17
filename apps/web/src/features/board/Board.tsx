import { useRef, useState } from 'react';
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
import { MoveSheet } from './MoveSheet';
import { planMove, type DropTarget, type MovePlan } from './moves';
import { usePhone } from './usePhone';
import styles from './Board.module.css';

export type BoardData = NonNullable<BoardQuery['board']>;

interface Props {
  board: BoardData;
  /** Called with the planned placement when a drag ends somewhere meaningful. */
  onMove: (cardId: string, plan: MovePlan) => void;
  onCreate: (columnId: string, title: string) => void;
  onRename: (card: CardFieldsFragment, title: string) => void;
  onDelete: (card: CardFieldsFragment) => void;
  onOpen: (card: CardFieldsFragment) => void;
  /**
   * Card ids the active filter matches, or undefined when no filter is active. Only hides
   * rows and drop targets — planMove still sees every card in `board.cards` so a filtered
   * card's position is still computed against its real neighbours, filtered or not.
   */
  visibleIds?: ReadonlySet<string> | undefined;
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

const LONG_PRESS_MS = 500;

export function Board({ board, onMove, onCreate, onRename, onDelete, onOpen, visibleIds }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const phone = usePhone();
  const [tab, setTab] = useState<string | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const current = columns.find(c => c.id === tab) ?? columns[0];
  const shown = phone && current ? [current] : columns;
  const sheetCard = sheetId ? board.cards.find(c => c.id === sheetId) : undefined;

  // Mobile artboard: long-press a card to move it. Event delegation on the board; the row
  // carries data-card-id. Any movement or release before the timer cancels it.
  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (!phone) return;
    const id = (e.target as HTMLElement).closest<HTMLElement>('[data-card-id]')?.dataset['cardId'];
    if (!id) return;
    cancelPress();
    pressTimer.current = setTimeout(() => setSheetId(id), LONG_PRESS_MS);
  };
  const moveToTail = (card: CardFieldsFragment, columnId: string) => {
    const tail = (grouped.get(columnId) ?? []).at(-1);
    const plan = planMove(
      board.cards,
      card.id,
      tail ? { kind: 'card', id: tail.id } : { kind: 'column', id: columnId }
    );
    onMove(card.id, plan ?? { columnId, position: (tail?.position ?? 0) + 1024 });
  };
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      {phone ? (
        <nav className={styles.tabs} aria-label="Columns">
          {columns.map(column => (
            <button
              type="button"
              key={column.id}
              className={styles.tab}
              data-active={column.id === current?.id || undefined}
              onClick={() => setTab(column.id)}
            >
              <span>{column.title}</span>
              <span className={styles.tabCount}>
                {(() => {
                  const all = grouped.get(column.id) ?? [];
                  const shown = visibleIds ? all.filter(c => visibleIds.has(c.id)) : all;
                  return visibleIds ? `${shown.length}/${all.length}` : all.length;
                })()}
              </span>
            </button>
          ))}
        </nav>
      ) : null}
      <main
        className={styles.board}
        data-phone={phone || undefined}
        onPointerDown={onPointerDown}
        onPointerUp={cancelPress}
        onPointerMove={cancelPress}
        onPointerCancel={cancelPress}
      >
        {shown.map(column => (
          <Column
            key={column.id}
            column={column}
            cards={grouped.get(column.id) ?? []}
            visibleIds={visibleIds}
            done={column === last}
            onCreate={title => onCreate(column.id, title)}
            onRename={onRename}
            onDelete={onDelete}
            onOpen={onOpen}
          />
        ))}
      </main>
      <DragOverlay dropAnimation={null}>
        {activeCard ? <CardRowView card={activeCard} overlay /> : null}
      </DragOverlay>
      {sheetCard ? (
        <MoveSheet
          card={sheetCard}
          columns={columns}
          onMove={columnId => moveToTail(sheetCard, columnId)}
          onClose={() => setSheetId(null)}
        />
      ) : null}
    </DndContext>
  );
}
