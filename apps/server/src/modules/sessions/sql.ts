import type { Queryable } from '../../db';
import type { Session } from '../../gql/types';

export interface SessionRow {
  id: string;
  display_name: string;
  color: string;
  user_id: string | null;
  created_at: Date;
}

const COLUMNS = 'id, display_name, color, user_id, created_at';

/** What resolvers return for Session; `user` has its own field resolver (Milestone 8). */
export type SessionParent = Omit<Session, 'user'>;
/** What Query.viewer returns; `boards` is resolved by the boards module. */
export interface ViewerParent {
  session: SessionParent | null;
}

export function toSession(row: SessionRow): SessionParent {
  return { id: row.id, displayName: row.display_name, color: row.color };
}

export async function findSession(db: Queryable, id: string): Promise<SessionRow | null> {
  const { rows } = await db.query<SessionRow>(`select ${COLUMNS} from sessions where id = $1`, [
    id,
  ]);
  return rows[0] ?? null;
}

export async function countSessions(db: Queryable): Promise<number> {
  const { rows } = await db.query<{ n: string }>('select count(*)::text as n from sessions');
  return Number(rows[0]?.n ?? 0);
}

export async function insertSession(
  db: Queryable,
  displayName: string,
  color: string
): Promise<SessionRow> {
  const { rows } = await db.query<SessionRow>(
    `insert into sessions (display_name, color) values ($1, $2) returning ${COLUMNS}`,
    [displayName, color]
  );
  const row = rows[0];
  if (!row) throw new Error('insert into sessions returned no row');
  return row;
}
