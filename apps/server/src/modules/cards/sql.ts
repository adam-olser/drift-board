import type { Queryable } from '../../tx';
import type { Card, Label, Priority } from '../../gql/types';

/** A live card joined to the session that last touched it and, if set, its assignee. */
export interface CardRow {
  id: string;
  board_id: string;
  column_id: string;
  key: string;
  title: string;
  description: string;
  priority: string;
  due_date: string | null;
  assignee_session_id: string | null;
  assignee_name: string | null;
  assignee_color: string | null;
  position: number;
  version: number;
  updated_at: Date;
  updated_by_session_id: string;
  updated_by_name: string;
  updated_by_color: string;
  deleted_at: Date | null;
}

export interface LabelRow {
  id: string;
  board_id: string;
  name: string;
  color: string;
}

export const CARD_SELECT = `
  select c.id, c.board_id, c.column_id, c.key, c.title, c.description, c.priority,
         c.due_date::text as due_date, c.assignee_session_id, c.position, c.version,
         c.updated_at, c.updated_by_session_id, c.deleted_at,
         s.display_name as updated_by_name, s.color as updated_by_color,
         a.display_name as assignee_name, a.color as assignee_color
    from cards c
    join sessions s on s.id = c.updated_by_session_id
    left join sessions a on a.id = c.assignee_session_id`;

/** One row per (card, label); a card with no labels contributes one row with label_id null. */
interface CardLabelRow {
  card_id: string;
  label_id: string | null;
  name: string | null;
  color: string | null;
}

const CARD_LABELS_SELECT = `
  select c.id as card_id, l.id as label_id, l.name, l.color
    from cards c
    left join card_labels cl on cl.card_id = c.id
    left join labels l on l.id = cl.label_id`;

async function labelsByCard(
  db: Queryable,
  cardIds: readonly string[]
): Promise<Map<string, Label[]>> {
  if (cardIds.length === 0) return new Map();
  const { rows } = await db.query<CardLabelRow>(
    `${CARD_LABELS_SELECT} where c.id = any($1::uuid[]) order by l.name`,
    [cardIds]
  );
  const map = new Map<string, Label[]>();
  for (const row of rows) {
    const list = map.get(row.card_id) ?? [];
    if (row.label_id && row.name && row.color)
      list.push({ id: row.label_id, name: row.name, color: row.color });
    map.set(row.card_id, list);
  }
  return map;
}

export const toCard = (row: CardRow, labels: Label[] = []): Card => ({
  id: row.id,
  key: row.key,
  title: row.title,
  description: row.description,
  columnId: row.column_id,
  position: row.position,
  priority: row.priority.toUpperCase() as Priority,
  dueDate: row.due_date,
  assignee:
    row.assignee_session_id && row.assignee_name && row.assignee_color
      ? { sessionId: row.assignee_session_id, name: row.assignee_name, color: row.assignee_color }
      : null,
  labels,
  version: row.version,
  updatedAt: row.updated_at.toISOString(),
  updatedBy: {
    sessionId: row.updated_by_session_id,
    name: row.updated_by_name,
    color: row.updated_by_color,
  },
});

/** Attach each row's labels and map to the GraphQL shape, in one round trip. */
async function toCards(db: Queryable, rows: readonly CardRow[]): Promise<Card[]> {
  const byCard = await labelsByCard(
    db,
    rows.map(r => r.id)
  );
  return rows.map(row => toCard(row, byCard.get(row.id) ?? []));
}

export async function listLiveCards(db: Queryable, boardId: string): Promise<CardRow[]> {
  const { rows } = await db.query<CardRow>(
    `${CARD_SELECT} where c.board_id = $1 and c.deleted_at is null order by c.column_id, c.position`,
    [boardId]
  );
  return rows;
}

/** `listLiveCards` plus each card's labels, for the board query. */
export async function listLiveCardsWithLabels(db: Queryable, boardId: string): Promise<Card[]> {
  return toCards(db, await listLiveCards(db, boardId));
}

export async function findCard(db: Queryable, id: string): Promise<CardRow | null> {
  const { rows } = await db.query<CardRow>(`${CARD_SELECT} where c.id = $1`, [id]);
  return rows[0] ?? null;
}

/** `findCard` plus its labels, for a single reload after a mutation. */
export async function findCardWithLabels(db: Queryable, id: string): Promise<Card | null> {
  const row = await findCard(db, id);
  if (!row) return null;
  const [card] = await toCards(db, [row]);
  return card ?? null;
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

/**
 * Text and detail edit: bumps version. The only statement that ever touches `version`.
 * `undefined` leaves a field unchanged; `null` on dueDate/assigneeSessionId clears it.
 */
export async function updateCardText(
  db: Queryable,
  input: {
    id: string;
    title: string | null;
    description: string | null;
    priority: string | undefined;
    dueDate: string | null | undefined;
    assigneeSessionId: string | null | undefined;
    sessionId: string;
  }
): Promise<void> {
  await db.query(
    `update cards
        set title = coalesce($2, title),
            description = coalesce($3, description),
            priority = coalesce($4, priority),
            due_date = case when $5::boolean then $6::date else due_date end,
            assignee_session_id = case when $7::boolean then $8::uuid else assignee_session_id end,
            version = version + 1,
            updated_at = now(),
            updated_by_session_id = $9
      where id = $1`,
    [
      input.id,
      input.title,
      input.description,
      input.priority ?? null,
      input.dueDate !== undefined,
      input.dueDate ?? null,
      input.assigneeSessionId !== undefined,
      input.assigneeSessionId ?? null,
      input.sessionId,
    ]
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

/** `listLiveCardsInColumn` plus labels, for the reindex-on-move result. */
export async function listLiveCardsInColumnWithLabels(
  db: Queryable,
  columnId: string
): Promise<Card[]> {
  return toCards(db, await listLiveCardsInColumn(db, columnId));
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

export async function sessionBelongsToBoard(
  db: Queryable,
  sessionId: string,
  boardId: string
): Promise<boolean> {
  // Any session can be assigned a card on a board it can see: no membership table exists (D-025).
  // This only guards against a garbage id; it is not an authorization check.
  const { rowCount } = await db.query('select 1 from sessions where id = $1', [sessionId]);
  return (rowCount ?? 0) > 0 && boardId.length > 0;
}

// ---- labels

export async function findLabelByName(
  db: Queryable,
  boardId: string,
  name: string
): Promise<LabelRow | null> {
  const { rows } = await db.query<LabelRow>(
    'select id, board_id, name, color from labels where board_id = $1 and lower(name) = lower($2)',
    [boardId, name]
  );
  return rows[0] ?? null;
}

export async function insertLabel(
  db: Queryable,
  input: { boardId: string; name: string; color: string }
): Promise<LabelRow> {
  const { rows } = await db.query<LabelRow>(
    `insert into labels (board_id, name, color) values ($1, $2, $3)
       on conflict (board_id, name) do update set color = excluded.color
       returning id, board_id, name, color`,
    [input.boardId, input.name, input.color]
  );
  const row = rows[0];
  if (!row) throw new Error('label insert returned no row');
  return row;
}

export async function attachLabel(db: Queryable, cardId: string, labelId: string): Promise<void> {
  await db.query(
    'insert into card_labels (card_id, label_id) values ($1, $2) on conflict do nothing',
    [cardId, labelId]
  );
}

export async function detachLabel(db: Queryable, cardId: string, labelId: string): Promise<void> {
  await db.query('delete from card_labels where card_id = $1 and label_id = $2', [cardId, labelId]);
}

export async function listBoardLabels(db: Queryable, boardId: string): Promise<LabelRow[]> {
  const { rows } = await db.query<LabelRow>(
    'select id, board_id, name, color from labels where board_id = $1 order by name',
    [boardId]
  );
  return rows;
}

// ---- ops ledger

export type OpType =
  'createCard' | 'updateCard' | 'moveCard' | 'deleteCard' | 'addLabel' | 'removeLabel';

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
