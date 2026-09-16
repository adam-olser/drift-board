/** Cards are ordered by a double `position`; new positions are midpoints between neighbours. */
export const POSITION_STEP = 1024;
/** Below this gap between neighbours, midpoints stop being distinct enough: reindex the column. */
export const POSITION_MIN_GAP = 1e-6;

/**
 * Position for a card dropped between `before` and `after` (null = no neighbour on that side).
 * Pure; identical on client (optimistic proposal) and server (reindex).
 */
export function between(before: number | null, after: number | null): number {
  if (before === null && after === null) return POSITION_STEP;
  if (before === null) return (after as number) - POSITION_STEP;
  if (after === null) return before + POSITION_STEP;
  if (!(before < after)) {
    throw new RangeError(`between(): before (${before}) must be less than after (${after})`);
  }
  return before + (after - before) / 2;
}

/** True when any two neighbouring positions (in ascending order) are closer than POSITION_MIN_GAP. */
export function needsReindex(positions: readonly number[]): boolean {
  const sorted = [...positions].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const next = sorted[i];
    if (prev !== undefined && next !== undefined && next - prev < POSITION_MIN_GAP) return true;
  }
  return false;
}

/** Evenly spaced positions for `count` cards: 1024, 2048, 3072, … */
export function reindex(count: number): number[] {
  return Array.from({ length: count }, (_, i) => (i + 1) * POSITION_STEP);
}
