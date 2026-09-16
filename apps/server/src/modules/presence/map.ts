import type { Presence } from '../../gql/types';

/** Ephemeral, in-process: who is connected to which board. Never touches Postgres (PLAN.md). */
const boards = new Map<string, Map<string, Presence>>();

export function join(boardId: string, peer: Presence): Presence[] {
  let peers = boards.get(boardId);
  if (!peers) boards.set(boardId, (peers = new Map()));
  peers.set(peer.sessionId, peer);
  return list(boardId);
}

/** The remaining peers, or null when the session was not on the board (a repeated disconnect). */
export function leave(boardId: string, sessionId: string): Presence[] | null {
  const peers = boards.get(boardId);
  if (!peers?.delete(sessionId)) return null;
  if (peers.size === 0) boards.delete(boardId);
  return list(boardId);
}

export function list(boardId: string): Presence[] {
  return [...(boards.get(boardId)?.values() ?? [])];
}

/** Card-level presence (T9.1): null clears. Returns the peers, or null when the session is not on the board. */
export function setViewing(
  boardId: string,
  sessionId: string,
  cardId: string | null
): Presence[] | null {
  const peer = boards.get(boardId)?.get(sessionId);
  if (!peer) return null;
  peer.viewingCardId = cardId;
  return list(boardId);
}
