import type { Resolvers } from '../../gql/types';
import { pool } from '../../db';
import { badInput } from '../../errors';
import type { Context } from '../../graphql';
import { assertLength, EMAIL_MAX, NAME_MAX, PASSWORD_MAX, PASSWORD_MIN } from '../../limits';
import { colorFor } from './colors';
import { setSessionCookie } from './cookie';
import { hashPassword, verifyPassword } from './password';
import {
  countSessions,
  findUser,
  findUserByEmail,
  insertSession,
  insertUser,
  setSessionUser,
  toSession,
  toUser,
  type SessionRow,
  type UserRow,
} from './sql';

const NO_MATCH = "Email or password didn't match.";
// why: an unknown email must cost the same as a wrong password, or timing reveals which.
const DUMMY_HASH = `${'0'.repeat(32)}:${'0'.repeat(128)}`;

async function newGuest(ctx: Context, displayName: string): Promise<SessionRow> {
  const row = await insertSession(pool, displayName, colorFor(await countSessions(pool)));
  setSessionCookie(ctx.reply, row.id);
  return row;
}

/** Auth is additive (PLAN.md): the current guest session is upgraded in place, never replaced. */
async function attach(ctx: Context, user: UserRow) {
  const session = ctx.session ?? (await newGuest(ctx, user.name));
  return toSession(await setSessionUser(pool, session.id, user.id));
}

function assertPassword(password: string): string {
  if (password.length < PASSWORD_MIN)
    throw badInput(`Password needs at least ${PASSWORD_MIN} characters.`);
  if (password.length > PASSWORD_MAX) throw badInput('Password is too long.');
  return password;
}

export const sessionResolvers = {
  Query: {
    viewer: (_parent, _args, ctx) => ({
      session: ctx.session ? toSession(ctx.session) : null,
    }),
  },
  Session: {
    user: async parent => {
      const row = parent.userId ? await findUser(pool, parent.userId) : null;
      return row ? toUser(row) : null;
    },
  },
  Mutation: {
    startGuestSession: async (_parent, { displayName }, ctx) =>
      toSession(await newGuest(ctx, assertLength('Name', displayName, NAME_MAX))),
    signUp: async (_parent, { email, password, name }, ctx) => {
      const cleanEmail = assertLength('Email', email, EMAIL_MAX);
      if (!cleanEmail.includes('@')) throw badInput('That does not look like an email.');
      const cleanName = assertLength('Name', name, NAME_MAX);
      const user = await insertUser(pool, {
        email: cleanEmail,
        passwordHash: await hashPassword(assertPassword(password)),
        name: cleanName,
      });
      if (!user) throw badInput('An account with that email already exists.');
      return attach(ctx, user);
    },
    logIn: async (_parent, { email, password }, ctx) => {
      const user = await findUserByEmail(pool, email.trim());
      const ok = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
      if (!user || !ok) throw badInput(NO_MATCH);
      return attach(ctx, user);
    },
    logOut: async (_parent, _args, ctx) => {
      // A fresh guest session rather than clearing user_id: the old one keeps its history.
      const name = ctx.session?.display_name ?? 'guest';
      return toSession(await newGuest(ctx, name));
    },
  },
} satisfies Resolvers;
