import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateLevel,
  isConsecutiveDay,
  createDefaultRewardsState,
  loadPlayerRewards,
  savePlayerRewards,
  awardAttemptRewards,
  awardSessionCompleteRewards,
  equipCosmetic,
  unlockAllRewards,
  COSMETIC_ITEMS,
  ACHIEVEMENTS,
  LEVEL_THRESHOLDS,
  getDefaultTomorrowReward,
} from './index';
import type { SessionStorageAdapter } from '../session/types';

class MemoryStorageAdapter implements SessionStorageAdapter {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

describe('Task 9.4 — Rewards Engine', () => {
  let storage: SessionStorageAdapter;

  beforeEach(() => {
    storage = new MemoryStorageAdapter();
  });

  describe('Level Progression & Thresholds', () => {
    it('calculates correct level and title for 0 XP', () => {
      const info = calculateLevel(0);
      expect(info.level).toBe(1);
      expect(info.title).toBe('Novice Archer');
      expect(info.levelProgressPct).toBe(0);
      expect(info.nextLevelXp).toBe(120);
    });

    it('calculates level progress percentage mid-tier', () => {
      // Level 1 is 0..120. 60 XP is 50%
      const info = calculateLevel(60);
      expect(info.level).toBe(1);
      expect(info.levelProgressPct).toBe(50);
      expect(info.nextLevelXp).toBe(120);
    });

    it('promotes to Level 2 Apprentice Bowman at 120 XP', () => {
      const info = calculateLevel(120);
      expect(info.level).toBe(2);
      expect(info.title).toBe('Apprentice Bowman');
      expect(info.levelProgressPct).toBe(0);
      expect(info.nextLevelXp).toBe(300);
    });

    it('promotes through higher levels with proper cap handling', () => {
      const lvl3 = calculateLevel(300);
      expect(lvl3.level).toBe(3);
      expect(lvl3.title).toBe('Ranger Scout');

      const lvl5 = calculateLevel(950);
      expect(lvl5.level).toBe(5);
      expect(lvl5.title).toBe('Royal Marksman');

      // Level 7 at 2500 XP progresses towards Level 8 (2750 XP)
      const lvl7Mid = calculateLevel(2500);
      expect(lvl7Mid.level).toBe(7);
      expect(lvl7Mid.title).toBe('Legendary Sharpshooter');
      expect(lvl7Mid.levelProgressPct).toBe(67);

      // Level 30 Max Cap (45,000 XP)
      const max = calculateLevel(50000);
      expect(max.level).toBe(30);
      expect(max.title).toBe('Divine Archon of Math');
      expect(max.levelProgressPct).toBe(100);
    });
  });

  describe('Consecutive Days & Streak Detection', () => {
    it('detects consecutive calendar days', () => {
      expect(isConsecutiveDay('2026-09-17', '2026-09-18')).toBe(true);
      expect(isConsecutiveDay('2026-09-30', '2026-10-01')).toBe(true);
      expect(isConsecutiveDay('2026-09-17', '2026-09-17')).toBe(false);
      expect(isConsecutiveDay('2026-09-15', '2026-09-17')).toBe(false);
    });
  });

  describe('Attempt Rewards & Anti-Frustration Rules', () => {
    it('awards base XP even on an incorrect attempt (effort is rewarded)', () => {
      const state = createDefaultRewardsState('p1');
      const result = awardAttemptRewards(state, {
        isCorrect: false,
      });

      // 10 base attempt + 25 First Flight achievement = 35 XP total
      expect(result.xpAwarded).toBe(35);
      expect(result.nextState.totalXp).toBe(35);
      expect(result.newAchievements.some((a) => a.id === 'ach_first_arrow')).toBe(true);
    });

    it('awards accuracy bonus on correct hit', () => {
      const state = createDefaultRewardsState('p1');
      state.unlockedAchievementIds.push('ach_first_arrow');

      const result = awardAttemptRewards(state, {
        isCorrect: true,
      });

      // 10 base + 5 hit bonus = 15 XP
      expect(result.xpAwarded).toBe(15);
      expect(result.nextState.totalXp).toBe(15);
    });

    it('awards resilience bonus when player tries again after a miss and succeeds', () => {
      const state = createDefaultRewardsState('p1');
      state.unlockedAchievementIds.push('ach_first_arrow');

      const result = awardAttemptRewards(state, {
        isCorrect: true,
        wasMissPreceding: true,
      });

      // 10 base + 5 hit + 5 resilience = 20 XP (+ 40 Grit achievement)
      expect(result.xpAwards.some((a) => a.reason === 'resilience')).toBe(true);
      expect(result.newAchievements.some((a) => a.id === 'ach_resilience')).toBe(true);
      expect(result.nextState.unlockedAchievementIds).toContain('ach_resilience');
    });

    it('awards Ten-Maker achievement when Make-10 question is answered correctly', () => {
      const state = createDefaultRewardsState('p1');
      state.unlockedAchievementIds.push('ach_first_arrow');

      const result = awardAttemptRewards(state, {
        isCorrect: true,
        isMake10: true,
      });

      expect(result.newAchievements.some((a) => a.id === 'ach_make_10_master')).toBe(true);
    });

    it('awards Bullseye Focus achievement after 5 consecutive hits', () => {
      const state = createDefaultRewardsState('p1');
      state.unlockedAchievementIds.push('ach_first_arrow');

      const result = awardAttemptRewards(state, {
        isCorrect: true,
        consecutiveHits: 5,
      });

      expect(result.newAchievements.some((a) => a.id === 'ach_streak_5')).toBe(true);
    });

    it('awards Elemental Adept achievement when all 4 elements have been shot', () => {
      let state = createDefaultRewardsState('p1');
      state.unlockedAchievementIds.push('ach_first_arrow');

      state = awardAttemptRewards(state, { isCorrect: true, element: 'fire' }).nextState;
      state = awardAttemptRewards(state, { isCorrect: true, element: 'ice' }).nextState;
      state = awardAttemptRewards(state, { isCorrect: true, element: 'wind' }).nextState;
      const res4 = awardAttemptRewards(state, { isCorrect: true, element: 'earth' });

      expect(res4.newAchievements.some((a) => a.id === 'ach_elements_all')).toBe(true);
    });

    it('detects level-up and unlocks level-based cosmetics', () => {
      const state = createDefaultRewardsState('p1');
      state.totalXp = 115; // 5 XP away from Level 2 (120 XP required)
      state.unlockedAchievementIds.push('ach_first_arrow');

      const result = awardAttemptRewards(state, {
        isCorrect: true, // +15 XP -> 130 XP -> Level 2!
      });

      expect(result.levelUp).toEqual({
        oldLevel: 1,
        newLevel: 2,
        newTitle: 'Apprentice Bowman',
      });
      expect(result.nextState.level).toBe(2);
      expect(result.nextState.unlockedCosmeticIds).toContain('outfit_ember_crimson');
      expect(result.newCosmetics.some((c) => c.id === 'outfit_ember_crimson')).toBe(true);
    });
  });

  describe('Session Complete Rewards & Reason to Return Tomorrow', () => {
    it('awards session completion bonus, Daily Archer achievement, and advances streak', () => {
      const state = createDefaultRewardsState('p1');

      const result = awardSessionCompleteRewards(state, {
        sessionDate: '2026-09-17',
        completedSessionsCount: 1,
      });

      // +100 session bonus + 100 Daily Archer achievement = 200 XP
      expect(result.xpAwarded).toBe(200);
      expect(result.nextState.currentStreak).toBe(1);
      expect(result.nextState.lastActiveDate).toBe('2026-09-17');
      expect(result.newAchievements.some((a) => a.id === 'ach_daily_champion')).toBe(true);
      // Unlocks Sunfire Ember Bow and Twinkling Stardust arrow effect for completing 1 session!
      expect(result.nextState.unlockedCosmeticIds).toContain('bow_ember_blaze');
      expect(result.nextState.unlockedCosmeticIds).toContain('arrow_effect_stardust');
    });

    it('detects returning tomorrow (consecutive day), increases streak and awards streak bonus', () => {
      let state = createDefaultRewardsState('p1');
      state = awardSessionCompleteRewards(state, {
        sessionDate: '2026-09-17',
        completedSessionsCount: 1,
      }).nextState;

      // Player returns tomorrow!
      const returnResult = awardSessionCompleteRewards(state, {
        sessionDate: '2026-09-18',
        completedSessionsCount: 2,
      });

      expect(returnResult.nextState.currentStreak).toBe(2);
      expect(returnResult.xpAwards.some((a) => a.reason === 'streak_bonus')).toBe(true);
      expect(returnResult.newAchievements.some((a) => a.id === 'ach_streak_return_2')).toBe(true);
      // 2-day streak unlocks Glacial Frost Cloak & Silver Pegasus Banners!
      expect(returnResult.nextState.unlockedCosmeticIds).toContain('outfit_frost_azure');
      expect(returnResult.nextState.unlockedCosmeticIds).toContain('castle_banner_pegasus');
    });

    it('generates a compelling Tomorrow Reward Preview card motivating the child to return', () => {
      const state = createDefaultRewardsState('p1');
      state.currentStreak = 1;

      const preview = getDefaultTomorrowReward(state.currentStreak);
      expect(preview.title).toContain('Glacial Frost Cloak');
      expect(preview.unlockCondition).toContain('2-Day Streak');
      expect(preview.reasonToReturn).toBeTruthy();
    });
  });

  describe('Equipping Cosmetics & State Persistence', () => {
    it('allows equipping unlocked cosmetics and preserves selection', () => {
      let state = createDefaultRewardsState('p1');
      // Unlock ember bow
      state.unlockedCosmeticIds.push('bow_ember_blaze');

      state = equipCosmetic(state, 'bow', 'bow_ember_blaze');
      expect(state.equippedCosmetics.bow).toBe('bow_ember_blaze');

      savePlayerRewards(state, storage);
      const loaded = loadPlayerRewards('p1', storage);

      expect(loaded.equippedCosmetics.bow).toBe('bow_ember_blaze');
      expect(loaded.unlockedCosmeticIds).toContain('bow_ember_blaze');
    });

    it('refuses to equip locked cosmetics', () => {
      const state = createDefaultRewardsState('p1');
      expect(state.unlockedCosmeticIds).not.toContain('bow_regal_gold');

      const attempt = equipCosmetic(state, 'bow', 'bow_regal_gold');
      // Equipping fails, stays default oak
      expect(attempt.equippedCosmetics.bow).toBe('bow_recurve_oak');
    });
  });

  describe('Level 1–30 Progression & Advanced Achievements', () => {
    it('awards century arrow achievement after 100 shots', () => {
      const state = createDefaultRewardsState('p1');
      state.achievementProgress['arrows_shot'] = 99;

      const result = awardAttemptRewards(state, { isCorrect: true });
      expect(result.newAchievements.some((a) => a.id === 'ach_arrows_100')).toBe(true);
      expect(result.nextState.unlockedAchievementIds).toContain('ach_arrows_100');
    });

    it('awards Make-10 Bridge Builder after 10 Make-10 problems', () => {
      const state = createDefaultRewardsState('p1');
      state.achievementProgress['make10_count'] = 9;

      const result = awardAttemptRewards(state, { isCorrect: true, isMake10: true });
      expect(result.newAchievements.some((a) => a.id === 'ach_make_10_veteran')).toBe(true);
    });

    it('awards Doubles Twin Strike after 10 doubles questions', () => {
      const state = createDefaultRewardsState('p1');
      state.achievementProgress['doubles_count'] = 9;

      const result = awardAttemptRewards(state, { isCorrect: true, isDoubles: true });
      expect(result.newAchievements.some((a) => a.id === 'ach_doubles_expert')).toBe(true);
    });

    it('awards Level 10 and Level 30 milestone achievements and unlocks high tier gear', () => {
      const state = createDefaultRewardsState('p1');
      state.totalXp = 44990; // 10 XP away from 45,000 (Level 30)

      const result = awardAttemptRewards(state, { isCorrect: true }); // +15 XP -> 45,005 XP -> Level 30!
      expect(result.nextState.level).toBe(30);
      expect(result.nextState.levelTitle).toBe('Divine Archon of Math');
      expect(result.newAchievements.some((a) => a.id === 'ach_level_30')).toBe(true);

      // Unlocks Divine Archon Regalia, Infinity Bow, Supernova Effect, and Mythic Castle Decos!
      expect(result.nextState.unlockedCosmeticIds).toContain('outfit_divine_archon');
      expect(result.nextState.unlockedCosmeticIds).toContain('bow_divine_infinity');
      expect(result.nextState.unlockedCosmeticIds).toContain('arrow_effect_celestial_supernova');
      expect(result.nextState.unlockedCosmeticIds).toContain('castle_statue_celestial_archon');
    });

    it('awards 7-day Week Warrior and 14-day Fortnight Knight streak achievements', () => {
      const state = createDefaultRewardsState('p1');
      state.currentStreak = 6;
      state.lastActiveDate = '2026-09-18';

      const result = awardSessionCompleteRewards(state, {
        sessionDate: '2026-09-19',
        completedSessionsCount: 7,
      });

      expect(result.nextState.currentStreak).toBe(7);
      expect(result.newAchievements.some((a) => a.id === 'ach_streak_return_7')).toBe(true);
    });

    it('awards Master of the Range for high accuracy (>=90%) 50-arrow session', () => {
      const state = createDefaultRewardsState('p1');
      const result = awardSessionCompleteRewards(state, {
        sessionDate: '2026-09-19',
        completedSessionsCount: 1,
        totalArrowsInSession: 50,
        hitsInSession: 48, // 96% accuracy
      });

      expect(result.newAchievements.some((a) => a.id === 'ach_perfect_session')).toBe(true);
    });
  });

  describe('unlockAllRewards (Dev / QA helper)', () => {
    it('unlocks all cosmetics, achievements, and sets max level in storage', () => {
      const state = unlockAllRewards('dev-tester', storage);

      // Verify all cosmetics are unlocked
      expect(state.unlockedCosmeticIds.length).toBe(COSMETIC_ITEMS.length);
      for (const cosmetic of COSMETIC_ITEMS) {
        expect(state.unlockedCosmeticIds).toContain(cosmetic.id);
      }

      // Verify all achievements are unlocked
      expect(state.unlockedAchievementIds.length).toBe(ACHIEVEMENTS.length);
      for (const ach of ACHIEVEMENTS) {
        expect(state.unlockedAchievementIds).toContain(ach.id);
      }

      // Verify level and XP are set to max level
      const maxThreshold = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
      expect(state.level).toBe(maxThreshold.level);
      expect(state.totalXp).toBeGreaterThanOrEqual(maxThreshold.xpRequired);
      expect(state.levelTitle).toBe(maxThreshold.title);
      expect(state.levelProgressPct).toBe(100);

      // Verify persistence to storage
      const reloaded = loadPlayerRewards('dev-tester', storage);
      expect(reloaded.unlockedCosmeticIds.length).toBe(COSMETIC_ITEMS.length);
      expect(reloaded.unlockedAchievementIds.length).toBe(ACHIEVEMENTS.length);
      expect(reloaded.level).toBe(maxThreshold.level);
    });
  });
});
