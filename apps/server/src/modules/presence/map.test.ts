import { describe, expect, it } from 'vitest';
import { join, leave, list } from './map';

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
    expect(leave('b1', 'a')).toBeNull();
  });
});
