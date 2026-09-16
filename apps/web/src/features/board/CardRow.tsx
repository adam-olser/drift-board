import type { SeedCard } from './seed';
import styles from './CardRow.module.css';

interface Props {
  card: SeedCard;
  done?: boolean;
}

export function CardRow({ card, done = false }: Props) {
  return (
    <div className={done ? `${styles.row} ${styles.done}` : styles.row}>
      <span className={styles.key}>{card.key}</span>
      <span className={styles.title}>{card.title}</span>
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
