import { describe, it, expect } from 'vitest';
import {
  awardAttemptRewards,
  createDefaultRewardsState,
  getCharacterCosmetic,
  getCosmeticsByCategory,
  loadPlayerRewards,
  savePlayerRewards,
  switchCharacter,
  type SessionStorageAdapter,
} from './index';

describe('Gunner and Warrior rewards', () => {
  it.each(['gunner', 'warrior'] as const)(
    'persists %s and awards only its own attack achievements once',
    (character) => {
      const values = new Map<string, string>();
      const storage: SessionStorageAdapter = {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => {
          values.set(key, value);
        },
        removeItem: (key) => {
          values.delete(key);
        },
      };
      let state = switchCharacter(createDefaultRewardsState('new-hero'), character);
      savePlayerRewards(state, storage);
      state = loadPlayerRewards('new-hero', storage);
      expect(state.equippedCosmetics.character).toBe(character);
      expect(state.levelTitle).toContain(character === 'gunner' ? 'Gunner' : 'Warrior');
      for (let i = 0; i < 50; i++)
        state = awardAttemptRewards(state, { isCorrect: true }).nextState;
      expect(state.unlockedAchievementIds).toContain(
        character === 'gunner' ? 'ach_first_bullet' : 'ach_first_axe'
      );
      expect(state.unlockedAchievementIds).toContain(
        character === 'gunner' ? 'ach_bullets_50' : 'ach_axes_50'
      );
      expect(state.unlockedAchievementIds).not.toContain('ach_first_arrow');
      expect(state.unlockedAchievementIds).not.toContain('ach_first_spell');
      expect(awardAttemptRewards(state, { isCorrect: true }).newAchievements).toEqual([]);
      savePlayerRewards(state, storage);
      expect(
        loadPlayerRewards('new-hero', storage).achievementProgress[
          character === 'gunner' ? 'bullets_fired' : 'axes_thrown'
        ]
      ).toBe(50);
    }
  );
  it.each(['gunner', 'warrior'] as const)(
    'provides %s equipment for every weapon unlock',
    (character) => {
      for (const item of getCosmeticsByCategory('bow'))
        expect(getCharacterCosmetic(item, character).name).toContain(
          character === 'gunner' ? 'Shotgun' : 'Axe'
        );
    }
  );
});
