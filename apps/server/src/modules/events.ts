import type { FastifyInstance } from 'fastify';
import type { BoardEvent } from '../gql/types';

/** One pubsub topic per board (PLAN.md): notify-only, published after commit. */
export const topic = (boardId: string) => `board:${boardId}`;

type WithTypename<T> = T extends { __typename?: infer N } ? T & { __typename: N } : never;
export type BoardEventPayload = { boardEvents: WithTypename<BoardEvent> };

let app: FastifyInstance | null = null;
export const bindPubsub = (instance: FastifyInstance) => (app = instance);

export function publish(boardId: string, payload: BoardEventPayload): void {
  // Fire and forget: a lost notification is recovered by the reconnect refetch (Milestone 6).
  void app?.graphql.pubsub.publish({ topic: topic(boardId), payload });
}
