import type { SeedBoard, SeedCard } from './seed';
import { Column } from './Column';
import styles from './Board.module.css';

interface Props {
  board: SeedBoard;
}

/** Group the flat card list by column, sorted by position. */
export function cardsByColumn(cards: readonly SeedCard[]): Map<string, SeedCard[]> {
  const groups = new Map<string, SeedCard[]>();
  for (const card of cards) {
    const list = groups.get(card.columnId);
    if (list) list.push(card);
    else groups.set(card.columnId, [card]);
  }
  for (const list of groups.values()) list.sort((a, b) => a.position - b.position);
  return groups;
}

export function Board({ board }: Props) {
  const grouped = cardsByColumn(board.cards);
  const columns = [...board.columns].sort((a, b) => a.position - b.position);
  const last = columns.at(-1);
  return (
    <main className={styles.board}>
      {columns.map(column => (
        <Column
          key={column.id}
          column={column}
          cards={grouped.get(column.id) ?? []}
          done={column === last}
        />
      ))}
    </main>
  );
}
