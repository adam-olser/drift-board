/** The part of a parked operation that replay needs to reason about. Pure, so it is testable. */
export interface Replayable {
  op: string;
  cardId: string | null;
  baseVersion: number | null;
}

/**
 * After an updateCard result, every later updateCard on the same card gets its baseVersion
 * replaced by the returned version, so a user never conflicts with their own earlier edit.
 */
export function rebase<T extends Replayable>(
  queue: readonly T[],
  applied: { cardId: string; version: number }
): T[] {
  return queue.map(entry =>
    entry.op === 'UpdateCard' && entry.cardId === applied.cardId
      ? { ...entry, baseVersion: applied.version }
      : entry
  );
}

export const nextToReplay = <T>(queue: readonly T[]): T | undefined => queue[0];
