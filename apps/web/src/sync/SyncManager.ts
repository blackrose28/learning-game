import type { Attempt, SessionStorageAdapter } from '@math-archer/learning-engine';
import { MathArcherApiClient, ApiError } from '../api/client';
import {
  enqueueAttempt,
  getPendingQueue,
  markAttemptsSynced,
  markAttemptStatus,
  loadQueue,
  type QueuedAttempt,
} from './queue';

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

    try {
      // Mark as syncing in storage
      for (const item of pending) {
        markAttemptStatus(this.playerId, item.id, 'syncing', undefined, this.storage);
      }

      const attemptsToSend = pending.map((p) => p.attempt);
      const res = await this.apiClient.submitAttemptsBatch(this.playerId, attemptsToSend);

      if (res.success) {
        const syncedIds = pending.map((p) => p.id);
        markAttemptsSynced(this.playerId, syncedIds, this.storage);

        const remainingPending = getPendingQueue(this.playerId, this.storage).length;
        this.state = {
          status: remainingPending === 0 ? 'synced' : 'syncing',
          pendingCount: remainingPending,
          lastSyncedAt: new Date().toISOString(),
          lastError: undefined,
        };
        this.notify();
        return { synced: pending.length, failed: 0 };
      } else {
        throw new Error(res.error || 'Batch sync was not successful');
      }
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : 'Sync failed';
      const isTypeError = err instanceof TypeError;
      const isApiError = err instanceof ApiError;

      const isNetworkError =
        !this.isOnlineInternal ||
        isTypeError ||
        errMessage.includes('fetch') ||
        errMessage.includes('NetworkError');

      const isDailyLimit = isApiError && (err.code === 'DAILY_LIMIT_EXCEEDED' || err.status === 403);

      for (const item of pending) {
        markAttemptStatus(
          this.playerId,
          item.id,
          'failed',
          errMessage,
          this.storage
        );
      }

      const remainingPending = getPendingQueue(this.playerId, this.storage).length;
      this.state = {
        status: isNetworkError ? 'offline' : 'error',
        pendingCount: remainingPending,
        lastError: isDailyLimit
          ? 'Daily arrow limit (50) reached on server'
          : errMessage,
      };
      this.notify();
      return { synced: 0, failed: pending.length };
    }
  }

  getAllQueue(): QueuedAttempt[] {
    return loadQueue(this.playerId, this.storage);
  }
}
