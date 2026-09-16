import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState, type KeyboardEvent } from 'react';
import type { CardFieldsFragment } from '@/gql/graphql';
import styles from './CardRow.module.css';

interface ViewProps {
  card: CardFieldsFragment;
  done?: boolean;
  /** The copy rendered in the DragOverlay, following the pointer. */
  overlay?: boolean;
  onRename?: ((title: string) => void) | undefined;
}

/** Presentational row: used in the column and, as a copy, inside the DragOverlay. */
export function CardRowView({ card, done = false, overlay = false, onRename }: ViewProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(card.title);
  const classes = [styles.row, done && styles.done, overlay && styles.overlay]
    .filter(Boolean)
    .join(' ');

  const startEditing = () => {
    if (!onRename) return;
    setDraft(card.title);
    setEditing(true);
  };
  const commit = () => {
    setEditing(false);
    const title = draft.trim();
    if (title && title !== card.title) onRename?.(title);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // why: the row is a dnd-kit sortable; Enter/Space bubbling up would start a keyboard drag
    // that never ends and blocks every later pointer drag.
    e.stopPropagation();
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') setEditing(false);
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
      <span
        className={styles.chip}
        style={{ background: card.updatedBy.color }}
        title={`Last edited by ${card.updatedBy.name}`}
      >
        {card.updatedBy.name}
      </span>
    </div>
  );
}

interface Props {
  card: CardFieldsFragment;
  done?: boolean;
  onRename: (title: string) => void;
}

/** Sortable row in a column. While dragging, the source dims and the overlay carries the card. */
export function CardRow({ card, done = false, onRename }: Props) {
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
    >
      <CardRowView card={card} done={done} onRename={onRename} />
    </div>
  );
}
