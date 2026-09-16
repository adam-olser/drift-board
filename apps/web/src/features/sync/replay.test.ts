import { describe, expect, it } from 'vitest';
import { nextToReplay, rebase, type Replayable } from './replay';

const edit = (cardId: string, baseVersion: number): Replayable => ({
  op: 'UpdateCard',
  cardId,
  baseVersion,
});
const move = (cardId: string): Replayable => ({ op: 'MoveCard', cardId, baseVersion: null });

describe('replay', () => {
  it('rebases two edits on the same card', () => {
    const q = [edit('a', 1), edit('a', 1)];
    expect(rebase(q.slice(1), { cardId: 'a', version: 2 })).toEqual([edit('a', 2)]);
  });
  it('rebases across an interleaved move and leaves the move alone', () => {
    const q = [edit('a', 1), move('a'), edit('a', 1)];
    expect(rebase(q.slice(1), { cardId: 'a', version: 2 })).toEqual([move('a'), edit('a', 2)]);
  });
  it('leaves edits on other cards untouched', () => {
    const q = [edit('b', 3)];
    expect(rebase(q, { cardId: 'a', version: 2 })).toEqual([edit('b', 3)]);
  });
  it('a rejected head leaves the tail unchanged', () => {
    const q = [edit('a', 1), edit('a', 1), edit('b', 1)];
    const tail = q.slice(1); // head rejected: no rebase runs
    expect(tail).toEqual([edit('a', 1), edit('b', 1)]);
    expect(nextToReplay(tail)).toEqual(edit('a', 1));
    expect(nextToReplay([])).toBeUndefined();
  });
});
