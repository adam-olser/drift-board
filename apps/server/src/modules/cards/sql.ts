import type { Queryable } from '../../tx';
import type { Card } from '../../gql/types';

/** A live card joined to the session that last touched it. */
export interface CardRow {
  id: string;
  board_id: string;
  column_id: string;
  key: string;
  title: string;
  description: string;
  position: number;
  version: number;
  updated_at: Date;
  updated_by_session_id: string;
  updated_by_name: string;
  updated_by_color: string;
  deleted_at: Date | null;
}

export const CARD_SELECT = `
  select c.id, c.board_id, c.column_id, c.key, c.title, c.description, c.position, c.version,
         c.updated_at, c.updated_by_session_id, c.deleted_at,
         s.display_name as updated_by_name, s.color as updated_by_color
    from cards c
    join sessions s on s.id = c.updated_by_session_id`;

export const toCard = (row: CardRow): Card => ({
  id: row.id,
  key: row.key,
  title: row.title,
  description: row.description,
  columnId: row.column_id,
  position: row.position,
  version: row.version,
  updatedAt: row.updated_at.toISOString(),
  updatedBy: {
    sessionId: row.updated_by_session_id,
    name: row.updated_by_name,
    color: row.updated_by_color,
  },
});

export async function listLiveCards(db: Queryable, boardId: string): Promise<CardRow[]> {
  const { rows } = await db.query<CardRow>(
    `${CARD_SELECT} where c.board_id = $1 and c.deleted_at is null order by c.column_id, c.position`,
    [boardId]
  );
  return rows;
}

export async function findCard(db: Queryable, id: string): Promise<CardRow | null> {
  const { rows } = await db.query<CardRow>(`${CARD_SELECT} where c.id = $1`, [id]);
  return rows[0] ?? null;
}

/** Lock the card row for the rest of the transaction; null when it never existed. */
export async function lockCard(db: Queryable, id: string): Promise<CardRow | null> {
  const { rows } = await db.query<CardRow>(`${CARD_SELECT} where c.id = $1 for update of c`, [id]);
  return rows[0] ?? null;
}

export async function columnBelongsToBoard(
  db: Queryable,
  columnId: string,
  boardId: string
): Promise<boolean> {
  const { rowCount } = await db.query('select 1 from columns where id = $1 and board_id = $2', [
    columnId,
    boardId,
  ]);
  return (rowCount ?? 0) > 0;
}

/** Reserve the next key number for a board: DB-15, DB-16, … */
export async function nextKey(db: Queryable, boardId: string): Promise<string> {
  const { rows } = await db.query<{ key_prefix: string; n: number }>(
    `update boards set next_key_no = next_key_no + 1
      where id = $1 returning key_prefix, next_key_no - 1 as n`,
    [boardId]
  );
  const row = rows[0];
  if (!row) throw new Error(`board ${boardId} vanished while reserving a key`);
  return `${row.key_prefix}-${row.n}`;
}

export async function insertCard(
  db: Queryable,
  input: {
    id: string;
    boardId: string;
    columnId: string;
    key: string;
    title: string;
    position: number;
    sessionId: string;
  }
): Promise<void> {
  await db.query(
    `insert into cards (id, board_id, column_id, key, title, position, updated_by_session_id)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [
      input.id,
      input.boardId,
      input.columnId,
      input.key,
      input.title,
      input.position,
      input.sessionId,
    ]
  );
}

/** Text edit: bumps version. The only statement that ever touches `version`. */
export async function updateCardText(
  db: Queryable,
  input: { id: string; title: string | null; description: string | null; sessionId: string }
): Promise<void> {
  await db.query(
    `update cards
        set title = coalesce($2, title),
            description = coalesce($3, description),
            version = version + 1,
            updated_at = now(),
            updated_by_session_id = $4
      where id = $1`,
    [input.id, input.title, input.description, input.sessionId]
  );
}

/** Move: last-write-wins, never touches `version`. */
export async function updateCardPlacement(
  db: Queryable,
  input: { id: string; columnId: string; position: number; sessionId: string }
): Promise<void> {
  await db.query(
    `update cards
        set column_id = $2, position = $3, updated_at = now(), updated_by_session_id = $4
      where id = $1`,
    [input.id, input.columnId, input.position, input.sessionId]
  );
}

export async function listLiveCardsInColumn(db: Queryable, columnId: string): Promise<CardRow[]> {
  const { rows } = await db.query<CardRow>(
    `${CARD_SELECT} where c.column_id = $1 and c.deleted_at is null order by c.position, c.created_at`,
    [columnId]
  );
  return rows;
}

/** Assign `positions[i]` to `ids[i]` in one statement. */
export async function setPositions(
  db: Queryable,
  ids: readonly string[],
  positions: readonly number[]
): Promise<void> {
  await db.query(
    `update cards c set position = p.position
       from unnest($1::uuid[], $2::float8[]) as p(id, position)
      where c.id = p.id`,
    [ids, positions]
  );
}

export async function softDeleteCard(db: Queryable, id: string, sessionId: string): Promise<void> {
  await db.query(
    `update cards set deleted_at = now(), updated_at = now(), updated_by_session_id = $2 where id = $1`,
    [id, sessionId]
  );
}

// ---- ops ledger

export type OpType = 'createCard' | 'updateCard' | 'moveCard' | 'deleteCard';

export async function findOpResult(db: Queryable, opId: string): Promise<unknown | undefined> {
  const { rows } = await db.query<{ result: unknown }>('select result from ops where op_id = $1', [
    opId,
  ]);
  return rows[0]?.result;
}

export async function insertOp(
  db: Queryable,
  input: { opId: string; sessionId: string; boardId: string; type: OpType; result: unknown }
): Promise<void> {
  await db.query(
    `insert into ops (op_id, session_id, board_id, type, result) values ($1, $2, $3, $4, $5::jsonb)`,
    [input.opId, input.sessionId, input.boardId, input.type, JSON.stringify(input.result)]
  );
}
