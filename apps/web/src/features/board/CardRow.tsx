import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SeedCard } from './seed';
import styles from './CardRow.module.css';

interface ViewProps {
  card: SeedCard;
  done?: boolean;
  /** The copy rendered in the DragOverlay, following the pointer. */
  overlay?: boolean;
}

/** Presentational row: used in the column and, as a copy, inside the DragOverlay. */
export function CardRowView({ card, done = false, overlay = false }: ViewProps) {
  const classes = [styles.row, done && styles.done, overlay && styles.overlay]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={classes}>
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

interface Props {
  card: SeedCard;
  done?: boolean;
}

/** Sortable row in a column. While dragging, the source dims and the overlay carries the card. */
export function CardRow({ card, done = false }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });
  return (
    <div
      ref={setNodeRef}
      className={isDragging ? styles.source : undefined}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
    >
      <CardRowView card={card} done={done} />
    </div>
  );
}
