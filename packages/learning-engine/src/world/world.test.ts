import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAllWorldAreas,
  getWorldArea,
  computeUnlockedAreas,
  isAreaUnlocked,
  getNextLockableArea,
  checkNewAreaUnlocked,
  loadWorldProgression,
  saveActiveArea,
} from './index';
import type { SessionStorageAdapter } from '../session/types';

function createMockStorage(): SessionStorageAdapter {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  };
}

describe('Task 9.3 — World Progression Engine', () => {
  let mockStorage: SessionStorageAdapter;

  beforeEach(() => {
    mockStorage = createMockStorage();
  });

  it('defines the small 5-area world: Castle, Fire, Ice, Wind, Earth', () => {
    const areas = getAllWorldAreas();
    expect(areas).toHaveLength(5);

    const ids = areas.map((a) => a.id);
    expect(ids).toEqual(['castle', 'fire_area', 'ice_area', 'wind_area', 'earth_area']);

    // Check specific area properties
    const castle = getWorldArea('castle');
    expect(castle.name).toBe('Castle Courtyard');
    expect(castle.icon).toBe('🏰');
    expect(castle.sessionsRequired).toBe(0);

    const fire = getWorldArea('fire_area');
    expect(fire.name).toBe('Fire Village');
    expect(fire.icon).toBe('🔥');
    expect(fire.element).toBe('fire');
    expect(fire.sessionsRequired).toBe(1);

    const ice = getWorldArea('ice_area');
    expect(ice.name).toBe('Ice Kingdom');
    expect(ice.icon).toBe('❄️');
    expect(ice.element).toBe('ice');
    expect(ice.sessionsRequired).toBe(2);

    const wind = getWorldArea('wind_area');
    expect(wind.name).toBe('Wind Temple');
    expect(wind.icon).toBe('💨');
    expect(wind.element).toBe('wind');
    expect(wind.sessionsRequired).toBe(3);

    const earth = getWorldArea('earth_area');
    expect(earth.name).toBe('Earth Mountain');
    expect(earth.icon).toBe('🪨');
    expect(earth.element).toBe('earth');
    expect(earth.sessionsRequired).toBe(4);
  });

  it('unlocks Castle at 0 completed sessions', () => {
    const unlocked = computeUnlockedAreas(0);
    expect(unlocked).toEqual(['castle']);
    expect(isAreaUnlocked('castle', 0)).toBe(true);
    expect(isAreaUnlocked('fire_area', 0)).toBe(false);
    expect(isAreaUnlocked('ice_area', 0)).toBe(false);
  });

  it('unlocks Fire Village after 1 completed session', () => {
    const unlocked = computeUnlockedAreas(1);
    expect(unlocked).toEqual(['castle', 'fire_area']);
    expect(isAreaUnlocked('fire_area', 1)).toBe(true);
    expect(isAreaUnlocked('ice_area', 1)).toBe(false);
  });

  it('unlocks Ice Kingdom after 2 completed sessions', () => {
    const unlocked = computeUnlockedAreas(2);
    expect(unlocked).toEqual(['castle', 'fire_area', 'ice_area']);
    expect(isAreaUnlocked('ice_area', 2)).toBe(true);
    expect(isAreaUnlocked('wind_area', 2)).toBe(false);
  });

  it('unlocks Wind Temple after 3 completed sessions', () => {
    const unlocked = computeUnlockedAreas(3);
    expect(unlocked).toEqual(['castle', 'fire_area', 'ice_area', 'wind_area']);
    expect(isAreaUnlocked('wind_area', 3)).toBe(true);
    expect(isAreaUnlocked('earth_area', 3)).toBe(false);
  });

  it('unlocks Earth Mountain after 4 completed sessions', () => {
    const unlocked = computeUnlockedAreas(4);
    expect(unlocked).toEqual(['castle', 'fire_area', 'ice_area', 'wind_area', 'earth_area']);
    expect(isAreaUnlocked('earth_area', 4)).toBe(true);
  });

  it('provides next lockable area and remaining session count', () => {
    const next0 = getNextLockableArea(0);
    expect(next0).not.toBeNull();
    expect(next0?.area.id).toBe('fire_area');
    expect(next0?.sessionsRemaining).toBe(1);

    const next1 = getNextLockableArea(1);
    expect(next1?.area.id).toBe('ice_area');
    expect(next1?.sessionsRemaining).toBe(1);

    const next4 = getNextLockableArea(4);
    expect(next4).toBeNull(); // All unlocked!
  });

  it('detects newly unlocked area upon session completion', () => {
    // Going from 0 to 1 session unlocks fire_area
    const newArea1 = checkNewAreaUnlocked(0, 1);
    expect(newArea1?.id).toBe('fire_area');

    // Going from 1 to 2 sessions unlocks ice_area
    const newArea2 = checkNewAreaUnlocked(1, 2);
    expect(newArea2?.id).toBe('ice_area');

    // No unlock if session count didn't increase or no new threshold reached
    expect(checkNewAreaUnlocked(1, 1)).toBeNull();
    expect(checkNewAreaUnlocked(5, 6)).toBeNull();
  });

  it('loads and saves active area with persistence and validation', () => {
    // Fresh player with 0 completed sessions
    const state0 = loadWorldProgression('player-test', mockStorage, 0);
    expect(state0.completedSessionsCount).toBe(0);
    expect(state0.unlockedAreaIds).toEqual(['castle']);
    expect(state0.activeAreaId).toBe('castle');

    // Attempting to select a locked area falls back to castle
    const savedLocked = saveActiveArea('player-test', 'ice_area', mockStorage, 0);
    expect(savedLocked.activeAreaId).toBe('castle');

    // With 2 sessions completed, ice_area is unlocked and can be saved
    const savedIce = saveActiveArea('player-test', 'ice_area', mockStorage, 2);
    expect(savedIce.activeAreaId).toBe('ice_area');

    // Subsequent load preserves ice_area
    const loaded = loadWorldProgression('player-test', mockStorage, 2);
    expect(loaded.activeAreaId).toBe('ice_area');
  });
});
