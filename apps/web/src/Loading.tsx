import { useEffect, useState } from 'react';
import { Brand } from './features/sync/Brand';
import styles from './Loading.module.css';

const SLOW_MS = 4000;

/**
 * Skeleton board while the viewer and board queries run. On the free Render plan the server and
 * the Neon database both sleep when idle, so after SLOW_MS it says so instead of looking hung.
 */
export function Loading() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setSlow(true), SLOW_MS);
    return () => clearTimeout(id);
  }, []);
  return (
    <div className={styles.wrap} role="status" aria-label="Loading the board">
      <header className={styles.header}>
        <span className={styles.brand}>
          <Brand />
          Driftboard
        </span>
      </header>
      {slow ? (
        <p className={styles.hint}>
          Still waking up. The free host sleeps when idle, so the first load can take up to a
          minute.
        </p>
      ) : null}
      <div className={styles.board}>
        {[3, 2, 1].map((rows, col) => (
          <div key={col} className={styles.column}>
            <div className={styles.title} />
            {Array.from({ length: rows }, (_, i) => (
              <div key={i} className={styles.card} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
