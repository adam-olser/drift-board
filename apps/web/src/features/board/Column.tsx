import type { SeedCard, SeedColumn } from './seed';
import { CardRow } from './CardRow';
import styles from './Column.module.css';

interface Props {
  column: SeedColumn;
  cards: readonly SeedCard[];
  done?: boolean;
}

export function Column({ column, cards, done = false }: Props) {
  return (
    <section className={styles.column} aria-label={column.title}>
      <header className={styles.header}>
        <span>{column.title}</span>
        <span className={styles.count}>{cards.length}</span>
      </header>
      {cards.map(card => (
        <CardRow key={card.id} card={card} done={done} />
      ))}
      {done ? null : (
        <button type="button" className={styles.add}>
          + new · N
        </button>
      )}
    </section>
  );
}
