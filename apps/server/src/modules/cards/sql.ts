import type { Queryable } from '../../db';
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
