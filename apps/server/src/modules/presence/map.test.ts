import { describe, expect, it } from 'vitest';
import { join, leave, list, setViewing } from './map';

const ada = { sessionId: 'a', name: 'Ada', color: '#111' };
const marek = { sessionId: 'm', name: 'Marek', color: '#222' };

describe('presence map', () => {
  it('joins, dedupes by session, leaves, and forgets empty boards', () => {
    expect(join('b1', ada)).toEqual([ada]);
    expect(join('b1', marek).map(p => p.sessionId)).toEqual(['a', 'm']);
    expect(join('b1', { ...ada, name: 'Ada2' })).toHaveLength(2);
    expect(leave('b1', 'a')).toEqual([marek]);
    expect(leave('b1', 'm')).toEqual([]);
    expect(list('b1')).toEqual([]);
    expect(leave('nope', 'a')).toBeNull();
  });
  it('setViewing marks a card for a joined session only', () => {
    join('b2', ada);
    expect(setViewing('b2', 'a', 'card-1')?.[0]?.viewingCardId).toBe('card-1');
    expect(setViewing('b2', 'a', null)?.[0]?.viewingCardId).toBeNull();
    expect(setViewing('b2', 'zz', 'card-1')).toBeNull();
    leave('b2', 'a');
    expect(leave('b1', 'a')).toBeNull();
  });
});
