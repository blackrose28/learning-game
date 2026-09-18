import type { SessionStorageAdapter } from '../session/types';
import { getDefaultStorage } from '../session/storage';
import { loadAllSessions } from '../session/dailySession';
import type { WorldArea, WorldAreaId, WorldProgressionState } from './types';

export const WORLD_AREAS: readonly WorldArea[] = [
  {
    id: 'castle',
    name: 'Castle Courtyard',
    shortName: 'Castle',
    icon: '🏰',
    sessionsRequired: 0,
    title: 'Royal Archery Grounds',
    description:
      'The ancestral training courtyard of the kingdom archers with stone parapets and royal targets.',
    pedagogicalFocus: 'Foundational Archery Training',
    theme: {
      primaryColor: '#2563eb',
      secondaryColor: '#1d4ed8',
      bgColor: '#f8fafc',
      accentColor: '#3b82f6',
      skyGradient: 'linear-gradient(180deg, #60a5fa 0%, #bfdbfe 100%)',
      groundGradient: 'linear-gradient(180deg, #4ade80 0%, #16a34a 100%)',
      particleType: 'none',
    },
  },
  {
    id: 'fire_area',
    name: 'Fire Village',
    shortName: 'Fire Area',
    icon: '🔥',
    element: 'fire',
    sessionsRequired: 1,
    title: 'Scorched Hearth & Ember Ridge',
    description:
      'A volcanic valley where glowing embers swirl and archers forge snappy, thermal addition precision.',
    pedagogicalFocus: 'Mastery of Addition & Speedy Recall',
    theme: {
      primaryColor: '#ea580c',
      secondaryColor: '#c2410c',
      bgColor: '#fff7ed',
      accentColor: '#f97316',
      skyGradient: 'linear-gradient(180deg, #f97316 0%, #fed7aa 100%)',
      groundGradient: 'linear-gradient(180deg, #78350f 0%, #451a03 100%)',
      particleType: 'ember',
    },
  },
  {
    id: 'ice_area',
    name: 'Ice Kingdom',
    shortName: 'Ice Area',
    icon: '❄️',
    element: 'ice',
    sessionsRequired: 2,
    title: 'Frosted Glade & Glacial Spires',
    description:
      'A glistening realm of crystalline ice where cool focus sharpens subtraction accuracy.',
    pedagogicalFocus: 'Mastery of Subtraction & Inverse Operations',
    theme: {
      primaryColor: '#0284c7',
      secondaryColor: '#0369a1',
      bgColor: '#f0f9ff',
      accentColor: '#38bdf8',
      skyGradient: 'linear-gradient(180deg, #38bdf8 0%, #e0f2fe 100%)',
      groundGradient: 'linear-gradient(180deg, #bae6fd 0%, #7dd3fc 100%)',
      particleType: 'snowflake',
    },
  },
  {
    id: 'wind_area',
    name: 'Wind Temple',
    shortName: 'Wind Area',
    icon: '💨',
    element: 'wind',
    sessionsRequired: 3,
    title: 'Zephyr Plateau & Sky Sanctuary',
    description:
      'High atop breezy sky cliffs, archers master shifting currents and mixed problem challenges.',
    pedagogicalFocus: 'Mixed Operations & Rapid Fluency',
    theme: {
      primaryColor: '#059669',
      secondaryColor: '#047857',
      bgColor: '#ecfdf5',
      accentColor: '#10b981',
      skyGradient: 'linear-gradient(180deg, #2dd4bf 0%, #ccfbf1 100%)',
      groundGradient: 'linear-gradient(180deg, #a7f3d0 0%, #34d399 100%)',
      particleType: 'leaf_zephyr',
    },
  },
  {
    id: 'earth_area',
    name: 'Earth Mountain',
    shortName: 'Earth Area',
    icon: '🪨',
    element: 'earth',
    sessionsRequired: 4,
    title: 'Stone Bastion & Canyon Peaks',
    description:
      'Mighty granite monoliths and seismic crags where the most determined archers conquer challenge math.',
    pedagogicalFocus: 'Advanced Challenge & Deep Problem Solving',
    theme: {
      primaryColor: '#d97706',
      secondaryColor: '#b45309',
      bgColor: '#fefce8',
      accentColor: '#f59e0b',
      skyGradient: 'linear-gradient(180deg, #fbbf24 0%, #fef3c7 100%)',
      groundGradient: 'linear-gradient(180deg, #78350f 0%, #451a03 100%)',
      particleType: 'dust_rubble',
    },
  },
];

const AREA_BY_ID = new Map<WorldAreaId, WorldArea>(WORLD_AREAS.map((a) => [a.id, a]));

export const WORLD_ACTIVE_AREA_PREFIX = 'math_archer_active_area_';
export const WORLD_ACTIVE_AREA_UPDATED_AT_PREFIX = 'math_archer_active_area_updated_at_';
export const WORLD_COMPLETED_SESSIONS_PREFIX = 'math_archer_world_completed_sessions_';

export function getWorldActiveAreaKey(playerId: string = 'player-local'): string {
  return `${WORLD_ACTIVE_AREA_PREFIX}${playerId}`;
}

export function getWorldActiveAreaUpdatedAtKey(playerId: string = 'player-local'): string {
  return `${WORLD_ACTIVE_AREA_UPDATED_AT_PREFIX}${playerId}`;
}

export function getWorldCompletedSessionsKey(playerId: string = 'player-local'): string {
  return `${WORLD_COMPLETED_SESSIONS_PREFIX}${playerId}`;
}



export function getAllWorldAreas(): readonly WorldArea[] {
  return WORLD_AREAS;
}

export function getWorldArea(id: WorldAreaId): WorldArea {
  const area = AREA_BY_ID.get(id);
  if (!area) {
    return WORLD_AREAS[0]; // Fallback to Castle
  }
  return area;
}

/**
 * Computes all unlocked area IDs given a number of completed sessions.
 */
export function computeUnlockedAreas(completedSessionsCount: number): WorldAreaId[] {
  return WORLD_AREAS.filter((a) => completedSessionsCount >= a.sessionsRequired).map((a) => a.id);
}

/**
 * Checks whether a specific area is unlocked for a given completed sessions count.
 */
export function isAreaUnlocked(areaId: WorldAreaId, completedSessionsCount: number): boolean {
  const area = getWorldArea(areaId);
  return completedSessionsCount >= area.sessionsRequired;
}

/**
 * Returns the next locked area and how many more completed sessions are required to unlock it.
 */
export function getNextLockableArea(completedSessionsCount: number): {
  area: WorldArea;
  sessionsRemaining: number;
} | null {
  for (const area of WORLD_AREAS) {
    if (completedSessionsCount < area.sessionsRequired) {
      return {
        area,
        sessionsRemaining: area.sessionsRequired - completedSessionsCount,
      };
    }
  }
  return null;
}

/**
 * Checks if a session completion just unlocked a new world area.
 * Returns the newly unlocked area, or null if no new area was unlocked.
 */
export function checkNewAreaUnlocked(
  previousSessionsCount: number,
  currentSessionsCount: number
): WorldArea | null {
  if (currentSessionsCount <= previousSessionsCount) return null;

  for (const area of WORLD_AREAS) {
    if (
      previousSessionsCount < area.sessionsRequired &&
      currentSessionsCount >= area.sessionsRequired
    ) {
      return area;
    }
  }
  return null;
}

/**
 * Counts how many completed sessions a player has in storage.
 */
export function getCompletedSessionsCount(
  playerId: string = 'player-local',
  storage: SessionStorageAdapter = getDefaultStorage()
): number {
  const allSessions = loadAllSessions(playerId, storage);
  return allSessions.filter((s) => s.status === 'completed' || s.arrowsUsed >= s.arrowsAllowed)
    .length;
}

/**
 * Loads the complete world progression state for a player from storage.
 */
export function loadWorldProgression(
  playerId: string = 'player-local',
  storage: SessionStorageAdapter = getDefaultStorage(),
  explicitCompletedSessionsCount?: number
): WorldProgressionState {
  const storedCountRaw = storage.getItem(getWorldCompletedSessionsKey(playerId));
  const storedCount = storedCountRaw !== null ? parseInt(storedCountRaw, 10) : 0;
  const sessionCountFromHistory = getCompletedSessionsCount(playerId, storage);

  const completedSessionsCount =
    explicitCompletedSessionsCount !== undefined
      ? explicitCompletedSessionsCount
      : Math.max(sessionCountFromHistory, Number.isFinite(storedCount) ? storedCount : 0);

  const unlockedAreaIds = computeUnlockedAreas(completedSessionsCount);

  const activeKey = getWorldActiveAreaKey(playerId);
  const rawActive = storage.getItem(activeKey);

  let activeAreaId: WorldAreaId = 'castle';
  if (rawActive && unlockedAreaIds.includes(rawActive as WorldAreaId)) {
    activeAreaId = rawActive as WorldAreaId;
  } else {
    activeAreaId = 'castle';
  }

  // Find the last unlocked area
  const lastUnlockedAreaId = unlockedAreaIds[unlockedAreaIds.length - 1] ?? 'castle';

  const updatedAtKey = getWorldActiveAreaUpdatedAtKey(playerId);
  const rawUpdatedAt = storage.getItem(updatedAtKey) ?? undefined;

  return {
    playerId,
    completedSessionsCount,
    unlockedAreaIds,
    activeAreaId,
    lastUnlockedAreaId,
    ...(rawUpdatedAt ? { updatedAt: rawUpdatedAt } : {}),
  };
}

/**
 * Persists the active area for a player, provided the area is unlocked.
 */
export function saveActiveArea(
  playerId: string = 'player-local',
  areaId: WorldAreaId,
  storage: SessionStorageAdapter = getDefaultStorage(),
  explicitCompletedSessionsCount?: number,
  updatedAt?: string
): WorldProgressionState {
  const sessionCountFromHistory = getCompletedSessionsCount(playerId, storage);
  const existingStoredRaw = storage.getItem(getWorldCompletedSessionsKey(playerId));
  const existingStored = existingStoredRaw !== null ? parseInt(existingStoredRaw, 10) : 0;
  const baseCount = Math.max(
    sessionCountFromHistory,
    Number.isFinite(existingStored) ? existingStored : 0
  );

  const completedCount =
    explicitCompletedSessionsCount !== undefined
      ? explicitCompletedSessionsCount
      : baseCount;

  const highestCount = Math.max(baseCount, completedCount);
  storage.setItem(getWorldCompletedSessionsKey(playerId), String(highestCount));

  const unlocked = computeUnlockedAreas(highestCount);
  const validAreaId = unlocked.includes(areaId) ? areaId : 'castle';

  const key = getWorldActiveAreaKey(playerId);
  storage.setItem(key, validAreaId);

  const finalUpdatedAt = updatedAt ?? new Date().toISOString();
  storage.setItem(getWorldActiveAreaUpdatedAtKey(playerId), finalUpdatedAt);

  return loadWorldProgression(playerId, storage, highestCount);
}


