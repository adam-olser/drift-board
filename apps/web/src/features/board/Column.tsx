import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useState, type FormEvent } from 'react';
import type { CardFieldsFragment, ColumnFieldsFragment } from '@/gql/graphql';
import { CardRow } from './CardRow';
import styles from './Column.module.css';

export const columnDropId = (columnId: string) => `column:${columnId}`;

interface Props {
  column: ColumnFieldsFragment;
  cards: readonly CardFieldsFragment[];
  done?: boolean;
  onCreate: (title: string) => void;
  onRename: (card: CardFieldsFragment, title: string) => void;
  onDelete: (card: CardFieldsFragment) => void;
}

export function Column({ column, cards, done = false, onCreate, onRename, onDelete }: Props) {
  const { setNodeRef } = useDroppable({ id: columnDropId(column.id) });
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (trimmed) onCreate(trimmed);
    setTitle('');
    setAdding(false);
  };

  return (
    <section ref={setNodeRef} className={styles.column} aria-label={column.title}>
      <header className={styles.header}>
        <span>{column.title}</span>
        <span className={styles.count}>{cards.length}</span>
      </header>
      <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
        {cards.map(card => (
          <CardRow
            key={card.id}
            card={card}
            done={done}
            onRename={t => onRename(card, t)}
            onDelete={() => onDelete(card)}
          />
        ))}
      </SortableContext>
      {adding ? (
        <form onSubmit={submit} className={styles.addForm}>
          <input
            className={styles.addInput}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={() => (title.trim() ? undefined : setAdding(false))}
            onKeyDown={e => e.key === 'Escape' && setAdding(false)}
            placeholder="Card title"
            maxLength={200}
            autoFocus
            aria-label={`New card in ${column.title}`}
          />
        </form>
      ) : (
        <button type="button" className={styles.add} onClick={() => setAdding(true)}>
          + new
        </button>
      )}
    </section>
  );
}
