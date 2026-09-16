import type { Queryable } from '../../tx';
import type { Session, User } from '../../gql/types';

export interface SessionRow {
  id: string;
  display_name: string;
  color: string;
  user_id: string | null;
  created_at: Date;
}

const COLUMNS = 'id, display_name, color, user_id, created_at';

/** What resolvers return for Session; `user` has its own field resolver (Milestone 8). */
export type SessionParent = Omit<Session, 'user'> & { userId: string | null };

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
}
const USER_COLUMNS = 'id, email, password_hash, name';

export const toUser = (row: UserRow): User => ({ id: row.id, email: row.email, name: row.name });
/** What Query.viewer returns; `boards` is resolved by the boards module. */
export interface ViewerParent {
  session: SessionParent | null;
}

export function toSession(row: SessionRow): SessionParent {
  return { id: row.id, displayName: row.display_name, color: row.color, userId: row.user_id };
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

export async function findUser(db: Queryable, id: string): Promise<UserRow | null> {
  const { rows } = await db.query<UserRow>(`select ${USER_COLUMNS} from users where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function findUserByEmail(db: Queryable, email: string): Promise<UserRow | null> {
  const { rows } = await db.query<UserRow>(
    `select ${USER_COLUMNS} from users where lower(email) = lower($1)`,
    [email]
  );
  return rows[0] ?? null;
}

/** Null when the email is already taken (unique index on lower(email)). */
export async function insertUser(
  db: Queryable,
  input: { email: string; passwordHash: string; name: string }
): Promise<UserRow | null> {
  const { rows } = await db.query<UserRow>(
    `insert into users (email, password_hash, name) values ($1, $2, $3)
       on conflict (lower(email)) do nothing returning ${USER_COLUMNS}`,
    [input.email, input.passwordHash, input.name]
  );
  return rows[0] ?? null;
}

/** Signing in upgrades the session in place: same id, colour and queue (PLAN.md). */
export async function setSessionUser(
  db: Queryable,
  sessionId: string,
  userId: string
): Promise<SessionRow> {
  const { rows } = await db.query<SessionRow>(
    `update sessions set user_id = $2 where id = $1 returning ${COLUMNS}`,
    [sessionId, userId]
  );
  const row = rows[0];
  if (!row) throw new Error('session vanished while signing in');
  return row;
}
