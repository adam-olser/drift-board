import type { Resolvers } from '../../gql/types';
import { withTx } from '../../db';
import { badInput, unauthenticated } from '../../errors';
import { assertLength, DESCRIPTION_MAX, LABEL_NAME_MAX, TITLE_MAX } from '../../limits';
import type { Context } from '../../graphql';
import * as policy from './policy';
import { publish } from '../events';

const DUE_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function requireSession(ctx: Context): string {
  if (!ctx.session) throw unauthenticated();
  return ctx.session.id;
}

function assertDueDate(value: string): string {
  if (!DUE_DATE_RE.test(value)) throw badInput('dueDate must be an ISO date, e.g. "2026-09-30".');
  return value;
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
      if (applied.changed) {
        publish(applied.boardId, {
          boardEvents: { __typename: 'CardCreated', origin: sessionId, card: applied.result },
        });
      }
      return applied.result;
    },
    updateCard: async (
      _p,
      { opId, cardId, baseVersion, title, description, priority, dueDate, assigneeSessionId },
      ctx
    ) => {
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
            priority: priority?.toLowerCase(),
            dueDate:
              dueDate === undefined ? undefined : dueDate === null ? null : assertDueDate(dueDate),
            assigneeSessionId,
          })
        )
      );
      if (applied.changed) {
        publish(applied.boardId, {
          boardEvents: { __typename: 'CardUpdated', origin: sessionId, card: applied.result },
        });
      }
      return applied.result;
    },
    moveCard: async (_p, { opId, cardId, columnId, position }, ctx) => {
      const sessionId = requireSession(ctx);
      const applied = await withTx(tx =>
        policy.idempotent(tx, { opId, sessionId, type: 'moveCard' }, () =>
          policy.moveCard(tx, sessionId, { cardId, columnId, position })
        )
      );
      if (applied.changed) {
        publish(applied.boardId, {
          boardEvents: { __typename: 'CardMoved', origin: sessionId, cards: applied.result },
        });
      }
      return applied.result;
    },
    deleteCard: async (_p, { opId, cardId }, ctx) => {
      const sessionId = requireSession(ctx);
      const applied = await withTx(tx =>
        policy.idempotent(tx, { opId, sessionId, type: 'deleteCard' }, () =>
          policy.deleteCard(tx, sessionId, { cardId })
        )
      );
      if (applied.changed) {
        publish(applied.boardId, {
          boardEvents: { __typename: 'CardDeleted', origin: sessionId, cardId: applied.result },
        });
      }
      return applied.result;
    },
    addLabel: async (_p, { opId, cardId, name, color }, ctx) => {
      const sessionId = requireSession(ctx);
      const cleanName = assertLength('Label', name, LABEL_NAME_MAX);
      const applied = await withTx(tx =>
        policy.idempotent(tx, { opId, sessionId, type: 'addLabel' }, () =>
          policy.addLabel(tx, sessionId, { cardId, name: cleanName, color })
        )
      );
      if (applied.changed) {
        publish(applied.boardId, {
          boardEvents: { __typename: 'CardUpdated', origin: sessionId, card: applied.result },
        });
      }
      return applied.result;
    },
    removeLabel: async (_p, { opId, cardId, labelId }, ctx) => {
      const sessionId = requireSession(ctx);
      const applied = await withTx(tx =>
        policy.idempotent(tx, { opId, sessionId, type: 'removeLabel' }, () =>
          policy.removeLabel(tx, sessionId, { cardId, labelId })
        )
      );
      if (applied.changed) {
        publish(applied.boardId, {
          boardEvents: { __typename: 'CardUpdated', origin: sessionId, card: applied.result },
        });
      }
      return applied.result;
    },
  },
} satisfies Resolvers;
