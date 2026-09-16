import { observer } from 'mobx-react-lite';
import { useEffect, useState, type KeyboardEvent } from 'react';
import type { CardFieldsFragment, ColumnFieldsFragment, Priority } from '@/gql/graphql';
import { initials } from '@/features/sync/initials';
import { hhmmss, OP_LABEL, statusText } from '@/features/sync/SyncLog';
import { syncStore } from '@/features/sync/SyncStore';
import { navigate } from '@/router';
import type { CardEdit } from './useBoard';
import styles from './CardPanel.module.css';

interface BoardLabel {
  id: string;
  name: string;
  color: string;
}

interface Peer {
  sessionId: string;
  name: string;
  color: string;
}

interface Props {
  card: CardFieldsFragment;
  columns: readonly ColumnFieldsFragment[];
  /** Every distinct updatedBy across the board's cards, for the assignee picker. */
  peers: readonly Peer[];
  /** The board's label palette, for the "add existing" list. */
  boardLabels: readonly BoardLabel[];
  /** Full-page variant at /b/:slug/c/:key; the panel variant links to it. */
  full?: boolean;
  fullHref: string;
  boardHref: string;
  onClose: () => void;
  onSave: (fields: CardEdit) => void;
  onMove: (columnId: string) => void;
  onDelete: () => void;
  onAddLabel: (name: string, color: string) => void;
  onRemoveLabel: (labelId: string) => void;
}

const PRIORITIES: Priority[] = ['NONE', 'LOW', 'MEDIUM', 'HIGH'] as Priority[];
const PRIORITY_LABEL: Record<string, string> = {
  NONE: 'None',
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};
/** Fixed swatches so a picked label colour still reads against both themes. */
const LABEL_COLORS = ['#8fb8ff', '#b7f26a', '#ffb86b', '#ff7b72', '#c9a4ff', '#7fe3d2'];

export function isOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false;
  return dueDate < new Date().toISOString().slice(0, 10);
}

/** T7.4 + card detail fields: slide-in per CardDetail artboard. ⌘↵ saves with the cached baseVersion. */
export const CardPanel = observer(function CardPanel({
  card,
  columns,
  peers,
  boardLabels,
  full = false,
  fullHref,
  boardHref,
  onClose,
  onSave,
  onMove,
  onDelete,
  onAddLabel,
  onRemoveLabel,
}: Props) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [labelPicker, setLabelPicker] = useState(false);
  const [labelName, setLabelName] = useState('');
  const [labelColor, setLabelColor] = useState(LABEL_COLORS[0] ?? '#8fb8ff');
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
  const viewers = syncStore.viewersOf(card.id);
  const existingLabelIds = new Set(card.labels.map(l => l.id));
  const availableLabels = boardLabels.filter(l => !existingLabelIds.has(l.id));
  const overdue = isOverdue(card.dueDate);

  return (
    <aside
      className={styles.panel}
      data-full={full || undefined}
      aria-label={`Card ${card.key}`}
      onKeyDown={onKeyDown}
    >
      <div className={styles.top}>
        <div className={styles.topRight}>
          <span className={styles.key}>{card.key}</span>
          {viewers.map(v => (
            <span
              key={v.sessionId}
              className={styles.pill}
              data-tone="ok"
              aria-label="Also viewing"
            >
              <span className={styles.dot} />
              {initials(v.name)} is editing
            </span>
          ))}
        </div>
        <div className={styles.topRight}>
          <span className={styles.pill}>⌘ ↵ save</span>
          {full ? (
            <a
              className={styles.pill}
              href={boardHref}
              onClick={e => {
                e.preventDefault();
                navigate(boardHref);
              }}
            >
              ← Board
            </a>
          ) : (
            <a
              className={styles.pill}
              href={fullHref}
              onClick={e => {
                e.preventDefault();
                navigate(fullHref);
              }}
              title="Open as a page"
            >
              Full view ↗
            </a>
          )}
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

        <div className={styles.rowFields}>
          <div className={styles.field}>
            <span className={styles.k}>Priority</span>
            <div className={styles.seg} role="group" aria-label="Priority">
              {PRIORITIES.map(p => (
                <button
                  type="button"
                  key={p}
                  className={styles.segItem}
                  data-active={p === card.priority || undefined}
                  data-priority={p.toLowerCase()}
                  onClick={() => p !== card.priority && onSave({ priority: p })}
                >
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
          </div>
          <label className={styles.field}>
            <span className={styles.k}>Due date</span>
            <input
              type="date"
              className={`${styles.dateInput} ${overdue ? styles.overdue : ''}`}
              value={card.dueDate ?? ''}
              onChange={e => onSave({ dueDate: e.target.value || null })}
            />
          </label>
        </div>

        <div className={styles.field}>
          <span className={styles.k}>Assignee</span>
          <div className={styles.assignees} role="group" aria-label="Assignee">
            <button
              type="button"
              className={styles.assigneeBtn}
              data-active={!card.assignee || undefined}
              onClick={() => onSave({ assigneeSessionId: null })}
            >
              Unassigned
            </button>
            {peers.map(p => (
              <button
                type="button"
                key={p.sessionId}
                className={styles.assigneeBtn}
                data-active={card.assignee?.sessionId === p.sessionId || undefined}
                onClick={() => onSave({ assigneeSessionId: p.sessionId })}
              >
                <span className={styles.chip} style={{ background: p.color }}>
                  {initials(p.name)}
                </span>
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.k}>Labels</span>
          <div className={styles.labels}>
            {card.labels.map(l => (
              <span key={l.id} className={styles.labelChip} style={{ background: l.color }}>
                {l.name}
                <button
                  type="button"
                  className={styles.labelRemove}
                  aria-label={`Remove label ${l.name}`}
                  onClick={() => onRemoveLabel(l.id)}
                >
                  ×
                </button>
              </span>
            ))}
            {labelPicker ? (
              <div className={styles.labelPicker}>
                {availableLabels.map(l => (
                  <button
                    type="button"
                    key={l.id}
                    className={styles.labelChip}
                    style={{ background: l.color }}
                    onClick={() => {
                      onAddLabel(l.name, l.color);
                      setLabelPicker(false);
                    }}
                  >
                    {l.name}
                  </button>
                ))}
                <form
                  className={styles.newLabel}
                  onSubmit={e => {
                    e.preventDefault();
                    const trimmed = labelName.trim();
                    if (!trimmed) return;
                    onAddLabel(trimmed, labelColor);
                    setLabelName('');
                    setLabelPicker(false);
                  }}
                >
                  <input
                    className={styles.labelInput}
                    value={labelName}
                    onChange={e => setLabelName(e.target.value)}
                    placeholder="New label"
                    maxLength={30}
                    autoFocus
                  />
                  <div className={styles.swatches} role="group" aria-label="Label colour">
                    {LABEL_COLORS.map(c => (
                      <button
                        type="button"
                        key={c}
                        className={styles.swatch}
                        style={{ background: c }}
                        data-active={c === labelColor || undefined}
                        aria-label={`Colour ${c}`}
                        onClick={() => setLabelColor(c)}
                      />
                    ))}
                  </div>
                  <button type="submit" className={styles.pill}>
                    Add
                  </button>
                  <button
                    type="button"
                    className={styles.pill}
                    onClick={() => setLabelPicker(false)}
                  >
                    Done
                  </button>
                </form>
              </div>
            ) : (
              <button
                type="button"
                className={styles.addLabel}
                onClick={() => setLabelPicker(true)}
              >
                + label
              </button>
            )}
          </div>
        </div>

        <label className={`${styles.field} ${styles.grow}`}>
          <span className={styles.k}>Description</span>
          <textarea
            className={styles.description}
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={5000}
            placeholder="Notes, links, acceptance criteria… up to 5,000 characters. Line breaks are kept."
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
