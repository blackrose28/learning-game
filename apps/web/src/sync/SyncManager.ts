import type { Attempt, SessionStorageAdapter } from '@math-archer/learning-engine';
import { MathArcherApiClient, ApiError } from '../api/client';
import {
  enqueueAttempt,
  getPendingQueue,
  markAttemptsRejected,
  markAttemptsSynced,
  markAttemptStatus,
  loadQueue,
  type QueuedAttempt,
} from './queue';

const SYNC_CHUNK_SIZE = 25;
const DAILY_LIMIT_MESSAGE = 'Daily arrow limit (50) reached on server';

export type SyncStateStatus = 'synced' | 'syncing' | 'offline' | 'error';

export interface SyncState {
  status: SyncStateStatus;
  pendingCount: number;
  lastSyncedAt?: string;
  lastError?: string;
}

export type SyncListener = (state: SyncState) => void;

export interface SyncManagerOptions {
  playerId?: string;
  apiClient?: MathArcherApiClient;
  storage?: SessionStorageAdapter;
  autoSync?: boolean;
  initialOnline?: boolean;
}

export class SyncManager {
  private playerId: string;
  private apiClient: MathArcherApiClient;
  private storage?: SessionStorageAdapter;
  private isOnlineInternal: boolean;
  private listeners: Set<SyncListener> = new Set();
  private state: SyncState;

  constructor(options: SyncManagerOptions = {}) {
    this.playerId = options.playerId ?? 'player-local';
    this.apiClient = options.apiClient ?? new MathArcherApiClient();
    this.storage = options.storage;

    const navOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.isOnlineInternal = options.initialOnline !== undefined ? options.initialOnline : navOnline;

    const pending = getPendingQueue(this.playerId, this.storage).length;
    this.state = {
      status: !this.isOnlineInternal ? 'offline' : pending > 0 ? 'syncing' : 'synced',
      pendingCount: pending,
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }

    if (options.autoSync !== false && this.isOnlineInternal && pending > 0) {
      this.flushQueue().catch(() => {});
    }
  }

  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    this.listeners.clear();
  }

  get isOnline(): boolean {
    return this.isOnlineInternal;
  }

  setOnline(online: boolean): void {
    this.isOnlineInternal = online;
    if (online) {
      this.handleOnline();
    } else {
      this.handleOffline();
    }
  }

  getState(): SyncState {
    const pending = getPendingQueue(this.playerId, this.storage).length;
    return {
      ...this.state,
      pendingCount: pending,
    };
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const currentState = this.getState();
    for (const listener of this.listeners) {
      listener(currentState);
    }
  }

  private handleOnline = (): void => {
    this.isOnlineInternal = true;
    this.flushQueue().catch(() => {});
  };

  private handleOffline = (): void => {
    this.isOnlineInternal = false;
    this.state = {
      ...this.state,
      status: 'offline',
      pendingCount: getPendingQueue(this.playerId, this.storage).length,
    };
    this.notify();
  };

  async processAttempt(attempt: Attempt): Promise<QueuedAttempt> {
    // 1. Always enqueue locally first (guarantees zero data loss)
    const queuedItem = enqueueAttempt(this.playerId, attempt, this.storage);

    // 2. If offline, leave in queue and update state
    if (!this.isOnlineInternal) {
      this.state = {
        status: 'offline',
        pendingCount: getPendingQueue(this.playerId, this.storage).length,
      };
      this.notify();
      return queuedItem;
    }

    // 3. If online, attempt immediate sync
    await this.flushQueue();
    return queuedItem;
  }

  async flushQueue(): Promise<{ synced: number; failed: number }> {
    const pending = getPendingQueue(this.playerId, this.storage);
    if (pending.length === 0) {
      this.state = {
        status: this.isOnlineInternal ? 'synced' : 'offline',
        pendingCount: 0,
        lastSyncedAt: this.state.lastSyncedAt,
      };
      this.notify();
      return { synced: 0, failed: 0 };
    }

    if (!this.isOnlineInternal) {
      this.state = {
        status: 'offline',
        pendingCount: pending.length,
      };
      this.notify();
      return { synced: 0, failed: pending.length };
    }

    this.state = {
      ...this.state,
      status: 'syncing',
      pendingCount: pending.length,
    };
    this.notify();

    let synced = 0;
    let rejectedMessage: string | undefined;
    let chunk: QueuedAttempt[] = [];

    try {
      // Send the backlog in small chunks so one request stays well inside the Worker's
      // per-invocation limits and one bad chunk cannot hold back the rest.
      for (let i = 0; i < pending.length; i += SYNC_CHUNK_SIZE) {
        chunk = pending.slice(i, i + SYNC_CHUNK_SIZE);
        const outcome = await this.sendChunk(chunk);
        synced += outcome.synced;
        rejectedMessage = outcome.rejectedMessage ?? rejectedMessage;
      }

      const remainingPending = getPendingQueue(this.playerId, this.storage).length;
      this.state = {
        status: rejectedMessage ? 'error' : remainingPending === 0 ? 'synced' : 'syncing',
        pendingCount: remainingPending,
        lastSyncedAt: new Date().toISOString(),
        lastError: rejectedMessage,
      };
      this.notify();
      return { synced, failed: 0 };
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : 'Sync failed';
      const isTypeError = err instanceof TypeError;

      const isNetworkError =
        !this.isOnlineInternal ||
        isTypeError ||
        errMessage.includes('fetch') ||
        errMessage.includes('NetworkError');

      // Only the chunk in flight failed (and within it, only items not already resolved by the
      // item-by-item fallback); later chunks were never touched and stay pending
      const inFlight = new Set(
        loadQueue(this.playerId, this.storage)
          .filter((item) => item.status === 'syncing')
          .map((item) => item.id)
      );
      for (const item of chunk) {
        if (inFlight.has(item.id)) {
          markAttemptStatus(this.playerId, item.id, 'failed', errMessage, this.storage);
        }
      }

      const remainingPending = getPendingQueue(this.playerId, this.storage).length;
      this.state = {
        status: isNetworkError ? 'offline' : 'error',
        pendingCount: remainingPending,
        lastError: errMessage,
      };
      this.notify();
      return { synced, failed: remainingPending };
    }
  }

  /**
   * Sends one chunk. Resolves with how many items synced; items the server refuses for good
   * are marked `rejected` (so they leave the retry queue) and reported via `rejectedMessage`.
   * Throws on transient failures (network, 5xx, 401...), leaving the chunk for the caller to fail.
   */
  private async sendChunk(
    chunk: QueuedAttempt[]
  ): Promise<{ synced: number; rejectedMessage?: string }> {
    for (const item of chunk) {
      markAttemptStatus(this.playerId, item.id, 'syncing', undefined, this.storage);
    }

    try {
      const res = await this.apiClient.submitAttemptsBatch(
        this.playerId,
        chunk.map((p) => p.attempt)
      );
      if (!res.success) {
        throw new Error(res.error || 'Batch sync was not successful');
      }

      const rejectedItems = (res.rejected ?? [])
        .map((r) => chunk[r.index])
        .filter((item): item is QueuedAttempt => item !== undefined);
      const rejectedIds = new Set(rejectedItems.map((item) => item.id));
      const syncedIds = chunk.filter((item) => !rejectedIds.has(item.id)).map((item) => item.id);

      markAttemptsSynced(this.playerId, syncedIds, this.storage);
      if (rejectedItems.length > 0) {
        markAttemptsRejected(
          this.playerId,
          rejectedItems.map((item) => item.id),
          DAILY_LIMIT_MESSAGE,
          this.storage
        );
      }
      return {
        synced: syncedIds.length,
        rejectedMessage: rejectedItems.length > 0 ? DAILY_LIMIT_MESSAGE : undefined,
      };
    } catch (err: unknown) {
      const permanent = err instanceof ApiError && (err.status === 400 || err.status === 403);
      if (!permanent) throw err;

      // Older servers fail the whole request for one over-limit/invalid attempt. Retry the
      // chunk item by item to isolate it, instead of poisoning the entire backlog.
      if (chunk.length > 1) {
        let synced = 0;
        let rejectedMessage: string | undefined;
        for (const item of chunk) {
          const outcome = await this.sendChunk([item]);
          synced += outcome.synced;
          rejectedMessage = outcome.rejectedMessage ?? rejectedMessage;
        }
        return { synced, rejectedMessage };
      }

      const message = err.status === 403 ? DAILY_LIMIT_MESSAGE : err.message;
      markAttemptsRejected(this.playerId, [chunk[0].id], message, this.storage);
      return { synced: 0, rejectedMessage: message };
    }
  }

  getAllQueue(): QueuedAttempt[] {
    return loadQueue(this.playerId, this.storage);
  }
}
