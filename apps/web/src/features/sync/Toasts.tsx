import { observer } from 'mobx-react-lite';
import { syncStore } from './SyncStore';
import styles from './Toasts.module.css';

/** Toasts from the sync store, per the Components artboard. */
export const Toasts = observer(function Toasts() {
  if (syncStore.toasts.length === 0) return null;
  return (
    <div className={styles.stack} role="status" aria-live="polite" aria-label="Notifications">
      {syncStore.toasts.map(t => (
        <div key={t.id} className={styles.toast} style={{ borderLeftColor: `var(--${t.kind})` }}>
          <span className={styles.dot} style={{ background: `var(--${t.kind})` }} />
          {t.message}
          <button
            type="button"
            className={styles.action}
            onClick={() => syncStore.dismissToast(t.id)}
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
});
