import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { observer } from 'mobx-react-lite';
import { useState, type KeyboardEvent } from 'react';
import { initials } from '@/features/sync/initials';
import { syncStore } from '@/features/sync/SyncStore';
import type { CardFieldsFragment } from '@/gql/graphql';
import { isOverdue } from './CardPanel';
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
  const viewer = overlay ? undefined : syncStore.viewersOf(card.id)[0];
  const classes = [
    styles.row,
    done && styles.done,
    overlay && styles.overlay,
    queued && styles.queued,
    viewer && styles.viewed,
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
      {viewer ? (
        <span className={styles.editing} title={`${viewer.name} has this card open`}>
          {initials(viewer.name)} editing
        </span>
      ) : null}
      <span className={styles.meta}>
        {card.labels.map(l => (
          <span
            key={l.id}
            className={styles.labelDot}
            style={{ background: l.color }}
            title={l.name}
          />
        ))}
        {card.priority !== 'NONE' ? (
          <span
            className={styles.priorityDot}
            data-priority={card.priority.toLowerCase()}
            title={`Priority: ${card.priority.toLowerCase()}`}
          />
        ) : null}
        {card.dueDate ? (
          <span
            className={styles.due}
            data-overdue={isOverdue(card.dueDate) || undefined}
            title={`Due ${card.dueDate}`}
          >
            {card.dueDate.slice(5)}
          </span>
        ) : null}
        {card.assignee && card.assignee.sessionId !== card.updatedBy.sessionId ? (
          <span
            className={styles.chip}
            style={{ background: card.assignee.color }}
            title={`Assigned to ${card.assignee.name}`}
          >
            {initials(card.assignee.name)}
          </span>
        ) : null}
      </span>
      <span
        className={styles.chip}
        style={{ background: card.updatedBy.color }}
        title={`Last edited by ${card.updatedBy.name}`}
      >
        {initials(card.updatedBy.name)}
      </span>
    </div>
  );
});

interface Props {
  card: CardFieldsFragment;
  done?: boolean;
  onRename: (title: string) => void;
  onDelete: () => void;
  /** Click anywhere but the title (which double-clicks to rename) opens the detail panel. */
  onOpen: () => void;
}

/**
 * Sortable row in a column. While dragging, the source dims and the overlay carries the card.
 * Delete/Backspace on the focused row deletes it; the detail panel (M7) adds a button.
 */
export function CardRow({ card, done = false, onRename, onDelete, onOpen }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });
  return (
    <div
      ref={setNodeRef}
      data-card-id={card.id}
      className={isDragging ? styles.source : undefined}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onKeyDown={e => {
        if (e.key === 'Delete' || e.key === 'Backspace') onDelete();
        else listeners?.['onKeyDown']?.(e);
      }}
      onClick={e => {
        const target = e.target as HTMLElement;
        if (!target.closest('input') && !target.closest('span[class*="_title_"]')) onOpen();
      }}
    >
      <CardRowView card={card} done={done} onRename={onRename} />
    </div>
  );
}
