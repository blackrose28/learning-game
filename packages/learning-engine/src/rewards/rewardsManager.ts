import { isCharacterType } from './characters';
import type { SessionStorageAdapter } from '../session/types';
import { getDefaultStorage } from '../session/storage';
import { getCompletedSessionsCount } from '../world/progression';
import type { ElementType } from '../questions/types';
import type {
  PlayerRewardsState,
  AttemptRewardResult,
  SessionCompletionRewardResult,
  XpAward,
  Achievement,
  CosmeticItem,
  EquippedCosmetics,
  CharacterType,
  TargetType,
} from './types';
import {
  LEVEL_THRESHOLDS,
  WIZARD_LEVEL_TITLES,
  DEFAULT_EQUIPPED,
  COSMETIC_ITEMS,
  ACHIEVEMENTS,
  ACHIEVEMENT_BY_ID,
  COSMETIC_BY_ID,
  getDefaultTomorrowReward,
} from './rewardsData';

export const REWARDS_KEY_PREFIX = 'math_archer_rewards_';

export function getRewardsStorageKey(playerId: string = 'player-local'): string {
  return `${REWARDS_KEY_PREFIX}${playerId}`;
}

export function getLevelTitle(level: number, character: CharacterType = 'archer'): string {
  if (character === 'gunner' || character === 'warrior') {
    const ranks = ['Novice', 'Apprentice', 'Royal', 'Master', 'Legendary', 'Divine'];
    return `${ranks[Math.min(5, Math.floor((Math.max(1, level) - 1) / 5))]} ${character === 'gunner' ? 'Gunner' : 'Warrior'}`;
  }
  if (character === 'wizard') {
    return (
      WIZARD_LEVEL_TITLES[level] ||
      LEVEL_THRESHOLDS.find((t) => t.level === level)?.title ||
      'Novice Conjurer'
    );
  }
  return LEVEL_THRESHOLDS.find((t) => t.level === level)?.title || 'Novice Archer';
}

export function calculateLevel(totalXp: number): {
  level: number;
  title: string;
  currentLevelXp: number;
  nextLevelXp: number;
  levelProgressPct: number;
} {
  const safeXp = Math.max(0, Math.floor(totalXp));

  let currentThreshold = LEVEL_THRESHOLDS[0];
  let nextThreshold: (typeof LEVEL_THRESHOLDS)[number] | undefined = LEVEL_THRESHOLDS[1];

  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (safeXp >= LEVEL_THRESHOLDS[i].xpRequired) {
      currentThreshold = LEVEL_THRESHOLDS[i];
      nextThreshold = LEVEL_THRESHOLDS[i + 1];
    } else {
      break;
    }
  }

  if (!nextThreshold) {
    // Max level achieved
    return {
      level: currentThreshold.level,
      title: currentThreshold.title,
      currentLevelXp: safeXp,
      nextLevelXp: safeXp,
      levelProgressPct: 100,
    };
  }

  const xpInTier = safeXp - currentThreshold.xpRequired;
  const tierSpan = nextThreshold.xpRequired - currentThreshold.xpRequired;
  const progressPct = Math.min(100, Math.max(0, Math.round((xpInTier / tierSpan) * 100)));

  return {
    level: currentThreshold.level,
    title: currentThreshold.title,
    currentLevelXp: safeXp,
    nextLevelXp: nextThreshold.xpRequired,
    levelProgressPct: progressPct,
  };
}

/**
 * Checks if targetDate is exactly one calendar day after baseDate (in YYYY-MM-DD format).
 */
export function isConsecutiveDay(baseDateStr: string, targetDateStr: string): boolean {
  try {
    const base = new Date(baseDateStr);
    const target = new Date(targetDateStr);

    const diffMs = target.getTime() - base.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    return diffDays === 1;
  } catch {
    return false;
  }
}

/**
 * Evaluates which cosmetics should be unlocked based on current progression metrics.
 */
export function evaluateCosmeticUnlocks(
  _totalXp: number,
  level: number,
  completedSessionsCount: number,
  currentStreak: number,
  unlockedAchievementIds: string[]
): string[] {
  const unlocked = new Set<string>();

  for (const item of COSMETIC_ITEMS) {
    if (item.unlockType === 'default') {
      unlocked.add(item.id);
    } else if (item.unlockType === 'xp_level') {
      if (level >= Number(item.unlockThreshold)) {
        unlocked.add(item.id);
      }
    } else if (item.unlockType === 'sessions_count') {
      if (completedSessionsCount >= Number(item.unlockThreshold)) {
        unlocked.add(item.id);
      }
    } else if (item.unlockType === 'streak_days') {
      if (currentStreak >= Number(item.unlockThreshold)) {
        unlocked.add(item.id);
      }
    } else if (item.unlockType === 'achievement') {
      if (unlockedAchievementIds.includes(String(item.unlockThreshold))) {
        unlocked.add(item.id);
      }
    }
  }

  return Array.from(unlocked);
}

/**
 * Creates an empty default player rewards state.
 */
export function createDefaultRewardsState(playerId: string = 'player-local'): PlayerRewardsState {
  const levelInfo = calculateLevel(0);
  const unlockedCosmetics = evaluateCosmeticUnlocks(0, 1, 0, 0, []);

  return {
    playerId,
    totalXp: 0,
    level: levelInfo.level,
    currentLevelXp: levelInfo.currentLevelXp,
    nextLevelXp: levelInfo.nextLevelXp,
    levelProgressPct: levelInfo.levelProgressPct,
    levelTitle: levelInfo.title,
    currentStreak: 0,
    bestStreak: 0,
    lastActiveDate: null,
    unlockedCosmeticIds: unlockedCosmetics,
    equippedCosmetics: { ...DEFAULT_EQUIPPED },
    unlockedAchievementIds: [],
    achievementProgress: {},
    tomorrowReward: getDefaultTomorrowReward(0),
    updatedAt: undefined,
  };
}

/**
 * Loads the player rewards state from storage, ensuring all default cosmetics and derived fields are up to date.
 */
export function loadPlayerRewards(
  playerId: string = 'player-local',
  storage: SessionStorageAdapter = getDefaultStorage(),
  explicitCompletedSessions?: number
): PlayerRewardsState {
  const key = getRewardsStorageKey(playerId);
  const raw = storage.getItem(key);
  const defaultState = createDefaultRewardsState(playerId);

  const completedSessions =
    explicitCompletedSessions !== undefined
      ? explicitCompletedSessions
      : getCompletedSessionsCount(playerId, storage);

  if (!raw) {
    return defaultState;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PlayerRewardsState>;
    const totalXp = typeof parsed.totalXp === 'number' ? parsed.totalXp : 0;
    const levelInfo = calculateLevel(totalXp);
    const currentStreak = typeof parsed.currentStreak === 'number' ? parsed.currentStreak : 0;
    const bestStreak = typeof parsed.bestStreak === 'number' ? parsed.bestStreak : currentStreak;
    const unlockedAchievements = Array.isArray(parsed.unlockedAchievementIds)
      ? parsed.unlockedAchievementIds
      : [];

    const computedUnlocks = evaluateCosmeticUnlocks(
      totalXp,
      levelInfo.level,
      completedSessions,
      currentStreak,
      unlockedAchievements
    );

    // Merge explicitly saved unlocked cosmetics with newly evaluated unlocks
    const existingUnlocks = Array.isArray(parsed.unlockedCosmeticIds)
      ? parsed.unlockedCosmeticIds
      : [];
    const mergedUnlocks = Array.from(new Set([...existingUnlocks, ...computedUnlocks]));

    const character: CharacterType = isCharacterType(parsed.equippedCosmetics?.character)
      ? parsed.equippedCosmetics.character
      : 'archer';
    const target: TargetType =
      parsed.equippedCosmetics?.target === 'dummy' ? 'dummy' : 'archery_target';

    const equipped: EquippedCosmetics = {
      character,
      target,
      outfit: parsed.equippedCosmetics?.outfit || DEFAULT_EQUIPPED.outfit,
      bow: parsed.equippedCosmetics?.bow || DEFAULT_EQUIPPED.bow,
      arrowEffect: parsed.equippedCosmetics?.arrowEffect || DEFAULT_EQUIPPED.arrowEffect,
      castleBanner: parsed.equippedCosmetics?.castleBanner || DEFAULT_EQUIPPED.castleBanner,
      castleStatue: parsed.equippedCosmetics?.castleStatue || DEFAULT_EQUIPPED.castleStatue,
      castleGround: parsed.equippedCosmetics?.castleGround || DEFAULT_EQUIPPED.castleGround,
    };

    return {
      playerId,
      totalXp,
      level: levelInfo.level,
      currentLevelXp: levelInfo.currentLevelXp,
      nextLevelXp: levelInfo.nextLevelXp,
      levelProgressPct: levelInfo.levelProgressPct,
      levelTitle: getLevelTitle(levelInfo.level, character),
      currentStreak,
      bestStreak,
      lastActiveDate: parsed.lastActiveDate ?? null,
      unlockedCosmeticIds: mergedUnlocks,
      equippedCosmetics: equipped,
      unlockedAchievementIds: unlockedAchievements,
      achievementProgress: parsed.achievementProgress || {},
      tomorrowReward: getDefaultTomorrowReward(currentStreak),
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return defaultState;
  }
}

/**
 * Persists the player rewards state to storage.
 */
export function savePlayerRewards(
  state: PlayerRewardsState,
  storage: SessionStorageAdapter = getDefaultStorage()
): void {
  const key = getRewardsStorageKey(state.playerId);
  const stateToSave: PlayerRewardsState = {
    ...state,
    updatedAt: state.updatedAt || new Date().toISOString(),
  };
  storage.setItem(key, JSON.stringify(stateToSave));
}

export interface AwardAttemptOptions {
  isCorrect: boolean;
  isMake10?: boolean;
  isDoubles?: boolean;
  element?: ElementType;
  wasMissPreceding?: boolean;
  consecutiveHits?: number;
  activeDate?: string;
  completedSessionsCount?: number;
  character?: CharacterType;
  target?: TargetType;
}

/**
 * Awards XP and checks achievements/unlocks when an arrow is shot.
 * Follows anti-frustration guidelines: always gives effort XP, rewards resilience after mistakes.
 */
export function awardAttemptRewards(
  currentState: PlayerRewardsState,
  options: AwardAttemptOptions
): AttemptRewardResult {
  const xpAwards: XpAward[] = [];

  // 1. Base Attempt XP (rewarding practice and effort)
  const baseAttemptXp = 10;
  xpAwards.push({
    amount: baseAttemptXp,
    reason: 'attempt',
    message: '+10 Practice XP',
  });

  // 2. Accuracy Bonus
  if (options.isCorrect) {
    xpAwards.push({
      amount: 5,
      reason: 'hit',
      message: '+5 Bullseye Bonus',
    });
  }

  // 3. Resilience Bonus: trying again after a miss and hitting!
  if (options.isCorrect && options.wasMissPreceding) {
    xpAwards.push({
      amount: 5,
      reason: 'resilience',
      message: '+5 Grit & Determination Bonus',
    });
  }

  const newAchievements: Achievement[] = [];
  const currentUnlockedAch = new Set(currentState.unlockedAchievementIds);
  const updatedAchProgress = { ...currentState.achievementProgress };

  // Helper to unlock achievement
  const tryUnlockAch = (id: string) => {
    if (!currentUnlockedAch.has(id)) {
      const def = ACHIEVEMENT_BY_ID.get(id);
      if (def) {
        currentUnlockedAch.add(id);
        newAchievements.push(def);
        xpAwards.push({
          amount: def.xpReward,
          reason: 'achievement',
          message: `+${def.xpReward} XP: ${def.title}!`,
        });
      }
    }
  };

  const activeChar = options.character || currentState.equippedCosmetics.character || 'archer';
  const activeTarget = options.target || currentState.equippedCosmetics.target || 'archery_target';

  // Achievement 1: First Flight (Archer) / First Incantation (Wizard)
  if (activeChar === 'wizard') {
    tryUnlockAch('ach_first_spell');
    updatedAchProgress['spells_cast'] = (updatedAchProgress['spells_cast'] || 0) + 1;
    if (updatedAchProgress['spells_cast'] >= 50) {
      tryUnlockAch('ach_spells_50');
    }
  } else if (activeChar === 'gunner' || activeChar === 'warrior') {
    const counter = activeChar === 'gunner' ? 'bullets_fired' : 'axes_thrown';
    tryUnlockAch(activeChar === 'gunner' ? 'ach_first_bullet' : 'ach_first_axe');
    updatedAchProgress[counter] = (updatedAchProgress[counter] || 0) + 1;
    if (updatedAchProgress[counter] >= 50) {
      tryUnlockAch(activeChar === 'gunner' ? 'ach_bullets_50' : 'ach_axes_50');
    }
  } else {
    tryUnlockAch('ach_first_arrow');
  }

  // Dummy hits
  if (activeTarget === 'dummy' && options.isCorrect) {
    updatedAchProgress['dummy_hits'] = (updatedAchProgress['dummy_hits'] || 0) + 1;
    if (updatedAchProgress['dummy_hits'] >= 25) {
      tryUnlockAch('ach_dummy_hits_25');
    }
    if (updatedAchProgress['dummy_hits'] >= 100) {
      tryUnlockAch('ach_dummy_hits_100');
    }
  }

  // Track lifetime arrows shot
  updatedAchProgress['arrows_shot'] = (updatedAchProgress['arrows_shot'] || 0) + 1;
  const totalArrows = updatedAchProgress['arrows_shot'];
  if (totalArrows >= 100) tryUnlockAch('ach_arrows_100');
  if (totalArrows >= 500) tryUnlockAch('ach_arrows_500');
  if (totalArrows >= 1000) tryUnlockAch('ach_arrows_1000');

  // Track correct hits
  if (options.isCorrect) {
    updatedAchProgress['hits'] = (updatedAchProgress['hits'] || 0) + 1;
    const totalHits = updatedAchProgress['hits'];
    if (totalHits >= 100) tryUnlockAch('ach_hits_100');
    if (totalHits >= 500) tryUnlockAch('ach_hits_500');
  }

  // Consecutive Hits Streaks
  const consecutive = options.consecutiveHits ?? (options.isCorrect ? 1 : 0);
  if (consecutive >= 5) tryUnlockAch('ach_streak_5');
  if (consecutive >= 10) tryUnlockAch('ach_streak_10');
  if (consecutive >= 20) tryUnlockAch('ach_streak_20');

  // Resilience: trying again after miss
  if (options.isCorrect && options.wasMissPreceding) {
    tryUnlockAch('ach_resilience');
    updatedAchProgress['comeback_hits'] = (updatedAchProgress['comeback_hits'] || 0) + 1;
    const comebacks = updatedAchProgress['comeback_hits'];
    if (comebacks >= 5) tryUnlockAch('ach_resilience_5');
    if (comebacks >= 15) tryUnlockAch('ach_resilience_15');
  }

  // Make-10 Strategy
  if (options.isCorrect && options.isMake10) {
    tryUnlockAch('ach_make_10_master');
    updatedAchProgress['make10_count'] = (updatedAchProgress['make10_count'] || 0) + 1;
    if (updatedAchProgress['make10_count'] >= 10) {
      tryUnlockAch('ach_make_10_veteran');
    }
  }

  // Doubles Facts Strategy
  if (options.isCorrect && options.isDoubles) {
    updatedAchProgress['doubles_count'] = (updatedAchProgress['doubles_count'] || 0) + 1;
    if (updatedAchProgress['doubles_count'] >= 10) {
      tryUnlockAch('ach_doubles_expert');
    }
  }

  // Elemental Adept (all 4 elements shot)
  if (options.element) {
    const elemKey = `elem_${options.element}`;
    updatedAchProgress[elemKey] = 1;
    if (
      updatedAchProgress['elem_fire'] &&
      updatedAchProgress['elem_ice'] &&
      updatedAchProgress['elem_wind'] &&
      updatedAchProgress['elem_earth']
    ) {
      tryUnlockAch('ach_elements_all');
    }
  }

  // Sum total XP earned this attempt
  const totalAttemptXp = xpAwards.reduce((sum, award) => sum + award.amount, 0);
  const newTotalXp = currentState.totalXp + totalAttemptXp;
  const newLevelInfo = calculateLevel(newTotalXp);

  // Level milestones
  if (newLevelInfo.level >= 10) tryUnlockAch('ach_level_10');
  if (newLevelInfo.level >= 20) tryUnlockAch('ach_level_20');
  if (newLevelInfo.level >= 30) tryUnlockAch('ach_level_30');

  const levelUp =
    newLevelInfo.level > currentState.level
      ? {
          oldLevel: currentState.level,
          newLevel: newLevelInfo.level,
          newTitle: newLevelInfo.title,
        }
      : null;

  // Evaluate cosmetic unlocks
  const completedSessions = options.completedSessionsCount ?? 0;
  const allUnlockedCosmetics = evaluateCosmeticUnlocks(
    newTotalXp,
    newLevelInfo.level,
    completedSessions,
    currentState.currentStreak,
    Array.from(currentUnlockedAch)
  );

  const oldCosmeticSet = new Set(currentState.unlockedCosmeticIds);
  const newCosmetics: CosmeticItem[] = [];
  for (const cosId of allUnlockedCosmetics) {
    if (!oldCosmeticSet.has(cosId)) {
      const cos = COSMETIC_BY_ID.get(cosId);
      if (cos) newCosmetics.push(cos);
    }
  }

  // Collection milestones
  if (allUnlockedCosmetics.length >= 4) {
    tryUnlockAch('ach_collector');
  }
  if (allUnlockedCosmetics.length >= 12) {
    tryUnlockAch('ach_wardrobe_12');
  }
  if (allUnlockedCosmetics.length >= 25) {
    tryUnlockAch('ach_wardrobe_25');
  }

  const updatedEquipped: EquippedCosmetics = {
    ...currentState.equippedCosmetics,
    character: activeChar,
    target: activeTarget,
  };

  const nextState: PlayerRewardsState = {
    ...currentState,
    totalXp: newTotalXp,
    level: newLevelInfo.level,
    currentLevelXp: newLevelInfo.currentLevelXp,
    nextLevelXp: newLevelInfo.nextLevelXp,
    levelProgressPct: newLevelInfo.levelProgressPct,
    levelTitle: getLevelTitle(newLevelInfo.level, activeChar),
    equippedCosmetics: updatedEquipped,
    unlockedCosmeticIds: Array.from(
      new Set([...currentState.unlockedCosmeticIds, ...allUnlockedCosmetics])
    ),
    unlockedAchievementIds: Array.from(currentUnlockedAch),
    achievementProgress: updatedAchProgress,
    tomorrowReward: getDefaultTomorrowReward(currentState.currentStreak, newLevelInfo.level),
    updatedAt: new Date().toISOString(),
  };

  return {
    nextState,
    xpAwarded: totalAttemptXp,
    xpAwards,
    newAchievements,
    newCosmetics,
    levelUp,
  };
}

export interface AwardSessionCompletionOptions {
  sessionDate: string; // YYYY-MM-DD
  completedSessionsCount: number;
  realmsDiscovered?: number;
  totalRealmsCount?: number;
  hitsInSession?: number;
  totalArrowsInSession?: number;
}

/**
 * Awards session completion XP bonus (+100 XP), advances daily streak, and unlocks tomorrow's preview.
 */
export function awardSessionCompleteRewards(
  currentState: PlayerRewardsState,
  options: AwardSessionCompletionOptions
): SessionCompletionRewardResult {
  const xpAwards: XpAward[] = [];

  // 1. Session Completion Base Bonus (+100 XP)
  const sessionCompletionXp = 100;
  xpAwards.push({
    amount: sessionCompletionXp,
    reason: 'session_complete',
    message: '+100 Daily Session Complete Bonus!',
  });

  // 2. Daily Streak Computation
  let nextStreak = currentState.currentStreak;
  const lastDate = currentState.lastActiveDate;
  const todayDate = options.sessionDate;

  if (!lastDate) {
    nextStreak = 1;
  } else if (lastDate === todayDate) {
    // Same day: streak stays at current value
    nextStreak = Math.max(1, currentState.currentStreak);
  } else if (isConsecutiveDay(lastDate, todayDate)) {
    // Played yesterday: advance streak
    nextStreak = currentState.currentStreak + 1;
    const streakBonusXp = Math.min(100, nextStreak * 20);
    xpAwards.push({
      amount: streakBonusXp,
      reason: 'streak_bonus',
      message: `+${streakBonusXp} XP (${nextStreak}-Day Streak Bonus!)`,
    });
  } else {
    // Missed one or more days: gentle reset to 1 without losing previous unlocks or XP
    nextStreak = 1;
  }

  const nextBestStreak = Math.max(currentState.bestStreak, nextStreak);

  // 3. Check Achievements
  const newAchievements: Achievement[] = [];
  const currentUnlockedAch = new Set(currentState.unlockedAchievementIds);

  const tryUnlockAch = (id: string) => {
    if (!currentUnlockedAch.has(id)) {
      const def = ACHIEVEMENT_BY_ID.get(id);
      if (def) {
        currentUnlockedAch.add(id);
        newAchievements.push(def);
        xpAwards.push({
          amount: def.xpReward,
          reason: 'achievement',
          message: `+${def.xpReward} XP: ${def.title}!`,
        });
      }
    }
  };

  // Daily Archer achievement
  tryUnlockAch('ach_daily_champion');

  // Consecutive streak achievements
  if (nextStreak >= 2) tryUnlockAch('ach_streak_return_2');
  if (nextStreak >= 3) tryUnlockAch('ach_streak_return_3');
  if (nextStreak >= 5) tryUnlockAch('ach_streak_return_5');
  if (nextStreak >= 7) tryUnlockAch('ach_streak_return_7');
  if (nextStreak >= 14) tryUnlockAch('ach_streak_return_14');
  if (nextStreak >= 30) tryUnlockAch('ach_streak_return_30');

  // Sessions completed count achievements
  if (options.completedSessionsCount >= 5) tryUnlockAch('ach_sessions_5');
  if (options.completedSessionsCount >= 10) tryUnlockAch('ach_sessions_10');
  if (options.completedSessionsCount >= 25) tryUnlockAch('ach_sessions_25');

  // Realm Wanderer & Cartographer
  if ((options.realmsDiscovered ?? 1) >= 2) {
    tryUnlockAch('ach_realm_explorer');
  }
  if (
    (options.totalRealmsCount && (options.realmsDiscovered ?? 1) >= options.totalRealmsCount) ||
    (options.realmsDiscovered ?? 1) >= 4
  ) {
    tryUnlockAch('ach_realm_master');
  }

  // Master of the Range (>=90% accuracy in a 50-arrow session)
  if (
    options.totalArrowsInSession !== undefined &&
    options.totalArrowsInSession >= 50 &&
    options.hitsInSession !== undefined &&
    options.hitsInSession / options.totalArrowsInSession >= 0.9
  ) {
    tryUnlockAch('ach_perfect_session');
  }

  // Total XP
  const totalCompletionXp = xpAwards.reduce((sum, award) => sum + award.amount, 0);
  const newTotalXp = currentState.totalXp + totalCompletionXp;
  const newLevelInfo = calculateLevel(newTotalXp);

  // Level milestones
  if (newLevelInfo.level >= 10) tryUnlockAch('ach_level_10');
  if (newLevelInfo.level >= 20) tryUnlockAch('ach_level_20');
  if (newLevelInfo.level >= 30) tryUnlockAch('ach_level_30');

  const levelUp =
    newLevelInfo.level > currentState.level
      ? {
          oldLevel: currentState.level,
          newLevel: newLevelInfo.level,
          newTitle: newLevelInfo.title,
        }
      : null;

  // Evaluate cosmetic unlocks
  const allUnlockedCosmetics = evaluateCosmeticUnlocks(
    newTotalXp,
    newLevelInfo.level,
    options.completedSessionsCount,
    nextStreak,
    Array.from(currentUnlockedAch)
  );

  const oldCosmeticSet = new Set(currentState.unlockedCosmeticIds);
  const newCosmetics: CosmeticItem[] = [];
  for (const cosId of allUnlockedCosmetics) {
    if (!oldCosmeticSet.has(cosId)) {
      const cos = COSMETIC_BY_ID.get(cosId);
      if (cos) newCosmetics.push(cos);
    }
  }

  // Collection milestones
  if (allUnlockedCosmetics.length >= 4) tryUnlockAch('ach_collector');
  if (allUnlockedCosmetics.length >= 12) tryUnlockAch('ach_wardrobe_12');
  if (allUnlockedCosmetics.length >= 25) tryUnlockAch('ach_wardrobe_25');

  const tomorrowReward = getDefaultTomorrowReward(nextStreak, newLevelInfo.level);
  const activeChar = currentState.equippedCosmetics?.character || 'archer';
  const activeTarget = currentState.equippedCosmetics?.target || 'archery_target';
  const updatedEquipped: EquippedCosmetics = {
    ...currentState.equippedCosmetics,
    character: activeChar,
    target: activeTarget,
  };

  const nextState: PlayerRewardsState = {
    ...currentState,
    totalXp: newTotalXp,
    level: newLevelInfo.level,
    currentLevelXp: newLevelInfo.currentLevelXp,
    nextLevelXp: newLevelInfo.nextLevelXp,
    levelProgressPct: newLevelInfo.levelProgressPct,
    levelTitle: getLevelTitle(newLevelInfo.level, activeChar),
    equippedCosmetics: updatedEquipped,
    currentStreak: nextStreak,
    bestStreak: nextBestStreak,
    lastActiveDate: todayDate,
    unlockedCosmeticIds: Array.from(
      new Set([...currentState.unlockedCosmeticIds, ...allUnlockedCosmetics])
    ),
    unlockedAchievementIds: Array.from(currentUnlockedAch),
    tomorrowReward,
    updatedAt: new Date().toISOString(),
  };

  return {
    nextState,
    xpAwarded: totalCompletionXp,
    xpAwards,
    newAchievements,
    newCosmetics,
    levelUp,
    tomorrowReward,
  };
}

export type EquippableCategoryKey =
  'outfit' | 'bow' | 'arrowEffect' | 'castleBanner' | 'castleStatue' | 'castleGround';

/**
 * Equips an unlocked cosmetic item.
 */
export function equipCosmetic(
  currentState: PlayerRewardsState,
  category: EquippableCategoryKey,
  itemId: string
): PlayerRewardsState {
  if (!currentState.unlockedCosmeticIds.includes(itemId)) {
    // Item is locked; cannot equip
    return currentState;
  }

  const updatedEquipped: EquippedCosmetics = {
    ...currentState.equippedCosmetics,
    [category]: itemId,
  };

  return {
    ...currentState,
    equippedCosmetics: updatedEquipped,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Switches the active player character (Archer, Wizard, Gunner, or Warrior).
 * Unlocks the 'Master of Disguise' achievement on first switch.
 */
export function switchCharacter(
  currentState: PlayerRewardsState,
  character: CharacterType
): PlayerRewardsState {
  const currentUnlockedAch = new Set(currentState.unlockedAchievementIds);
  const updatedAchProgress = { ...currentState.achievementProgress };
  const newAchievements = [...currentState.unlockedAchievementIds];
  let xpAward = 0;

  if (!currentUnlockedAch.has('ach_character_switch')) {
    const ach = ACHIEVEMENT_BY_ID.get('ach_character_switch');
    if (ach) {
      newAchievements.push('ach_character_switch');
      xpAward = ach.xpReward;
    }
  }

  const updatedEquipped: EquippedCosmetics = {
    ...currentState.equippedCosmetics,
    character,
  };

  const newTotalXp = currentState.totalXp + xpAward;
  const levelInfo = calculateLevel(newTotalXp);

  return {
    ...currentState,
    totalXp: newTotalXp,
    level: levelInfo.level,
    currentLevelXp: levelInfo.currentLevelXp,
    nextLevelXp: levelInfo.nextLevelXp,
    levelProgressPct: levelInfo.levelProgressPct,
    levelTitle: getLevelTitle(levelInfo.level, character),
    equippedCosmetics: updatedEquipped,
    unlockedAchievementIds: newAchievements,
    achievementProgress: updatedAchProgress,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Switches the active practice target ('archery_target' or 'dummy').
 * Unlocks the 'Range Tactician' achievement on first switch.
 */
export function switchTarget(
  currentState: PlayerRewardsState,
  target: TargetType
): PlayerRewardsState {
  const currentUnlockedAch = new Set(currentState.unlockedAchievementIds);
  const updatedAchProgress = { ...currentState.achievementProgress };
  const newAchievements = [...currentState.unlockedAchievementIds];
  let xpAward = 0;

  if (!currentUnlockedAch.has('ach_target_switch')) {
    const ach = ACHIEVEMENT_BY_ID.get('ach_target_switch');
    if (ach) {
      newAchievements.push('ach_target_switch');
      xpAward = ach.xpReward;
    }
  }

  const updatedEquipped: EquippedCosmetics = {
    ...currentState.equippedCosmetics,
    target,
  };

  const newTotalXp = currentState.totalXp + xpAward;
  const levelInfo = calculateLevel(newTotalXp);

  return {
    ...currentState,
    totalXp: newTotalXp,
    level: levelInfo.level,
    currentLevelXp: levelInfo.currentLevelXp,
    nextLevelXp: levelInfo.nextLevelXp,
    levelProgressPct: levelInfo.levelProgressPct,
    levelTitle: getLevelTitle(
      levelInfo.level,
      currentState.equippedCosmetics.character || 'archer'
    ),
    equippedCosmetics: updatedEquipped,
    unlockedAchievementIds: newAchievements,
    achievementProgress: updatedAchProgress,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Unlocks all cosmetics, achievements, and sets player to max level for testing/dev environments.
 */
export function unlockAllRewards(
  playerId: string = 'player-local',
  storage: SessionStorageAdapter = getDefaultStorage()
): PlayerRewardsState {
  const current = loadPlayerRewards(playerId, storage);
  const allCosmeticIds = COSMETIC_ITEMS.map((c) => c.id);
  const allAchievementIds = ACHIEVEMENTS.map((a) => a.id);
  const maxThreshold = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const maxXp = maxThreshold.xpRequired;
  const levelInfo = calculateLevel(maxXp);

  const updatedProgress: Record<string, number> = {
    ...current.achievementProgress,
    arrows_shot: Math.max(current.achievementProgress.arrows_shot || 0, 1000),
    hits: Math.max(current.achievementProgress.hits || 0, 500),
    comeback_hits: Math.max(current.achievementProgress.comeback_hits || 0, 15),
    make10_count: Math.max(current.achievementProgress.make10_count || 0, 10),
    doubles_count: Math.max(current.achievementProgress.doubles_count || 0, 10),
    elem_fire: 1,
    elem_ice: 1,
    elem_wind: 1,
    elem_earth: 1,
  };

  const updatedState: PlayerRewardsState = {
    ...current,
    totalXp: Math.max(current.totalXp, maxXp),
    level: Math.max(current.level, levelInfo.level),
    currentLevelXp: maxXp,
    nextLevelXp: maxXp,
    levelProgressPct: 100,
    levelTitle: levelInfo.title,
    currentStreak: Math.max(current.currentStreak, 30),
    bestStreak: Math.max(current.bestStreak, 30),
    lastActiveDate: current.lastActiveDate || new Date().toISOString().slice(0, 10),
    unlockedCosmeticIds: allCosmeticIds,
    unlockedAchievementIds: allAchievementIds,
    achievementProgress: updatedProgress,
    tomorrowReward: getDefaultTomorrowReward(Math.max(current.currentStreak, 30), levelInfo.level),
    updatedAt: new Date().toISOString(),
  };

  savePlayerRewards(updatedState, storage);
  return updatedState;
}
