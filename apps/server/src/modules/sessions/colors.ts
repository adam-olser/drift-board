/** Presence palette. The first three match the design's MK / JO / A chips. Text on all is #101114. */
export const PALETTE = [
  '#b7f26a', // lime
  '#ffb86b', // amber
  '#8fb8ff', // blue
  '#f6a5d6', // pink
  '#7fe3d2', // teal
  '#e0c86a', // gold
  '#c9a6ff', // lavender
  '#ff9f8a', // coral
] as const;

export function colorFor(index: number): string {
  return PALETTE[Math.abs(index) % PALETTE.length] ?? PALETTE[0];
}
