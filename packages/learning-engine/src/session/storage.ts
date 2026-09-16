import type { SessionStorageAdapter } from './types';

/**
 * Creates an in-memory storage adapter for testing and non-browser runtimes.
 */
export function createMemoryStorage(): SessionStorageAdapter {
  const store = new Map<string, string>();
  return {
    getItem(key: string): string | null {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string): void {
      store.set(key, String(value));
    },
    removeItem(key: string): void {
      store.delete(key);
    },
    clear(): void {
      store.clear();
    },
  };
}

let fallbackMemoryStorage: SessionStorageAdapter | null = null;

/**
 * Safely resolves the default storage adapter:
 * - Uses window.localStorage / globalThis.localStorage if available and working.
 * - Falls back to an in-memory storage adapter if localStorage throws or is absent.
 */
export function getDefaultStorage(): SessionStorageAdapter {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      // Test read/write to guard against private browsing mode quota exceptions
      const testKey = '__math_archer_test_storage__';
      globalThis.localStorage.setItem(testKey, '1');
      globalThis.localStorage.removeItem(testKey);
      return globalThis.localStorage;
    }
  } catch {
    // localStorage unavailable or restricted
  }

  if (!fallbackMemoryStorage) {
    fallbackMemoryStorage = createMemoryStorage();
  }
  return fallbackMemoryStorage;
}

/**
 * Returns the local date in 'YYYY-MM-DD' format.
 */
export function getTodayDateString(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Constructs the storage key for a player's daily session on a specific date.
 */
export function getSessionStorageKey(playerId: string, date: string): string {
  return `math_archer_session_${playerId}_${date}`;
}

