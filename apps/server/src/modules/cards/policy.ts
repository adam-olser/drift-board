/**
 * The conflict policy table from PLAN.md, one function per operation. Every function runs inside
 * the caller's transaction, after input validation, and is wrapped by `idempotent` so a replayed
 * opId returns the stored result instead of re-applying.
 */
import type pg from 'pg';
import { needsReindex, reindex } from '@shared/ordering';
import type { Card } from '../../gql/types';
import { badInput, cardGone, notFound, versionMismatch } from '../../errors';
import {
  attachLabel,
  columnBelongsToBoard,
  detachLabel,
  findCardWithLabels,
  findLabelByName,
  findOpResult,
  insertCard,
  insertLabel,
  insertOp,
  listLiveCardsInColumnWithLabels,
  lockCard,
  nextKey,
  sessionBelongsToBoard,
  setPositions,
  softDeleteCard,
  updateCardPlacement,
  updateCardText,
  type CardRow,
  type OpType,
} from './sql';

type Tx = pg.PoolClient;

export interface Applied<T> {
  result: T;
  boardId: string;
  /** False when nothing changed (e.g. deleting an already-deleted card): no event is published. */
  changed: boolean;
}

/** Ops ledger: a repeated opId returns the first result verbatim and applies nothing. */
export async function idempotent<T>(
  tx: Tx,
  op: { opId: string; sessionId: string; type: OpType },
  apply: () => Promise<Applied<T>>
): Promise<Applied<T>> {
  const stored = await findOpResult(tx, op.opId);
  if (stored !== undefined) return { result: stored as T, boardId: '', changed: false };
  const applied = await apply();
  await insertOp(tx, { ...op, boardId: applied.boardId, result: applied.result });
  return applied;
}

async function loadLiveCard(tx: Tx, cardId: string): Promise<CardRow> {
  const row = await lockCard(tx, cardId);
  if (!row) throw notFound('Card');
  if (row.deleted_at) throw cardGone(cardId);
  return row;
}

async function reloadCard(tx: Tx, id: string): Promise<Card> {
  const card = await findCardWithLabels(tx, id);
  if (!card) throw new Error(`card ${id} vanished inside its own transaction`);
  return card;
}

export async function createCard(
  tx: Tx,
  sessionId: string,
  input: { id: string; boardId: string; columnId: string; title: string; position: number }
): Promise<Applied<Card>> {
  if (!Number.isFinite(input.position)) throw badInput('position must be a finite number.');
  if (!(await columnBelongsToBoard(tx, input.columnId, input.boardId))) throw notFound('Column');
  if (await findCardWithLabels(tx, input.id)) throw badInput('A card with this id already exists.');
  const key = await nextKey(tx, input.boardId);
  await insertCard(tx, { ...input, key, sessionId });
  return { result: await reloadCard(tx, input.id), boardId: input.boardId, changed: true };
}

/** Optimistic concurrency: apply only when baseVersion matches; the earlier writer wins. */
export async function updateCard(
  tx: Tx,
  sessionId: string,
  input: {
    cardId: string;
    baseVersion: number;
    title: string | null;
    description: string | null;
    priority: string | undefined;
    dueDate: string | null | undefined;
    assigneeSessionId: string | null | undefined;
  }
): Promise<Applied<Card>> {
  const nothingToDo =
    input.title === null &&
    input.description === null &&
    input.priority === undefined &&
    input.dueDate === undefined &&
    input.assigneeSessionId === undefined;
  if (nothingToDo) throw badInput('Nothing to update.');
  const row = await loadLiveCard(tx, input.cardId);
  if (row.version !== input.baseVersion) throw versionMismatch(await reloadCard(tx, row.id));
  if (
    input.assigneeSessionId != null &&
    !(await sessionBelongsToBoard(tx, input.assigneeSessionId, row.board_id))
  ) {
    throw notFound('Assignee');
  }
  await updateCardText(tx, { id: row.id, ...input, sessionId });
  return { result: await reloadCard(tx, row.id), boardId: row.board_id, changed: true };
}

/** Last-write-wins: store the proposed position, reindex the column if gaps ran out. */
export async function moveCard(
  tx: Tx,
  sessionId: string,
  input: { cardId: string; columnId: string; position: number }
): Promise<Applied<Card[]>> {
  if (!Number.isFinite(input.position)) throw badInput('position must be a finite number.');
  const row = await loadLiveCard(tx, input.cardId);
  if (!(await columnBelongsToBoard(tx, input.columnId, row.board_id))) throw notFound('Column');
  await updateCardPlacement(tx, { id: row.id, ...input, sessionId });

  const column = await listLiveCardsInColumnWithLabels(tx, input.columnId);
  if (!needsReindex(column.map(c => c.position))) {
    return { result: [await reloadCard(tx, row.id)], boardId: row.board_id, changed: true };
  }
  const ids = column.map(c => c.id);
  await setPositions(tx, ids, reindex(ids.length));
  const touched = await listLiveCardsInColumnWithLabels(tx, input.columnId);
  return { result: touched, boardId: row.board_id, changed: true };
}

/** Soft delete; deleting an already-deleted card succeeds without an event. */
export async function deleteCard(
  tx: Tx,
  sessionId: string,
  input: { cardId: string }
): Promise<Applied<string>> {
  const row = await lockCard(tx, input.cardId);
  if (!row) throw notFound('Card');
  if (row.deleted_at) return { result: row.id, boardId: row.board_id, changed: false };
  await softDeleteCard(tx, row.id, sessionId);
  return { result: row.id, boardId: row.board_id, changed: true };
}

/** Creates the board's label by that name if it does not exist yet (case-insensitive), else reuses it. */
export async function addLabel(
  tx: Tx,
  _sessionId: string,
  input: { cardId: string; name: string; color: string }
): Promise<Applied<Card>> {
  const row = await loadLiveCard(tx, input.cardId);
  const existing = await findLabelByName(tx, row.board_id, input.name);
  const label =
    existing ??
    (await insertLabel(tx, { boardId: row.board_id, name: input.name, color: input.color }));
  await attachLabel(tx, row.id, label.id);
  return { result: await reloadCard(tx, row.id), boardId: row.board_id, changed: true };
}

export async function removeLabel(
  tx: Tx,
  _sessionId: string,
  input: { cardId: string; labelId: string }
): Promise<Applied<Card>> {
  const row = await loadLiveCard(tx, input.cardId);
  await detachLabel(tx, row.id, input.labelId);
  return { result: await reloadCard(tx, row.id), boardId: row.board_id, changed: true };
}
