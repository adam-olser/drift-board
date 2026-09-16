/**
 * Integration test for the conflict policy against a real Postgres (TEST_DATABASE_URL, the
 * docker-compose `driftboard_test` db). Skips with one warning when the database is unreachable.
 */
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { between } from '@shared/ordering';
import { transaction } from '../../tx';
import * as policy from './policy';
import { findCard, listLiveCardsInColumn } from './sql';

const url =
  process.env['TEST_DATABASE_URL'] ??
  'postgres://driftboard:driftboard@localhost:5432/driftboard_test';
const pool = new pg.Pool({ connectionString: url, connectionTimeoutMillis: 1500 });

const available = await pool
  .query('select 1')
  .then(() => true)
  .catch(() => {
    process.stderr.write(`policy.test.ts: skipped, no Postgres at ${url}\n`);
    return false;
  });

const ADA = '00000000-0000-4000-8000-00000000000a';
const MK = '00000000-0000-4000-8000-00000000000b';
const BOARD = '00000000-0000-4000-8000-000000000001';
const TODO = '00000000-0000-4000-8000-000000000011';
const DOING = '00000000-0000-4000-8000-000000000012';
const DONE = '00000000-0000-4000-8000-000000000013';

const tx = <T>(fn: (t: pg.PoolClient) => Promise<T>) => transaction(pool, fn);
const cardIdByKey = async (key: string) =>
  (await pool.query<{ id: string }>('select id from cards where key = $1', [key])).rows[0]!.id;
const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return 'OK';
  } catch (e) {
    return (e as { extensions?: { code?: string } }).extensions?.code ?? 'UNKNOWN';
  }
};
const create = (t: pg.PoolClient, columnId: string, title: string, position: number) =>
  policy.createCard(t, ADA, { id: randomUUID(), boardId: BOARD, columnId, title, position });

describe.skipIf(!available)('card policy (Postgres)', () => {
  beforeAll(async () => {
    const dir = new URL('../../../db/', import.meta.url);
    await pool.query(readFileSync(new URL('schema.sql', dir), 'utf8'));
    await pool.query(readFileSync(new URL('seed.sql', dir), 'utf8'));
  });
  afterAll(() => pool.end());

  it('createCard: same opId twice returns the stored result and writes one ops row', async () => {
    const op = { opId: randomUUID(), sessionId: ADA, type: 'createCard' as const };
    const input = {
      id: randomUUID(),
      boardId: BOARD,
      columnId: TODO,
      title: 'Once',
      position: 5000,
    };
    const first = await tx(t => policy.idempotent(t, op, () => policy.createCard(t, ADA, input)));
    const second = await tx(t => policy.idempotent(t, op, () => policy.createCard(t, ADA, input)));
    expect(second.result).toEqual(first.result);
    expect(second.changed).toBe(false);
    expect(first.result.key).toBe('DB-15');
    const ops = await pool.query('select count(*)::int as n from ops where op_id = $1', [op.opId]);
    expect(ops.rows[0]!.n).toBe(1);
    const cards = await pool.query('select count(*)::int as n from cards where title = $1', [
      'Once',
    ]);
    expect(cards.rows[0]!.n).toBe(1);
  });

  it('createCard: an existing id is BAD_INPUT, an unknown column NOT_FOUND', async () => {
    const existing = await cardIdByKey('DB-14');
    expect(
      await code(
        tx(t =>
          policy.createCard(t, ADA, {
            id: existing,
            boardId: BOARD,
            columnId: TODO,
            title: 'x',
            position: 1,
          })
        )
      )
    ).toBe('BAD_INPUT');
    expect(
      await code(
        tx(t =>
          policy.createCard(t, ADA, {
            id: randomUUID(),
            boardId: BOARD,
            columnId: randomUUID(),
            title: 'x',
            position: 1,
          })
        )
      )
    ).toBe('NOT_FOUND');
  });

  it('updateCard: matching baseVersion applies and bumps version; stale one is VERSION_MISMATCH with current', async () => {
    const id = await cardIdByKey('DB-13');
    const updated = await tx(t =>
      policy.updateCard(t, MK, {
        cardId: id,
        baseVersion: 1,
        title: 'Build responsive nav (v2)',
        description: null,
        priority: undefined,
        dueDate: undefined,
        assigneeSessionId: undefined,
      })
    );
    expect(updated.result.version).toBe(2);
    expect(updated.result.updatedBy.name).toBe('MK');
    let caught: unknown;
    await tx(t =>
      policy.updateCard(t, ADA, {
        cardId: id,
        baseVersion: 1,
        title: 'Stale',
        description: null,
        priority: undefined,
        dueDate: undefined,
        assigneeSessionId: undefined,
      })
    ).catch(e => (caught = e));
    const err = caught as {
      extensions: { code: string; current: { version: number; title: string } };
    };
    expect(err.extensions.code).toBe('VERSION_MISMATCH');
    expect(err.extensions.current.version).toBe(2);
    expect(err.extensions.current.title).toBe('Build responsive nav (v2)');
    expect((await findCard(pool, id))!.title).toBe('Build responsive nav (v2)');
  });

  it('moveCard never changes version, so a drag cannot fake a text conflict', async () => {
    const id = await cardIdByKey('DB-12');
    const before = (await findCard(pool, id))!.version;
    const moved = await tx(t =>
      policy.moveCard(t, MK, { cardId: id, columnId: DONE, position: 99999 })
    );
    expect(moved.result).toHaveLength(1);
    expect(moved.result[0]!.columnId).toBe(DONE);
    expect(moved.result[0]!.version).toBe(before);
    // the other author's edit with the old base still succeeds
    const edited = await tx(t =>
      policy.updateCard(t, ADA, {
        cardId: id,
        baseVersion: before,
        title: 'Photograph the workshop!',
        description: null,
        priority: undefined,
        dueDate: undefined,
        assigneeSessionId: undefined,
      })
    );
    expect(edited.result.version).toBe(before + 1);
  });

  it('updateCard: priority, due date and assignee set, clear, and reject an unknown assignee', async () => {
    const id = await cardIdByKey('DB-11');
    const set = await tx(t =>
      policy.updateCard(t, ADA, {
        cardId: id,
        baseVersion: 1,
        title: null,
        description: null,
        priority: 'high',
        dueDate: '2026-12-01',
        assigneeSessionId: MK,
      })
    );
    expect(set.result.priority).toBe('HIGH');
    expect(set.result.dueDate).toBe('2026-12-01');
    expect(set.result.assignee?.sessionId).toBe(MK);

    const untouched = await tx(t =>
      policy.updateCard(t, ADA, {
        cardId: id,
        baseVersion: 2,
        title: null,
        description: 'still here',
        priority: undefined,
        dueDate: undefined,
        assigneeSessionId: undefined,
      })
    );
    expect(untouched.result.priority).toBe('HIGH');
    expect(untouched.result.dueDate).toBe('2026-12-01');
    expect(untouched.result.assignee?.sessionId).toBe(MK);

    const cleared = await tx(t =>
      policy.updateCard(t, ADA, {
        cardId: id,
        baseVersion: 3,
        title: null,
        description: null,
        priority: undefined,
        dueDate: null,
        assigneeSessionId: null,
      })
    );
    expect(cleared.result.dueDate).toBeNull();
    expect(cleared.result.assignee).toBeNull();

    expect(
      await code(
        tx(t =>
          policy.updateCard(t, ADA, {
            cardId: id,
            baseVersion: 4,
            title: null,
            description: null,
            priority: undefined,
            dueDate: undefined,
            assigneeSessionId: randomUUID(),
          })
        )
      )
    ).toBe('NOT_FOUND');
  });

  it('addLabel creates or reuses a board label case-insensitively; removeLabel is idempotent', async () => {
    const id = await cardIdByKey('DB-09');
    const first = await tx(t =>
      policy.addLabel(t, ADA, { cardId: id, name: 'Bug', color: '#ff7b72' })
    );
    expect(first.result.labels.map(l => l.name)).toEqual(['Bug']);
    const labelId = first.result.labels[0]!.id;

    // same name, different case, different colour: reuses the label, keeps its stored colour
    const reused = await tx(t =>
      policy.addLabel(t, ADA, { cardId: id, name: 'bug', color: '#000000' })
    );
    expect(reused.result.labels).toHaveLength(1);
    expect(reused.result.labels[0]!.id).toBe(labelId);
    expect(reused.result.labels[0]!.color).toBe('#ff7b72');

    const removed = await tx(t => policy.removeLabel(t, ADA, { cardId: id, labelId }));
    expect(removed.result.labels).toEqual([]);
    // removing again is a no-op, not an error
    const removedAgain = await tx(t => policy.removeLabel(t, ADA, { cardId: id, labelId }));
    expect(removedAgain.result.labels).toEqual([]);
  });

  it('deleteCard is idempotent; later ops on the card are CARD_GONE', async () => {
    const id = await cardIdByKey('DB-07');
    const first = await tx(t => policy.deleteCard(t, ADA, { cardId: id }));
    const second = await tx(t => policy.deleteCard(t, ADA, { cardId: id }));
    expect(first).toMatchObject({ result: id, changed: true });
    expect(second).toMatchObject({ result: id, changed: false });
    expect(
      await code(tx(t => policy.moveCard(t, ADA, { cardId: id, columnId: TODO, position: 1 })))
    ).toBe('CARD_GONE');
    expect(
      await code(
        tx(t =>
          policy.updateCard(t, ADA, { cardId: id, baseVersion: 1, title: 'x', description: null })
        )
      )
    ).toBe('CARD_GONE');
    expect(
      await code(
        tx(t => policy.moveCard(t, ADA, { cardId: randomUUID(), columnId: TODO, position: 1 }))
      )
    ).toBe('NOT_FOUND');
  });

  it('moveCard reindexes the column when gaps are exhausted and returns every touched card', async () => {
    const anchorA = await tx(t => create(t, DOING, 'anchor A', 50000));
    const anchorB = await tx(t => create(t, DOING, 'anchor B', 51024));
    const movers: string[] = [];
    for (let i = 0; i < 40; i++)
      movers.push((await tx(t => create(t, TODO, `mover ${i}`, 10000 + i))).result.id);

    let upper = anchorB.result.position;
    let reindexedAt = -1;
    let columnSizeAtReindex = 0;
    for (const [i, id] of movers.entries()) {
      const position = between(anchorA.result.position, upper);
      const moved = await tx(t =>
        policy.moveCard(t, ADA, { cardId: id, columnId: DOING, position })
      );
      if (moved.result.length > 1) {
        reindexedAt = i;
        columnSizeAtReindex = (await listLiveCardsInColumn(pool, DOING)).length;
        expect(moved.result).toHaveLength(columnSizeAtReindex);
        break;
      }
      upper = moved.result[0]!.position;
    }
    expect(reindexedAt).toBeGreaterThan(10);
    const after = await listLiveCardsInColumn(pool, DOING);
    const positions = after.map(c => c.position);
    expect(new Set(positions).size).toBe(positions.length);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(Math.min(...positions.slice(1).map((p, i) => p - positions[i]!))).toBeGreaterThanOrEqual(
      1
    );
    expect(after.some(c => c.id === anchorA.result.id)).toBe(true);
  });
});
