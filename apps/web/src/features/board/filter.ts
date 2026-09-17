import type { CardFieldsFragment, Priority } from '@/gql/graphql';

export interface BoardFilter {
  /** Case-insensitive substring match on title and description. */
  text: string;
  priority: Priority | null;
  /** A session id, or the literal 'unassigned'. */
  assignee: string | 'unassigned' | null;
  labelId: string | null;
}

export const EMPTY_FILTER: BoardFilter = {
  text: '',
  priority: null,
  assignee: null,
  labelId: null,
};

export const isFilterActive = (f: BoardFilter): boolean =>
  f.text.trim() !== '' || f.priority !== null || f.assignee !== null || f.labelId !== null;

/** Pure: a card passes when it matches every active clause of the filter. */
export function matchesFilter(card: CardFieldsFragment, filter: BoardFilter): boolean {
  const text = filter.text.trim().toLowerCase();
  if (
    text &&
    !card.title.toLowerCase().includes(text) &&
    !card.description.toLowerCase().includes(text)
  ) {
    return false;
  }
  if (filter.priority !== null && card.priority !== filter.priority) return false;
  if (filter.assignee === 'unassigned' && card.assignee !== null && card.assignee !== undefined) {
    return false;
  }
  if (
    filter.assignee !== null &&
    filter.assignee !== 'unassigned' &&
    card.assignee?.sessionId !== filter.assignee
  ) {
    return false;
  }
  if (filter.labelId !== null && !card.labels.some(l => l.id === filter.labelId)) return false;
  return true;
}
