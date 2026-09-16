import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { Brand } from './Brand';
import { initials } from './initials';
import { syncStore } from './SyncStore';
import { setTheme, useTheme } from '@/theme';
import styles from './Header.module.css';

interface Props {
  slug: string;
  boardName: string;
  me: string | null;
}

const pad = (n: number) => String(n).padStart(2, '0');
const mmss = (ms: number) =>
  `${pad(Math.floor(ms / 60000))}:${pad(Math.floor((ms % 60000) / 1000))}`;

function useClock(active: boolean) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => tick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
}

/** T7.1: HeaderStates 1 (online), 3 (offline + banner), 4 (syncing + banner); driven by SyncStore. */
export const Header = observer(function Header({ slug, boardName, me }: Props) {
  const { connection, peers, queue, replayProgress, latencyMs, offlineSince } = syncStore;
  const theme = useTheme();
  useClock(connection === 'offline');
  const tone = connection === 'online' ? 'ok' : connection === 'offline' ? 'queued' : 'info';
  const pillText =
    connection === 'online'
      ? `WS${latencyMs != null ? ` · ${latencyMs} ms` : ''}`
      : connection === 'offline'
        ? `Offline${offlineSince ? ` · ${mmss(Date.now() - offlineSince)}` : ''}`
        : `Syncing ${Math.min((replayProgress?.done ?? 0) + 1, replayProgress?.total ?? 1)} / ${replayProgress?.total ?? queue.length}`;
  return (
    <>
      <header className={styles.header} data-state={connection}>
        <div className={styles.left}>
          <span className={styles.brand}>
            <Brand color={`var(--${tone})`} />
            Driftboard
          </span>
          <span className={styles.slug}>/b/{slug}</span>
          <span className={styles.board}>{boardName}</span>
        </div>
        <div className={styles.right}>
          <div className={styles.peers} aria-label="Connected peers">
            {peers.map(p => (
              <span
                key={p.sessionId}
                className={styles.chip}
                style={{ background: p.color }}
                title={p.name}
              >
                {initials(p.name)}
              </span>
            ))}
            <span className={styles.count}>
              {peers.length > 1 ? `${peers.length} online` : 'only you'}
            </span>
          </div>
          <span className={styles.pill} data-tone={tone} aria-label="Connection">
            <span className={styles.dot} />
            {pillText}
          </span>
          {connection === 'offline' && queue.length > 0 ? (
            <span className={styles.pill} data-tone="queued">
              {queue.length} queued
            </span>
          ) : null}
          {me ? <span className={styles.me}>guest:{me}</span> : null}
          <button
            type="button"
            className={styles.switch}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            <span className={styles.sun}>
              <svg
                width="13"
                height="13"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="8" cy="8" r="3" />
                <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" />
              </svg>
            </span>
            <span className={styles.moon}>
              <svg
                width="13"
                height="13"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M13.5 9.5A6 6 0 0 1 6.5 2.5a6 6 0 1 0 7 7z" />
              </svg>
            </span>
          </button>
        </div>
      </header>
      {connection === 'offline' ? (
        <div className={styles.banner} data-tone="queued" role="status">
          <span>
            You're offline. Edits are kept on this device and will sync in order when the connection
            returns.
          </span>
        </div>
      ) : null}
      {connection === 'syncing' ? (
        <div className={styles.banner} data-tone="info" role="status">
          <span>
            Back online — sending {replayProgress?.total ?? queue.length} queued{' '}
            {(replayProgress?.total ?? queue.length) === 1 ? 'change' : 'changes'}, then refreshing
            the board.
          </span>
          <span className={styles.bannerNote}>
            op {Math.min((replayProgress?.done ?? 0) + 1, replayProgress?.total ?? 1)} of{' '}
            {replayProgress?.total ?? queue.length}
          </span>
        </div>
      ) : null}
    </>
  );
});
