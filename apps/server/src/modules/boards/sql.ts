import type { Queryable } from '../../tx';
import type { Board, Column } from '../../gql/types';

export interface BoardRow {
  id: string;
  slug: string;
  name: string;
  key_prefix: string;
  next_key_no: number;
  created_by_session_id: string;
}

export interface ColumnRow {
  id: string;
  board_id: string;
  title: string;
  position: number;
}

/** What Query.board / Viewer.boards return; `columns` and `cards` are field resolvers. */
export type BoardParent = Omit<Board, 'columns' | 'cards' | 'labels'>;

export const toBoard = (row: BoardRow): BoardParent => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  keyPrefix: row.key_prefix,
});

export const toColumn = (row: ColumnRow): Column => ({
  id: row.id,
  title: row.title,
  position: row.position,
});

const BOARD_COLUMNS = 'id, slug, name, key_prefix, next_key_no, created_by_session_id';
export const DEFAULT_COLUMNS = ['To do', 'In progress', 'Done'] as const;

export async function findBoardBySlug(db: Queryable, slug: string): Promise<BoardRow | null> {
  const { rows } = await db.query<BoardRow>(`select ${BOARD_COLUMNS} from boards where slug = $1`, [
    slug,
  ]);
  return rows[0] ?? null;
}

export async function findBoardById(db: Queryable, id: string): Promise<BoardRow | null> {
  const { rows } = await db.query<BoardRow>(`select ${BOARD_COLUMNS} from boards where id = $1`, [
    id,
  ]);
  return rows[0] ?? null;
}

/** Boards created by this session, or by any session of the same user once signed in. */
export async function listBoardsForSession(db: Queryable, sessionId: string): Promise<BoardRow[]> {
  const { rows } = await db.query<BoardRow>(
    `select ${BOARD_COLUMNS} from boards
      where created_by_session_id in (
        select s.id from sessions s
         where s.id = $1
            or (s.user_id is not null and s.user_id = (select user_id from sessions where id = $1))
      )
      order by created_at desc`,
    [sessionId]
  );
  return rows;
}

export async function listColumns(db: Queryable, boardId: string): Promise<ColumnRow[]> {
  const { rows } = await db.query<ColumnRow>(
    'select id, board_id, title, position from columns where board_id = $1 order by position',
    [boardId]
  );
  return rows;
}

export async function insertBoard(
  db: Queryable,
  input: { slug: string; name: string; keyPrefix: string; sessionId: string }
): Promise<BoardRow> {
  const { rows } = await db.query<BoardRow>(
    `insert into boards (slug, name, key_prefix, created_by_session_id)
     values ($1, $2, $3, $4) returning ${BOARD_COLUMNS}`,
    [input.slug, input.name, input.keyPrefix, input.sessionId]
  );
  const row = rows[0];
  if (!row) throw new Error('insert into boards returned no row');
  return row;
}

export async function insertDefaultColumns(db: Queryable, boardId: string): Promise<void> {
  await db.query(
    `insert into columns (board_id, title, position)
     select $1, t.title, t.position
       from unnest($2::text[], $3::int[]) as t(title, position)`,
    [boardId, [...DEFAULT_COLUMNS], DEFAULT_COLUMNS.map((_, i) => i + 1)]
  );
}
