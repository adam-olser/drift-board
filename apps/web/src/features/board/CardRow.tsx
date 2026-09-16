import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { observer } from 'mobx-react-lite';
import { useState, type KeyboardEvent } from 'react';
import { syncStore } from '@/features/sync/SyncStore';
import type { CardFieldsFragment } from '@/gql/graphql';
import styles from './CardRow.module.css';

interface ViewProps {
  card: CardFieldsFragment;
  done?: boolean;
  /** The copy rendered in the DragOverlay, following the pointer. */
  overlay?: boolean;
  onRename?: ((title: string) => void) | undefined;
}

// why: a card moved by a peer remounts in its new column; the draft survives the remount.
const drafts = new Map<string, string>();

/** Presentational row: used in the column and, as a copy, inside the DragOverlay. */
export const CardRowView = observer(function CardRowView({
  card,
  done = false,
  overlay = false,
  onRename,
}: ViewProps) {
  const [editing, setEditing] = useState(!overlay && drafts.has(card.id));
  const [draft, setDraftState] = useState(drafts.get(card.id) ?? card.title);
  const setDraft = (value: string) => {
    drafts.set(card.id, value);
    setDraftState(value);
  };
  const stopEditing = () => {
    drafts.delete(card.id);
    setEditing(false);
  };
  const queued = syncStore.isQueued(card.id);
  const classes = [
    styles.row,
    done && styles.done,
    overlay && styles.overlay,
    queued && styles.queued,
  ]
    .filter(Boolean)
    .join(' ');

  const startEditing = () => {
    if (!onRename) return;
    setDraft(card.title);
    setEditing(true);
  };
  const commit = () => {
    stopEditing();
    const title = draft.trim();
    if (title && title !== card.title) onRename?.(title);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // why: the row is a dnd-kit sortable; Enter/Space bubbling up would start a keyboard drag
    // that never ends and blocks every later pointer drag.
    e.stopPropagation();
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') stopEditing();
  };

  return (
    <div className={classes} data-editing={editing || undefined}>
      <span className={styles.key}>{card.key}</span>
      {editing ? (
        <input
          className={styles.titleInput}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          onPointerDown={e => e.stopPropagation()}
          maxLength={200}
          autoFocus
          aria-label={`Title of ${card.key}`}
        />
      ) : (
        <span
          className={styles.title}
          onDoubleClick={startEditing}
          title={onRename ? 'Double-click to rename' : undefined}
        >
          {card.title}
        </span>
      )}
      {queued ? <span className={styles.status}>queued</span> : null}
      <span
        className={styles.chip}
        style={{ background: card.updatedBy.color }}
        title={`Last edited by ${card.updatedBy.name}`}
      >
        {card.updatedBy.name}
      </span>
    </div>
  );
});

interface Props {
  card: CardFieldsFragment;
  done?: boolean;
  onRename: (title: string) => void;
  onDelete: () => void;
}

/**
 * Sortable row in a column. While dragging, the source dims and the overlay carries the card.
 * Delete/Backspace on the focused row deletes it; the detail panel (M7) adds a button.
 */
export function CardRow({ card, done = false, onRename, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });
  return (
    <div
      ref={setNodeRef}
      className={isDragging ? styles.source : undefined}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onKeyDown={e => {
        if (e.key === 'Delete' || e.key === 'Backspace') onDelete();
        else listeners?.['onKeyDown']?.(e);
      }}
    >
      <CardRowView card={card} done={done} onRename={onRename} />
    </div>
  );
}
