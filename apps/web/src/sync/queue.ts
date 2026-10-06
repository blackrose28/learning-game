import type { Attempt, SessionStorageAdapter } from '@math-archer/learning-engine';

export interface QueuedAttempt {
  id: string;
  attempt: Attempt;
  /** `rejected`: the server refused it for good (e.g. daily limit); never retried. */
  status: 'pending' | 'syncing' | 'synced' | 'failed' | 'rejected';
  queuedAt: string;
  retryCount: number;
  error?: string;
}

function getStorage(customStorage?: SessionStorageAdapter): SessionStorageAdapter {
  if (customStorage) return customStorage;
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  const mem = new Map<string, string>();
  return {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => mem.set(k, v),
    removeItem: (k: string) => mem.delete(k),
  };
}

export function getQueueStorageKey(playerId: string): string {
  return `math_archer_sync_queue_${playerId}`;
}

export function loadQueue(playerId: string, storage?: SessionStorageAdapter): QueuedAttempt[] {
  const s = getStorage(storage);
  const data = s.getItem(getQueueStorageKey(playerId));
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveQueue(
  playerId: string,
  items: QueuedAttempt[],
  storage?: SessionStorageAdapter
): void {
  const s = getStorage(storage);
  s.setItem(getQueueStorageKey(playerId), JSON.stringify(items));
}

export function enqueueAttempt(
  playerId: string,
  attempt: Attempt,
  storage?: SessionStorageAdapter
): QueuedAttempt {
  const queue = loadQueue(playerId, storage);
  const queuedItem: QueuedAttempt = {
    id: `queue_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    attempt,
    status: 'pending',
    queuedAt: new Date().toISOString(),
    retryCount: 0,
  };

  queue.push(queuedItem);
  saveQueue(playerId, queue, storage);
  return queuedItem;
}

export function getPendingQueue(
  playerId: string,
  storage?: SessionStorageAdapter
): QueuedAttempt[] {
  const queue = loadQueue(playerId, storage);
  return queue.filter((item) => item.status === 'pending' || item.status === 'failed');
}

export function markAttemptStatus(
  playerId: string,
  queueId: string,
  status: QueuedAttempt['status'],
  error?: string,
  storage?: SessionStorageAdapter
): void {
  const queue = loadQueue(playerId, storage);
  const item = queue.find((i) => i.id === queueId);
  if (item) {
    item.status = status;
    if (status === 'syncing') {
      item.retryCount += 1;
    }
    if (error) {
      item.error = error;
    }
    saveQueue(playerId, queue, storage);
  }
}

function markAttemptsResolved(
  playerId: string,
  queueIds: string[],
  status: 'synced' | 'rejected',
  error: string | undefined,
  storage?: SessionStorageAdapter
): void {
  const queue = loadQueue(playerId, storage);
  const set = new Set(queueIds);
  for (const item of queue) {
    if (set.has(item.id)) {
      item.status = status;
      item.error = error;
    }
  }
  saveQueue(playerId, queue, storage);
}

export function markAttemptsSynced(
  playerId: string,
  queueIds: string[],
  storage?: SessionStorageAdapter
): void {
  markAttemptsResolved(playerId, queueIds, 'synced', undefined, storage);
}

export function markAttemptsRejected(
  playerId: string,
  queueIds: string[],
  error: string,
  storage?: SessionStorageAdapter
): void {
  markAttemptsResolved(playerId, queueIds, 'rejected', error, storage);
}

export function clearQueue(playerId: string, storage?: SessionStorageAdapter): void {
  const s = getStorage(storage);
  s.removeItem(getQueueStorageKey(playerId));
}
