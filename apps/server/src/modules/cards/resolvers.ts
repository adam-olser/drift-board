import type { Resolvers } from '../../gql/types';
import { withTx } from '../../db';
import { unauthenticated } from '../../errors';
import { assertLength, DESCRIPTION_MAX, TITLE_MAX } from '../../limits';
import type { Context } from '../../graphql';
import * as policy from './policy';

function requireSession(ctx: Context): string {
  if (!ctx.session) throw unauthenticated();
  return ctx.session.id;
}

/** Validation at the edge, then one transaction per mutation through the ops ledger. */
export const cardResolvers = {
  Mutation: {
    createCard: async (_p, { opId, id, boardId, columnId, title, position }, ctx) => {
      const sessionId = requireSession(ctx);
      const cleanTitle = assertLength('Title', title, TITLE_MAX);
      const applied = await withTx(tx =>
        policy.idempotent(tx, { opId, sessionId, type: 'createCard' }, () =>
          policy.createCard(tx, sessionId, { id, boardId, columnId, title: cleanTitle, position })
        )
      );
      return applied.result;
    },
    updateCard: async (_p, { opId, cardId, baseVersion, title, description }, ctx) => {
      const sessionId = requireSession(ctx);
      const cleanTitle = title == null ? null : assertLength('Title', title, TITLE_MAX);
      const cleanDescription =
        description == null ? null : description.trim().slice(0, DESCRIPTION_MAX);
      const applied = await withTx(tx =>
        policy.idempotent(tx, { opId, sessionId, type: 'updateCard' }, () =>
          policy.updateCard(tx, sessionId, {
            cardId,
            baseVersion,
            title: cleanTitle,
            description: cleanDescription,
          })
        )
      );
      return applied.result;
    },
    moveCard: async (_p, { opId, cardId, columnId, position }, ctx) => {
      const sessionId = requireSession(ctx);
      const applied = await withTx(tx =>
        policy.idempotent(tx, { opId, sessionId, type: 'moveCard' }, () =>
          policy.moveCard(tx, sessionId, { cardId, columnId, position })
        )
      );
      return applied.result;
    },
    deleteCard: async (_p, { opId, cardId }, ctx) => {
      const sessionId = requireSession(ctx);
      const applied = await withTx(tx =>
        policy.idempotent(tx, { opId, sessionId, type: 'deleteCard' }, () =>
          policy.deleteCard(tx, sessionId, { cardId })
        )
      );
      return applied.result;
    },
  },
} satisfies Resolvers;
