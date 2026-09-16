import { describe, expect, it } from 'vitest';
import { between, needsReindex, POSITION_MIN_GAP, POSITION_STEP, reindex } from './ordering';

describe('between', () => {
  it('starts an empty column at one step', () => {
    expect(between(null, null)).toBe(POSITION_STEP);
  });
  it('drops at the head below the first card', () => {
    expect(between(null, 1024)).toBe(0);
    expect(between(null, 100)).toBeLessThan(100);
  });
  it('drops at the tail above the last card', () => {
    expect(between(3072, null)).toBe(3072 + POSITION_STEP);
  });
  it('drops between two cards at their midpoint', () => {
    expect(between(1024, 2048)).toBe(1536);
    expect(between(1, 2)).toBe(1.5);
  });
  it('refuses inverted neighbours', () => {
    expect(() => between(2, 1)).toThrow(RangeError);
    expect(() => between(1, 1)).toThrow(RangeError);
  });
});

describe('needsReindex', () => {
  it('is false for well-spaced or trivial columns', () => {
    expect(needsReindex([])).toBe(false);
    expect(needsReindex([1024])).toBe(false);
    expect(needsReindex([3072, 1024, 2048])).toBe(false);
  });
  it('is true once repeated insertions between the same two cards exhaust the gap', () => {
    const positions = [0, POSITION_STEP];
    let upper = POSITION_STEP;
    let rounds = 0;
    while (!needsReindex(positions) && rounds < 100) {
      upper = between(0, upper);
      positions.push(upper);
      rounds++;
    }
    expect(needsReindex(positions)).toBe(true);
    expect(rounds).toBeGreaterThan(20);
    expect(rounds).toBeLessThan(40);
  });
  it('detects a single sub-threshold gap', () => {
    expect(needsReindex([0, POSITION_MIN_GAP / 2, 1024])).toBe(true);
  });
});

describe('reindex', () => {
  it('spaces cards one step apart starting at one step', () => {
    expect(reindex(0)).toEqual([]);
    expect(reindex(3)).toEqual([1024, 2048, 3072]);
    expect(needsReindex(reindex(50))).toBe(false);
  });
});
