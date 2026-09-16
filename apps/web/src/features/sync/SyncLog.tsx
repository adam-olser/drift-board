import { useApolloClient } from '@apollo/client';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { CardFieldsFragmentDoc } from '@/gql/graphql';
import { syncStore, type LogEntry } from './SyncStore';
import styles from './SyncLog.module.css';

export const OP_LABEL: Record<string, string> = {
  MoveCard: 'card.moved',
  UpdateCard: 'card.updated',
  CreateCard: 'card.created',
  DeleteCard: 'card.deleted',
};

export const hhmmss = (ts: number) => new Date(ts).toTimeString().slice(0, 8);

export function statusText(e: LogEntry, offline: boolean): string {
  if (e.status === 'pending') return offline ? 'queued (offline)' : 'in flight';
  if (e.status === 'error')
    return `conflict · ${e.error?.toLowerCase().replace('_', ' ') ?? 'error'}`;
  return `applied · ${e.ms} ms`;
}

/** T7.3: collapsible dev panel over store.log; ⌘. toggles. Card mutations only. */
export const SyncLog = observer(function SyncLog() {
  const [open, setOpen] = useState(false);
  const client = useApolloClient();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === '.') {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const entries = syncStore.log.filter(e => e.cardId && OP_LABEL[e.op]);
  const keyOf = (e: LogEntry) =>
    e.key ??
    client.cache.readFragment({
      id: `Card:${e.cardId}`,
      fragment: CardFieldsFragmentDoc,
      fragmentName: 'CardFields',
    })?.key ??
    '···';
  const last = entries.at(-1);
  const offline = syncStore.connection === 'offline';
  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.bar}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className={styles.head}>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ transform: open ? 'rotate(180deg)' : undefined }}
          >
            <path d="M2 4l4 4 4-4" />
          </svg>
          <span>Sync log</span>
          <span className={styles.pill}>{entries.length} events</span>
          {!open && last ? (
            <span className={styles.last}>
              last · {OP_LABEL[last.op]} {keyOf(last)} · {hhmmss(last.ts)}
            </span>
          ) : null}
        </span>
        <span className={styles.head}>
          {syncStore.queue.length > 0 ? (
            <span className={styles.pill} data-tone="queued">
              {syncStore.queue.length} queued
            </span>
          ) : null}
          <span className={styles.pill}>⌘ .</span>
        </span>
      </button>
      {open ? (
        <div className={styles.rows} aria-label="Sync log">
          {entries.length === 0 ? <div className={styles.row}>no card events yet</div> : null}
          {[...entries].reverse().map((e, i) => (
            <div key={e.ts + '-' + i} className={styles.row} data-status={e.status}>
              <span className={styles.ts}>{hhmmss(e.ts)}</span>
              <span className={styles.op}>{OP_LABEL[e.op]}</span>
              <span>{keyOf(e)}</span>
              <span className={styles.ts}>{statusText(e, offline)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
});
