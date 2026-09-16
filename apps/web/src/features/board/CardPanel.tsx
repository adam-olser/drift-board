import { observer } from 'mobx-react-lite';
import { useEffect, useState, type KeyboardEvent } from 'react';
import type { CardFieldsFragment, ColumnFieldsFragment } from '@/gql/graphql';
import { initials } from '@/features/sync/initials';
import { hhmmss, OP_LABEL, statusText } from '@/features/sync/SyncLog';
import { syncStore } from '@/features/sync/SyncStore';
import styles from './CardPanel.module.css';

interface Props {
  card: CardFieldsFragment;
  columns: readonly ColumnFieldsFragment[];
  onClose: () => void;
  onSave: (fields: { title: string; description: string }) => void;
  onMove: (columnId: string) => void;
  onDelete: () => void;
}

/** T7.4: slide-in detail per CardDetail artboard. ⌘↵ saves with the cached baseVersion. */
export const CardPanel = observer(function CardPanel({
  card,
  columns,
  onClose,
  onSave,
  onMove,
  onDelete,
}: Props) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  useEffect(() => {
    setTitle(card.title);
    setDescription(card.description);
  }, [card.id, card.version, card.title, card.description]);

  const save = () => {
    const t = title.trim();
    if (!t) return;
    if (t !== card.title || description !== card.description) onSave({ title: t, description });
    onClose();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      e.preventDefault();
      save();
    }
    if (e.key === 'Escape') onClose();
  };
  const history = syncStore.logFor(card.id);
  const offline = syncStore.connection === 'offline';

  return (
    <aside className={styles.panel} aria-label={`Card ${card.key}`} onKeyDown={onKeyDown}>
      <div className={styles.top}>
        <span className={styles.key}>{card.key}</span>
        <div className={styles.topRight}>
          <span className={styles.pill}>⌘ ↵ save</span>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
      </div>
      <div className={styles.body}>
        <label className={styles.field}>
          <span className={styles.k}>Title</span>
          <input
            className={styles.title}
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={200}
            autoFocus
          />
        </label>
        <div className={styles.rowFields}>
          <div className={styles.field}>
            <span className={styles.k}>Column</span>
            <div className={styles.seg} role="group" aria-label="Column">
              {columns.map(c => (
                <button
                  type="button"
                  key={c.id}
                  className={styles.segItem}
                  data-active={c.id === card.columnId || undefined}
                  onClick={() => c.id !== card.columnId && onMove(c.id)}
                >
                  {c.title}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.field}>
            <span className={styles.k}>Last change</span>
            <span className={styles.last}>
              <span className={styles.chip} style={{ background: card.updatedBy.color }}>
                {initials(card.updatedBy.name)}
              </span>
              {card.updatedBy.name} · {hhmmss(Date.parse(card.updatedAt))}
            </span>
          </div>
        </div>
        <label className={`${styles.field} ${styles.grow}`}>
          <span className={styles.k}>Description</span>
          <textarea
            className={styles.description}
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={4000}
          />
          <span className={styles.note}>
            Version-checked save · earlier writer wins · no live co-editing of text (named scope
            cut)
          </span>
        </label>
        <div className={styles.field}>
          <span className={styles.k}>History · from the sync log</span>
          {history.length === 0 ? (
            <span className={styles.hist}>nothing yet this session</span>
          ) : null}
          {history.map((e, i) => (
            <span key={e.ts + '-' + i} className={styles.hist} data-status={e.status}>
              <span className={styles.ts}>{hhmmss(e.ts)}</span>
              <span className={styles.op}>{OP_LABEL[e.op] ?? e.op}</span>
              <span className={styles.ts}>{statusText(e, offline)}</span>
            </span>
          ))}
        </div>
      </div>
      <div className={styles.footer}>
        <button type="button" className={styles.danger} onClick={onDelete}>
          Delete card
        </button>
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={styles.primary} onClick={save}>
            Save
          </button>
        </div>
      </div>
    </aside>
  );
});
