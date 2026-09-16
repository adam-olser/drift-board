import { describe, expect, it } from 'vitest';
import { planMove, type Placeable } from './moves';

const cards: Placeable[] = [
  { id: 'a1', columnId: 'A', position: 1024 },
  { id: 'a2', columnId: 'A', position: 2048 },
  { id: 'a3', columnId: 'A', position: 3072 },
  { id: 'b1', columnId: 'B', position: 1024 },
];

describe('planMove', () => {
  it('is a no-op onto itself or into its own slot', () => {
    expect(planMove(cards, 'a2', { kind: 'card', id: 'a2' })).toBeNull();
    expect(planMove(cards, 'a3', { kind: 'column', id: 'A' })).toBeNull();
    expect(planMove(cards, 'a2', { kind: 'column', id: 'A' })).not.toBeNull(); // tail is a real move for a2
  });
  it('drops at the head when moving up onto the first card', () => {
    expect(planMove(cards, 'a3', { kind: 'card', id: 'a1' })).toEqual({
      columnId: 'A',
      position: 0,
    });
  });
  it('lands below the target when moving down within a column', () => {
    expect(planMove(cards, 'a1', { kind: 'card', id: 'a3' })).toEqual({
      columnId: 'A',
      position: 3072 + 1024,
    });
    // onto the immediate neighbour below swaps the two
    expect(planMove(cards, 'a1', { kind: 'card', id: 'a2' })).toEqual({
      columnId: 'A',
      position: 2560,
    });
  });
  it('lands between two cards', () => {
    expect(planMove(cards, 'a3', { kind: 'card', id: 'a2' })).toEqual({
      columnId: 'A',
      position: 1536,
    });
  });
  it('appends to the tail when dropped on a column', () => {
    expect(planMove(cards, 'b1', { kind: 'column', id: 'A' })).toEqual({
      columnId: 'A',
      position: 4096,
    });
  });
  it('starts an empty column at one step', () => {
    expect(planMove(cards, 'a1', { kind: 'column', id: 'C' })).toEqual({
      columnId: 'C',
      position: 1024,
    });
  });
  it('drops above the target card when crossing columns', () => {
    expect(planMove(cards, 'b1', { kind: 'card', id: 'a2' })).toEqual({
      columnId: 'A',
      position: 1536,
    });
    expect(planMove(cards, 'b1', { kind: 'card', id: 'a1' })).toEqual({
      columnId: 'A',
      position: 0,
    });
  });
  it('ignores unknown ids', () => {
    expect(planMove(cards, 'zz', { kind: 'column', id: 'A' })).toBeNull();
    expect(planMove(cards, 'a1', { kind: 'card', id: 'zz' })).toBeNull();
  });
});
