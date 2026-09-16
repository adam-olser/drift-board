import { between } from '@shared/ordering';

export interface Placeable {
  id: string;
  columnId: string;
  position: number;
}

/** What the pointer is over when the drag ends. */
export type DropTarget = { kind: 'card'; id: string } | { kind: 'column'; id: string };

export interface MovePlan {
  columnId: string;
  position: number;
}

/**
 * Pure: given every card, the dragged card and the drop target, return where the card goes,
 * or null when the drop is a no-op (onto itself, or into the slot it already occupies).
 * Dropping onto a column appends to its tail. Dropping onto a card takes that card's slot:
 * above it, except when moving down within the same column, where it lands below it.
 */
export function planMove(
  cards: readonly Placeable[],
  activeId: string,
  over: DropTarget
): MovePlan | null {
  const active = cards.find(c => c.id === activeId);
  if (!active) return null;
  if (over.kind === 'card' && over.id === activeId) return null;

  const targetColumnId =
    over.kind === 'column' ? over.id : cards.find(c => c.id === over.id)?.columnId;
  if (!targetColumnId) return null;

  const siblings = cards
    .filter(c => c.columnId === targetColumnId && c.id !== activeId)
    .sort((a, b) => a.position - b.position);

  let index: number;
  if (over.kind === 'column') {
    index = siblings.length;
  } else {
    const overIndex = siblings.findIndex(c => c.id === over.id);
    if (overIndex === -1) return null;
    const movingDown =
      active.columnId === targetColumnId && active.position < siblings[overIndex]!.position;
    index = movingDown ? overIndex + 1 : overIndex;
  }

  const prev = siblings[index - 1];
  const next = siblings[index];
  if (
    active.columnId === targetColumnId &&
    (prev === undefined || prev.position < active.position) &&
    (next === undefined || active.position < next.position)
  ) {
    return null; // already sits between these neighbours
  }

  return {
    columnId: targetColumnId,
    position: between(prev?.position ?? null, next?.position ?? null),
  };
}
