import { useEffect, useRef } from 'react';
import type { CardFieldsFragment, ColumnFieldsFragment } from '@/gql/graphql';
import styles from './MoveSheet.module.css';

interface Props {
  card: CardFieldsFragment;
  columns: readonly ColumnFieldsFragment[];
  onMove: (columnId: string) => void;
  onClose: () => void;
}

/** Mobile artboard: long-press a card → pick the column it moves to (tail). */
export function MoveSheet({ card, columns, onMove, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  return (
    <dialog ref={ref} className={styles.sheet} onClose={onClose} aria-label={`Move ${card.key}`}>
      <div className={styles.head}>
        <span className={styles.key}>{card.key}</span>
        <span className={styles.title}>{card.title}</span>
      </div>
      <div className={styles.k}>Move to</div>
      {columns.map(c => (
        <button
          type="button"
          key={c.id}
          className={styles.item}
          disabled={c.id === card.columnId}
          onClick={() => {
            onMove(c.id);
            onClose();
          }}
        >
          {c.title}
          {c.id === card.columnId ? <span className={styles.here}>here</span> : null}
        </button>
      ))}
      <button type="button" className={styles.cancel} onClick={onClose}>
        Cancel
      </button>
    </dialog>
  );
}
