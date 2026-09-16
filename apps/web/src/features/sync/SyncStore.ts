import type { ApolloClient, NextLink, Observer, Operation } from '@apollo/client';
import { makeAutoObservable, observableShallow, runInAction } from 'mobx';
import { BoardDocument, type PresenceFieldsFragment } from '@/gql/graphql';
import { rebase, type Replayable } from './replay';

export type Connection = 'online' | 'offline' | 'syncing';

export interface LogEntry {
  ts: number;
  op: string;
  vars: Record<string, unknown>;
  status: 'ok' | 'error' | 'pending';
  ms: number;
  /** Card the op touched, when it is a card mutation. */
  cardId: string | null;
  /** Card key from the result, once it landed. */
  key?: string;
  /** Error code from the server, when rejected. */
  error?: string;
}

/** An operation parked while offline; forwarded by replay() (T6.3). */
export interface PendingOp extends Replayable {
  operation: Operation;
  forward: NextLink;
  observer: Observer<unknown>;
}

export type ToastKind = 'ok' | 'queued' | 'error';
export interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

/**
 * MobX owns the sync engine only (PLAN.md): connection state, log, offline queue, toasts, peers.
 * Domain data stays in Apollo's cache.
 */
export class SyncStore {
  connection: Connection = 'offline';
  log: LogEntry[] = [];
  queue: PendingOp[] = [];
  toasts: Toast[] = [];
  peers: PresenceFieldsFragment[] = [];
  replayProgress: { done: number; total: number } | null = null;
  /** graphql-ws ping → pong round trip, for the header pill. */
  latencyMs: number | null = null;
  offlineSince: number | null = null;
  private pingSentAt = 0;
  private client: ApolloClient<unknown> | null = null;
  private nextToast = 1;

  constructor() {
    // why: queue entries hold Apollo Operation/Observer objects that must not be proxied.
    // (MobX 7 renamed observable.shallow to observableShallow.)
    makeAutoObservable<this, 'client'>(this, { queue: observableShallow, client: false });
  }

  /** Called once from client.ts, so reconciliation can run a query without a circular import. */
  attach(client: ApolloClient<unknown>) {
    this.client = client;
  }

  setConnection(state: Connection) {
    if (state === 'offline' && this.connection !== 'offline') this.offlineSince = Date.now();
    if (state !== 'offline') this.offlineSince = null;
    this.connection = state;
  }

  pingSent() {
    this.pingSentAt = Date.now();
  }

  pongReceived() {
    this.latencyMs = Date.now() - this.pingSentAt;
  }

  setPeers(peers: PresenceFieldsFragment[]) {
    this.peers = peers;
  }

  addLog(entry: LogEntry): LogEntry {
    this.log.push(entry);
    if (this.log.length > 200) this.log.shift(); // ponytail: ring buffer by shift, fine at 200
    return this.log[this.log.length - 1] as LogEntry;
  }

  settleLog(entry: LogEntry, patch: Partial<LogEntry>) {
    Object.assign(entry, patch);
  }

  /** History rows for the card panel, newest first. */
  logFor(cardId: string): LogEntry[] {
    return this.log.filter(e => e.cardId === cardId).reverse();
  }

  toast(message: string, kind: ToastKind = 'error') {
    this.toasts.push({ id: this.nextToast++, message, kind });
  }

  dismissToast(id: number) {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  park(entry: PendingOp) {
    this.queue.push(entry);
  }

  /** Cards with a parked op, for the dashed row style (T6.4). */
  isQueued(cardId: string): boolean {
    return this.queue.some(e => e.cardId === cardId);
  }

  /**
   * On reconnect: forward the parked ops one at a time, rebasing baseVersion from each result,
   * then refetch the board. A rejected op has already errored its observer (layer dropped,
   * toast shown). If the socket closes mid-way, stop and leave the rest parked.
   */
  async replay() {
    if (this.queue.length === 0) {
      this.setConnection('online');
      return;
    }
    const total = this.queue.length;
    this.setConnection('syncing');
    this.replayProgress = { done: 0, total };
    while (this.queue.length > 0 && this.connection === 'syncing') {
      const entry = this.queue[0] as PendingOp;
      if (entry.baseVersion != null) entry.operation.variables['baseVersion'] = entry.baseVersion;
      const result = await new Promise<Record<string, unknown> | null>(resolve => {
        let data: Record<string, unknown> | null = null;
        entry.forward(entry.operation).subscribe({
          next: r => {
            data = (r.data as Record<string, unknown> | null) ?? null;
            entry.observer.next?.(r);
          },
          error: e => {
            entry.observer.error?.(e);
            resolve(null);
          },
          complete: () => {
            entry.observer.complete?.();
            resolve(data);
          },
        });
      });
      runInAction(() => {
        this.queue = this.queue.slice(1);
        const updated = result?.['updateCard'] as { id: string; version: number } | undefined;
        if (updated)
          this.queue = rebase(this.queue, { cardId: updated.id, version: updated.version });
        if (this.replayProgress) this.replayProgress.done += 1;
      });
    }
    if (this.connection !== 'syncing') return; // went offline mid-replay
    await this.client?.refetchQueries({ include: [BoardDocument] });
    runInAction(() => {
      this.replayProgress = null;
      this.connection = 'online';
      this.toast(
        `Back online — ${total} queued ${total === 1 ? 'change' : 'changes'} synced`,
        'ok'
      );
    });
  }
}

export const syncStore = new SyncStore();
// Exposed for the interview demo and the browser verify scripts (D-018); not used by app code.
Object.assign(window, { syncStore });
