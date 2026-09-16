import { randomBytes } from 'node:crypto';
import type { Resolvers } from '../../gql/types';
import { pool, withTx } from '../../db';
import { unauthenticated } from '../../errors';
import { assertLength, BOARD_NAME_MAX } from '../../limits';
import { listLiveCards, toCard } from '../cards/sql';
import {
  findBoardBySlug,
  insertBoard,
  insertDefaultColumns,
  listBoardsForSession,
  listColumns,
  toBoard,
  toColumn,
} from './sql';

const SLUG_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'; // 32 chars, no 0/o/1/l
const SLUG_LENGTH = 5;
const UNIQUE_VIOLATION = '23505';

function randomSlug(): string {
  return Array.from(randomBytes(SLUG_LENGTH), b => SLUG_ALPHABET[b % 32]).join('');
}

/** Up to three initials, letters only; "DB" when the name yields none. */
export function keyPrefixFor(name: string): string {
  const initials = name
    .split(/\s+/)
    .map(w => w.replace(/[^\p{L}]/gu, '').charAt(0))
    .filter(Boolean)
    .slice(0, 3)
    .join('')
    .toUpperCase();
  return initials || 'DB';
}

export const boardResolvers = {
  Query: {
    board: async (_parent, { slug }) => {
      const row = await findBoardBySlug(pool, slug);
      return row ? toBoard(row) : null;
    },
  },
  Mutation: {
    createBoard: async (_parent, { name }, ctx) => {
      if (!ctx.session) throw unauthenticated();
      const sessionId = ctx.session.id;
      const trimmed = assertLength('Board name', name, BOARD_NAME_MAX);
      const keyPrefix = keyPrefixFor(trimmed);
      const create = () =>
        withTx(async tx => {
          const board = await insertBoard(tx, {
            slug: randomSlug(),
            name: trimmed,
            keyPrefix,
            sessionId,
          });
          await insertDefaultColumns(tx, board.id);
          return board;
        });
      try {
        return toBoard(await create());
      } catch (error) {
        if ((error as { code?: string }).code !== UNIQUE_VIOLATION) throw error;
        return toBoard(await create()); // one retry on a slug collision
      }
    },
  },
  Viewer: {
    boards: async (_parent, _args, ctx) =>
      ctx.session ? (await listBoardsForSession(pool, ctx.session.id)).map(toBoard) : [],
  },
  Board: {
    columns: async parent => (await listColumns(pool, parent.id)).map(toColumn),
    cards: async parent => (await listLiveCards(pool, parent.id)).map(toCard),
  },
} satisfies Resolvers;
