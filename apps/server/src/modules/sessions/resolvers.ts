import type { Resolvers } from '../../gql/types';
import { pool } from '../../db';
import { assertLength, NAME_MAX } from '../../limits';
import { colorFor } from './colors';
import { setSessionCookie } from './cookie';
import { countSessions, insertSession, toSession } from './sql';

export const sessionResolvers = {
  Query: {
    viewer: (_parent, _args, ctx) => ({
      session: ctx.session ? toSession(ctx.session) : null,
      boards: [], // Viewer.boards is resolved by the boards module (T2.4)
    }),
  },
  Mutation: {
    startGuestSession: async (_parent, { displayName }, ctx) => {
      const name = assertLength('Name', displayName, NAME_MAX);
      const color = colorFor(await countSessions(pool));
      const row = await insertSession(pool, name, color);
      setSessionCookie(ctx.reply, row.id);
      return toSession(row);
    },
  },
} satisfies Resolvers;
