import type { SessionStorageAdapter } from '@math-archer/learning-engine';
import { MathArcherApiClient, ApiError } from '../api/client';

export const PIN_QUEUE_STORAGE_KEY = 'math_archer_parent_pin_sync_queue';

export interface QueuedPinChange {
  newPin: string;
  currentPin?: string;
  queuedAt: string;
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

export function getPinQueueStorageKey(): string {
  return PIN_QUEUE_STORAGE_KEY;
}

export function loadQueuedPinChange(storage?: SessionStorageAdapter): QueuedPinChange | null {
  const s = getStorage(storage);
  const data = s.getItem(PIN_QUEUE_STORAGE_KEY);
  if (!data) return null;
  try {
    const parsed = JSON.parse(data);
    if (parsed && typeof parsed.newPin === 'string' && /^\d{4}$/.test(parsed.newPin)) {
      return parsed as QueuedPinChange;
    }
    return null;
  } catch {
    return null;
  }
}

export function enqueuePinChange(
  item: { newPin: string; currentPin?: string },
  storage?: SessionStorageAdapter
): QueuedPinChange {
  const s = getStorage(storage);
  const queued: QueuedPinChange = {
    newPin: item.newPin,
    currentPin: item.currentPin,
    queuedAt: new Date().toISOString(),
  };
  s.setItem(PIN_QUEUE_STORAGE_KEY, JSON.stringify(queued));
  return queued;
}

export function clearQueuedPinChange(storage?: SessionStorageAdapter): void {
  const s = getStorage(storage);
  s.removeItem(PIN_QUEUE_STORAGE_KEY);
}

export async function flushQueuedPinChange(
  apiClient: MathArcherApiClient,
  options?: { parentId?: string; storage?: SessionStorageAdapter }
): Promise<{ success: boolean; error?: string }> {
  const queued = loadQueuedPinChange(options?.storage);
  if (!queued) {
    return { success: true };
  }

  // Check if browser is currently offline
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { success: false, error: 'Device is offline' };
  }

  try {
    await apiClient.changeParentPin({
      newPin: queued.newPin,
      currentPin: queued.currentPin,
    });
    clearQueuedPinChange(options?.storage);
    return { success: true };
  } catch (err: unknown) {
    // If unauthorized, attempt re-authenticating parent via current PIN if known
    if (err instanceof ApiError && err.status === 401 && queued.currentPin) {
      try {
        const verifyRes = await apiClient.verifyParentPin(queued.currentPin, options?.parentId);
        if (verifyRes.valid && verifyRes.token) {
          apiClient.setAuthToken(verifyRes.token);
          await apiClient.changeParentPin({
            newPin: queued.newPin,
            currentPin: queued.currentPin,
          });
          clearQueuedPinChange(options?.storage);
          return { success: true };
        }
      } catch {
        // Verification failed, keep in queue
      }
    }

    // Permanent rejection from server (e.g. invalid format or PIN permanently incorrect)
    if (err instanceof ApiError && (err.status === 400 || err.status === 404)) {
      clearQueuedPinChange(options?.storage);
      return { success: false, error: err.message };
    }

    // Network / transient failure: keep in queue for subsequent retry
    const message = err instanceof Error ? err.message : 'Failed to sync PIN';
    return { success: false, error: message };
  }
}
