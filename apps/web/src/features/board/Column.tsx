import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { SeedCard, SeedColumn } from './seed';
import { CardRow } from './CardRow';
import styles from './Column.module.css';

export const columnDropId = (columnId: string) => `column:${columnId}`;

interface Props {
  column: SeedColumn;
  cards: readonly SeedCard[];
  done?: boolean;
}

export function Column({ column, cards, done = false }: Props) {
  const { setNodeRef } = useDroppable({ id: columnDropId(column.id) });
  return (
    <section ref={setNodeRef} className={styles.column} aria-label={column.title}>
      <header className={styles.header}>
        <span>{column.title}</span>
        <span className={styles.count}>{cards.length}</span>
      </header>
      <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
        {cards.map(card => (
          <CardRow key={card.id} card={card} done={done} />
        ))}
      </SortableContext>
      {done ? null : (
        <button type="button" className={styles.add}>
          + new · N
        </button>
      )}
    </section>
  );
}
