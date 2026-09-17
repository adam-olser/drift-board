import { initials } from '@/features/sync/initials';
import type { Priority } from '@/gql/graphql';
import { EMPTY_FILTER, isFilterActive, type BoardFilter } from './filter';
import styles from './FilterBar.module.css';

interface Peer {
  sessionId: string;
  name: string;
  color: string;
}

interface BoardLabel {
  id: string;
  name: string;
  color: string;
}

interface Props {
  filter: BoardFilter;
  onChange: (filter: BoardFilter) => void;
  peers: readonly Peer[];
  boardLabels: readonly BoardLabel[];
  matchCount: number;
  totalCount: number;
}

const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH'] as Priority[];

/** Text + priority + assignee + label filter over the board's own cards; no server round trip. */
export function FilterBar({ filter, onChange, peers, boardLabels, matchCount, totalCount }: Props) {
  const active = isFilterActive(filter);
  const set = (patch: Partial<BoardFilter>) => onChange({ ...filter, ...patch });
  return (
    <div className={styles.bar} role="search" aria-label="Filter cards">
      <input
        className={styles.text}
        type="search"
        placeholder="Filter cards…"
        value={filter.text}
        onChange={e => set({ text: e.target.value })}
        aria-label="Filter by text"
      />
      <select
        className={styles.select}
        value={filter.priority ?? ''}
        onChange={e => set({ priority: (e.target.value || null) as Priority | null })}
        aria-label="Filter by priority"
      >
        <option value="">Any priority</option>
        {PRIORITIES.map(p => (
          <option key={p} value={p}>
            {p[0]}
            {p.slice(1).toLowerCase()}
          </option>
        ))}
      </select>
      <select
        className={styles.select}
        value={filter.assignee ?? ''}
        onChange={e => set({ assignee: (e.target.value || null) as BoardFilter['assignee'] })}
        aria-label="Filter by assignee"
      >
        <option value="">Anyone</option>
        <option value="unassigned">Unassigned</option>
        {peers.map(p => (
          <option key={p.sessionId} value={p.sessionId}>
            {initials(p.name)} {p.name}
          </option>
        ))}
      </select>
      {boardLabels.length > 0 ? (
        <select
          className={styles.select}
          value={filter.labelId ?? ''}
          onChange={e => set({ labelId: e.target.value || null })}
          aria-label="Filter by label"
        >
          <option value="">Any label</option>
          {boardLabels.map(l => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      ) : null}
      {active ? (
        <>
          <span className={styles.count}>
            {matchCount} / {totalCount}
          </span>
          <button type="button" className={styles.clear} onClick={() => onChange(EMPTY_FILTER)}>
            Clear
          </button>
        </>
      ) : null}
    </div>
  );
}
