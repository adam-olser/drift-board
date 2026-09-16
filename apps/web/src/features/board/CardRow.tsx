import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SeedCard } from './seed';
import styles from './CardRow.module.css';

interface Props {
  card: SeedCard;
  done?: boolean;
}

export function CardRow({ card, done = false }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });
  const classes = [styles.row, done && styles.done, isDragging && styles.dragging]
    .filter(Boolean)
    .join(' ');
  return (
    <div
      ref={setNodeRef}
      className={classes}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
    >
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
