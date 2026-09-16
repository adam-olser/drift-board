import type { ApolloClient, Observer, Operation } from '@apollo/client';
import { makeAutoObservable, observableShallow } from 'mobx';
import type { PresenceFieldsFragment } from '@/gql/graphql';

export type Connection = 'online' | 'offline' | 'syncing';

export interface LogEntry {
  ts: number;
  op: string;
  vars: Record<string, unknown>;
  status: 'ok' | 'error' | 'pending';
  ms: number;
}

/** An operation parked while offline; forwarded by replay() (T6.3). */
export interface PendingOp {
  operation: Operation;
  observer: Observer<unknown>;
}

export interface Toast {
  id: number;
  message: string;
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
    this.connection = state;
  }

  setPeers(peers: PresenceFieldsFragment[]) {
    this.peers = peers;
  }

  addLog(entry: LogEntry) {
    this.log.push(entry);
    if (this.log.length > 200) this.log.shift(); // ponytail: ring buffer by shift, fine at 200
  }

  toast(message: string) {
    this.toasts.push({ id: this.nextToast++, message });
  }

  dismissToast(id: number) {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  /** T6.3 replaces this: forward the queue in order with rebase, then refetch the board. */
  replay() {
    this.setConnection('online');
  }
}

export const syncStore = new SyncStore();
