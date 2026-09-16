import type { Resolvers } from '../../gql/types';
import { unauthenticated } from '../../errors';
import type { Context } from '../../graphql';
import { publish, topic } from '../events';
import { toSession } from '../sessions/sql';
import * as presence from './map';

/** T4.2: connection-level presence. `setViewing` is a stub until Milestone 9. */
export const presenceResolvers = {
  Subscription: {
    boardEvents: {
      subscribe: async (_p, { boardId }, ctx: Context) => {
        if (!ctx.session || !ctx.conn) throw unauthenticated();
        // why: Mercurius shallow-copies the context per operation, so the shared `conn` object is
        // the only thing onDisconnect can see. One board per connection.
        ctx.conn.boardId = boardId;
        const { id, displayName, color } = toSession(ctx.session);
        const peers = presence.join(boardId, { sessionId: id, name: displayName, color });
        const iterator = await ctx.pubsub.subscribe(topic(boardId));
        publish(boardId, {
          boardEvents: { __typename: 'PresenceChanged', origin: id, peers },
        });
        return iterator;
      },
    },
  },
  Mutation: {
    setViewing: () => true,
  },
} satisfies Resolvers;

/**
 * Mercurius `subscription.onDisconnect`: drop the peer and tell the board. Mercurius fires it
 * twice per close (connection_terminate, then the socket's close), hence the null check.
 */
export function onDisconnect(ctx: Context): void {
  const boardId = ctx.conn?.boardId;
  if (!boardId || !ctx.session) return;
  const peers = presence.leave(boardId, ctx.session.id);
  if (!peers) return;
  publish(boardId, {
    boardEvents: { __typename: 'PresenceChanged', origin: ctx.session.id, peers },
  });
}
