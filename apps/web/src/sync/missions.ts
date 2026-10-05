import {
  compareMissionAttempts,
  computeReasoningProgress,
  getDefaultStorage,
  restoreMissionAttempt,
  type MissionAttempt,
  type StoredMissionAttempt,
  type SessionStorageAdapter,
} from '@math-archer/learning-engine';
import { ApiError, MathArcherApiClient, validateStoredMissionAttempt } from '../api/client';

export interface MissionSyncItem {
  local: MissionAttempt;
  server?: StoredMissionAttempt;
  pending: boolean;
  conflict: boolean;
  error?: string;
}

export interface MissionWorkspace {
  schemaVersion: 1;
  playerId: string;
  items: MissionSyncItem[];
  recovery: { local: MissionAttempt; server: StoredMissionAttempt }[];
}

export interface MissionSyncResult {
  status: 'synced' | 'pending' | 'offline' | 'unsupported' | 'error' | 'conflict';
  pendingCount: number;
  conflictCount: number;
  error?: string;
}

export function getMissionWorkspaceKey(playerId: string): string {
  return `math_archer_mission_workspace_v1:${encodeURIComponent(playerId)}`;
}

export function loadMissionWorkspace(
  playerId: string,
  storage: SessionStorageAdapter = getDefaultStorage()
): MissionWorkspace {
  const raw = storage.getItem(getMissionWorkspaceKey(playerId));
  if (raw === null) return { schemaVersion: 1, playerId, items: [], recovery: [] };
  const value = JSON.parse(raw) as MissionWorkspace;
  if (
    value?.schemaVersion !== 1 ||
    value.playerId !== playerId ||
    !Array.isArray(value.items) ||
    !Array.isArray(value.recovery)
  ) {
    throw new Error('Unsupported reasoning workspace; saved data was preserved');
  }
  const ids = new Set<string>();
  for (const item of value.items) {
    item.local = restoreMissionAttempt(item.local);
    if (
      item.local.playerId !== playerId ||
      ids.has(item.local.id) ||
      typeof item.pending !== 'boolean' ||
      typeof item.conflict !== 'boolean'
    ) {
      throw new Error('Invalid reasoning workspace identity or queue');
    }
    ids.add(item.local.id);
    if (item.server) {
      item.server = validateStoredMissionAttempt(item.server, playerId);
      if (item.server.attempt.id !== item.local.id)
        throw new Error('Reasoning workspace server identity mismatch');
    }
    if (item.conflict && !item.server)
      throw new Error('Reasoning conflict is missing cloud evidence');
  }
  for (const archived of value.recovery) {
    archived.local = restoreMissionAttempt(archived.local);
    archived.server = validateStoredMissionAttempt(archived.server, playerId);
    if (archived.local.playerId !== playerId || archived.local.id !== archived.server.attempt.id)
      throw new Error('Invalid reasoning recovery identity');
  }
  return value;
}

function saveWorkspace(value: MissionWorkspace, storage: SessionStorageAdapter): void {
  // One write durably stores queue, current work, and recovery branches together.
  storage.setItem(getMissionWorkspaceKey(value.playerId), JSON.stringify(value));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('math-archer-reasoning-change', { detail: value.playerId })
    );
  }
}

/** Drops this child's whole local reasoning history, including conflicts and unreadable data. */
export function resetMissionWorkspace(
  playerId: string,
  storage: SessionStorageAdapter = getDefaultStorage()
): void {
  storage.removeItem(getMissionWorkspaceKey(playerId));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('math-archer-reasoning-change', { detail: playerId }));
  }
}

export function queueMissionAttempt(
  attempt: MissionAttempt,
  storage: SessionStorageAdapter = getDefaultStorage()
): void {
  const local = restoreMissionAttempt(attempt);
  const workspace = loadMissionWorkspace(local.playerId, storage);
  const item = workspace.items.find((item) => item.local.id === local.id);
  if (!item) workspace.items.push({ local, pending: true, conflict: false });
  else {
    const comparison = compareMissionAttempts(local, item.local);
    if (comparison === 'conflict')
      throw new Error('Conflicting local mission history; saved data was preserved');
    if (comparison === 'advance') {
      item.local = local;
      item.pending = true;
      item.error = undefined;
    }
  }
  saveWorkspace(workspace, storage);
}

function mergeCloud(workspace: MissionWorkspace, server: StoredMissionAttempt): void {
  const item = workspace.items.find((item) => item.local.id === server.attempt.id);
  if (!item) {
    workspace.items.push({ local: server.attempt, server, pending: false, conflict: false });
    return;
  }
  if (item.server && server.revision < item.server.revision) return;
  const comparison = compareMissionAttempts(server.attempt, item.local);
  item.server = server;
  item.error = undefined;
  if (comparison === 'conflict') {
    item.conflict = true;
    item.pending = true;
  } else if (!item.conflict) {
    if (comparison === 'advance') item.local = server.attempt;
    item.pending = comparison === 'stale';
  }
}

/** Explicit parent recovery. The replaced local history remains in the recovery archive. */
export function useCloudMissionHistory(
  playerId: string,
  attemptId: string,
  storage: SessionStorageAdapter = getDefaultStorage()
): void {
  const workspace = loadMissionWorkspace(playerId, storage);
  const item = workspace.items.find((item) => item.local.id === attemptId);
  if (!item?.conflict || !item.server) throw new Error('No cloud conflict to resolve');
  workspace.recovery.push({ local: item.local, server: item.server });
  item.local = item.server.attempt;
  item.conflict = false;
  item.pending = false;
  item.error = undefined;
  saveWorkspace(workspace, storage);
}

/** Conflicting local branches stay archived/visible, but cloud history supplies progress counts. */
export function loadReasoningProgress(
  playerId: string,
  storage: SessionStorageAdapter = getDefaultStorage()
) {
  const workspace = loadMissionWorkspace(playerId, storage);
  return computeReasoningProgress(
    playerId,
    workspace.items.map((item) => (item.conflict && item.server ? item.server.attempt : item.local))
  );
}

export function getResumableMission(
  playerId: string,
  storage: SessionStorageAdapter = getDefaultStorage()
): MissionAttempt | null {
  return (
    loadMissionWorkspace(playerId, storage)
      .items.filter((item) => !item.conflict && !item.local.completedAt)
      .sort(
        (a, b) =>
          b.local.startedAt.localeCompare(a.local.startedAt) || b.local.id.localeCompare(a.local.id)
      )[0]?.local ?? null
  );
}

const flights = new WeakMap<MathArcherApiClient, Map<string, Promise<MissionSyncResult>>>();

/** Single-flight per client/child; re-read durable state after every await to retain newer work. */
export function syncMissionAttempts(
  playerId: string,
  api: MathArcherApiClient,
  storage: SessionStorageAdapter = getDefaultStorage()
): Promise<MissionSyncResult> {
  let running = flights.get(api);
  if (!running) {
    running = new Map();
    flights.set(api, running);
  }
  const existing = running.get(playerId);
  if (existing) return existing;
  const promise = synchronize(playerId, api, storage).finally(() => running!.delete(playerId));
  running.set(playerId, promise);
  return promise;
}

async function synchronize(
  playerId: string,
  api: MathArcherApiClient,
  storage: SessionStorageAdapter
): Promise<MissionSyncResult> {
  const result = (status: MissionSyncResult['status'], error?: string): MissionSyncResult => {
    const workspace = loadMissionWorkspace(playerId, storage);
    return {
      status,
      pendingCount: workspace.items.filter((item) => item.pending).length,
      conflictCount: workspace.items.filter((item) => item.conflict).length,
      ...(error ? { error } : {}),
    };
  };
  try {
    loadMissionWorkspace(playerId, storage);
    if (!api.getAuthToken()) return result('error', 'Sign in to sync reasoning progress.');
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return result('offline');
    // Listing is the version-support probe. An older API must receive no mission writes.
    const downloaded: StoredMissionAttempt[] = [];
    let cursor: { startedAt: string; attemptId: string } | undefined;
    const cursors = new Set<string>();
    do {
      const page = await api.listMissionAttempts(playerId, cursor);
      downloaded.push(...page.attempts.map((item) => validateStoredMissionAttempt(item, playerId)));
      cursor = page.nextCursor ?? undefined;
      if (cursor) {
        const key = JSON.stringify(cursor);
        if (cursors.has(key)) throw new Error('Mission listing repeated its cursor');
        cursors.add(key);
      }
    } while (cursor);
    const workspace = loadMissionWorkspace(playerId, storage);
    for (const saved of downloaded) mergeCloud(workspace, saved);
    saveWorkspace(workspace, storage);

    for (let round = 0; round < 5; round++) {
      const pendingIds = loadMissionWorkspace(playerId, storage)
        .items.filter((item) => item.pending && !item.conflict)
        .map((item) => item.local.id);
      if (pendingIds.length === 0) break;
      for (const id of pendingIds) {
        const latest = loadMissionWorkspace(playerId, storage).items.find(
          (item) => item.local.id === id
        )!;
        if (!latest.pending || latest.conflict) continue;
        try {
          const saved = await api.saveMissionAttempt(latest.local);
          const current = loadMissionWorkspace(playerId, storage);
          mergeCloud(current, validateStoredMissionAttempt(saved, playerId));
          saveWorkspace(current, storage);
        } catch (error) {
          const current = loadMissionWorkspace(playerId, storage);
          const item = current.items.find((item) => item.local.id === id)!;
          if (error instanceof ApiError && error.code === 'MISSION_CONFLICT') {
            const server = validateStoredMissionAttempt(error.details, playerId);
            if (server.attempt.id !== id) throw new Error('Mission conflict identity mismatch');
            mergeCloud(current, server);
            if (!item.conflict) throw new Error('Invalid mission conflict response');
            saveWorkspace(current, storage);
            continue;
          }
          item.error = error instanceof Error ? error.message : 'Reasoning sync failed';
          saveWorkspace(current, storage);
          throw error;
        }
      }
    }
    const state = result('synced');
    return state.conflictCount
      ? { ...state, status: 'conflict' }
      : state.pendingCount
        ? { ...state, status: 'pending' }
        : state;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Reasoning sync failed';
    const unsupported =
      error instanceof ApiError &&
      (error.status === 404 ||
        error.status === 405 ||
        error.code === 'UNSUPPORTED_MISSION_VERSION');
    // Corrupt workspace versions remain intact, including when they cannot be summarized.
    try {
      return result(
        unsupported ? 'unsupported' : error instanceof TypeError ? 'offline' : 'error',
        message
      );
    } catch {
      return { status: 'error', pendingCount: 0, conflictCount: 0, error: message };
    }
  }
}
