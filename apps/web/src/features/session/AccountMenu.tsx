import { useQuery } from '@apollo/client';
import { useEffect, useRef } from 'react';
import { initials } from '@/features/sync/initials';
import { MyBoardsDocument, type SessionFieldsFragment } from '@/gql/graphql';
import { boardPath, navigate } from '@/router';
import styles from './AccountMenu.module.css';

interface Props {
  session: SessionFieldsFragment & { user: NonNullable<SessionFieldsFragment['user']> };
  onClose: () => void;
  onLogOut: () => void;
}

/** SignIn artboard state D: the boards this account created, New board, Sign out. */
export function AccountMenu({ session, onClose, onLogOut }: Props) {
  const { data } = useQuery(MyBoardsDocument);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  return (
    <div ref={ref} className={styles.menu} role="menu" aria-label="My boards">
      <div className={styles.who}>
        <span className={styles.chip} style={{ background: session.color }}>
          {initials(session.user.name)}
        </span>
        <div className={styles.names}>
          <span>{session.user.name}</span>
          <span className={styles.email}>{session.user.email}</span>
        </div>
      </div>
      <div className={styles.items}>
        {(data?.viewer.boards ?? []).map(b => (
          <button
            type="button"
            key={b.id}
            role="menuitem"
            className={styles.item}
            data-active={location.pathname === boardPath(b.slug) || undefined}
            onClick={() => {
              navigate(boardPath(b.slug));
              onClose();
            }}
          >
            {b.name}
          </button>
        ))}
        <button
          type="button"
          role="menuitem"
          className={`${styles.item} ${styles.new}`}
          onClick={() => {
            navigate('/');
            onClose();
          }}
        >
          + New board
        </button>
      </div>
      <button type="button" role="menuitem" className={styles.out} onClick={onLogOut}>
        Sign out
      </button>
    </div>
  );
}
