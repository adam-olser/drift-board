import { describe, expect, it } from 'vitest';
import { EMPTY_FILTER, isFilterActive, matchesFilter, type BoardFilter } from './filter';
import type { CardFieldsFragment } from '@/gql/graphql';

const peer = { __typename: 'Peer' as const, sessionId: 's1', name: 'Ada', color: '#fff' };
const card = (overrides: Partial<CardFieldsFragment> = {}): CardFieldsFragment => ({
  __typename: 'Card',
  id: 'c1',
  key: 'DB-1',
  title: 'Fix the header',
  description: 'notes here',
  columnId: 'col-1',
  position: 1024,
  priority: 'NONE' as CardFieldsFragment['priority'],
  dueDate: null,
  assignee: null,
  labels: [],
  version: 1,
  updatedAt: '2026-01-01T00:00:00Z',
  updatedBy: peer,
  ...overrides,
});

describe('matchesFilter', () => {
  it('an empty filter matches everything and is not active', () => {
    expect(isFilterActive(EMPTY_FILTER)).toBe(false);
    expect(matchesFilter(card(), EMPTY_FILTER)).toBe(true);
  });

  it('text matches title or description, case-insensitively', () => {
    const f: BoardFilter = { ...EMPTY_FILTER, text: 'HEADER' };
    expect(isFilterActive(f)).toBe(true);
    expect(matchesFilter(card(), f)).toBe(true);
    expect(matchesFilter(card({ title: 'unrelated' }), f)).toBe(false);
    expect(matchesFilter(card({ title: 'unrelated', description: 'the Header note' }), f)).toBe(
      true
    );
  });

  it('priority filters exactly', () => {
    const f: BoardFilter = { ...EMPTY_FILTER, priority: 'HIGH' as CardFieldsFragment['priority'] };
    expect(matchesFilter(card({ priority: 'HIGH' as CardFieldsFragment['priority'] }), f)).toBe(
      true
    );
    expect(matchesFilter(card({ priority: 'LOW' as CardFieldsFragment['priority'] }), f)).toBe(
      false
    );
  });

  it('assignee filters by session id, and "unassigned" means no assignee', () => {
    const byPeer: BoardFilter = { ...EMPTY_FILTER, assignee: 's1' };
    expect(matchesFilter(card({ assignee: peer }), byPeer)).toBe(true);
    expect(matchesFilter(card({ assignee: { ...peer, sessionId: 's2' } }), byPeer)).toBe(false);
    expect(matchesFilter(card({ assignee: null }), byPeer)).toBe(false);

    const unassigned: BoardFilter = { ...EMPTY_FILTER, assignee: 'unassigned' };
    expect(matchesFilter(card({ assignee: null }), unassigned)).toBe(true);
    expect(matchesFilter(card({ assignee: peer }), unassigned)).toBe(false);
  });

  it('label filters by id; a card needs at least one matching label', () => {
    const f: BoardFilter = { ...EMPTY_FILTER, labelId: 'L1' };
    expect(
      matchesFilter(
        card({ labels: [{ __typename: 'Label', id: 'L1', name: 'Bug', color: '#f00' }] }),
        f
      )
    ).toBe(true);
    expect(
      matchesFilter(
        card({ labels: [{ __typename: 'Label', id: 'L2', name: 'Design', color: '#0f0' }] }),
        f
      )
    ).toBe(false);
    expect(matchesFilter(card({ labels: [] }), f)).toBe(false);
  });

  it('clauses combine with AND', () => {
    const f: BoardFilter = {
      text: 'header',
      priority: 'HIGH' as CardFieldsFragment['priority'],
      assignee: null,
      labelId: null,
    };
    expect(matchesFilter(card({ priority: 'HIGH' as CardFieldsFragment['priority'] }), f)).toBe(
      true
    );
    expect(matchesFilter(card({ priority: 'LOW' as CardFieldsFragment['priority'] }), f)).toBe(
      false
    );
    expect(
      matchesFilter(card({ title: 'other', priority: 'HIGH' as CardFieldsFragment['priority'] }), f)
    ).toBe(false);
  });
});
