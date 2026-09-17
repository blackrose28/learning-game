import type { Skill } from '../curriculum';
import { getDefaultStorage } from '../session/storage';
import type { SessionStorageAdapter } from '../session/types';
import { createEmptyProfile, createSimulatedProfile } from './profile';
import type { SkillProfile } from './types';

/**
 * Key prefix for persisting skill profiles in local or session storage.
 */
export const PROFILE_STORAGE_KEY_PREFIX = 'math_archer_profile_';

/**
 * Returns the storage key for a player's skill profile.
 */
export function getProfileStorageKey(playerId: string): string {
  return `${PROFILE_STORAGE_KEY_PREFIX}${playerId}`;
}

/**
 * Saves a skill profile to storage.
 */
export function saveProfile(
  profile: SkillProfile,
  storage: SessionStorageAdapter = getDefaultStorage()
): void {
  const key = getProfileStorageKey(profile.playerId || 'player-local');
  storage.setItem(key, JSON.stringify(profile));
}

/**
 * Loads a persisted skill profile from storage.
 * Returns null if no profile exists or parsing fails.
 */
export function loadProfile(
  playerId: string = 'player-local',
  storage: SessionStorageAdapter = getDefaultStorage()
): SkillProfile | null {
  const key = getProfileStorageKey(playerId);
  const raw = storage.getItem(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as SkillProfile;
    if (parsed && typeof parsed === 'object' && parsed.skills) {
      return parsed;
    }
  } catch {
    // Malformed JSON in storage
  }

  return null;
}

/**
 * Loads an existing skill profile from storage or creates a fresh empty profile.
 */
export function getOrCreateProfile(
  playerId: string = 'player-local',
  storage: SessionStorageAdapter = getDefaultStorage()
): SkillProfile {
  const existing = loadProfile(playerId, storage);
  if (existing) {
    return existing;
  }

  const fresh = createEmptyProfile(playerId);
  saveProfile(fresh, storage);
  return fresh;
}

/**
 * Controlled test profile preset identifiers for deterministic testing and live adaptation checks.
 */
export type ControlledTestProfileKey =
  | 'fresh_beginner'
  | 'weak_make_10'
  | 'weak_subtraction'
  | 'weak_cross_10_addition'
  | 'mastered_beginner';

export interface ControlledProfilePresetInfo {
  key: ControlledTestProfileKey;
  label: string;
  description: string;
  targetSkill?: Skill;
}

export const CONTROLLED_TEST_PROFILES: Record<
  ControlledTestProfileKey,
  ControlledProfilePresetInfo
> = {
  fresh_beginner: {
    key: 'fresh_beginner',
    label: 'Fresh / Beginner',
    description: 'Clean profile with 0 attempts. Begins at Level 1 (Basic addition).',
    targetSkill: 'basic_addition',
  },
  weak_make_10: {
    key: 'weak_make_10',
    label: 'Weak at Make-10',
    description: 'Strong at basic addition, but weak at Make 10 (score 0.35). Adapts to Make 10.',
    targetSkill: 'make_10',
  },
  weak_subtraction: {
    key: 'weak_subtraction',
    label: 'Weak at Subtraction',
    description:
      'Strong at addition, but weak at basic subtraction (score 0.32). Adapts to subtraction.',
    targetSkill: 'basic_subtraction',
  },
  weak_cross_10_addition: {
    key: 'weak_cross_10_addition',
    label: 'Weak at Cross-10 Addition',
    description:
      'Strong at basic addition, but weak at crossing 10 (score 0.30). Adapts to crossing 10.',
    targetSkill: 'cross_10_addition',
  },
  mastered_beginner: {
    key: 'mastered_beginner',
    label: 'Mastered Level 1',
    description:
      'Basic addition & addition within 10 mastered (score 1.0). Advances to challenge frontier.',
    targetSkill: 'make_10',
  },
};

/**
 * Factory function to create a controlled test profile with specific mastery distributions.
 * Used to verify visible adaptation in the game client (Task 3.4).
 */
export function createControlledTestProfile(
  preset: ControlledTestProfileKey,
  playerId: string = 'player-local'
): SkillProfile {
  switch (preset) {
    case 'weak_make_10':
      return createSimulatedProfile({
        playerId,
        skills: {
          make_10: {
            level: 'weak',
            attempts: 20,
            accuracy: 0.35,
            recentAccuracy: 0.35,
            score: 0.35,
            hintsUsed: 4,
            averageResponseTimeMs: 6500,
          },
          basic_addition: {
            level: 'strong',
            attempts: 25,
            accuracy: 0.96,
            recentAccuracy: 0.95,
            score: 0.93,
            hintsUsed: 0,
            averageResponseTimeMs: 1800,
          },
          addition_within_10: {
            level: 'strong',
            attempts: 20,
            accuracy: 0.9,
            recentAccuracy: 0.9,
            score: 0.88,
            hintsUsed: 0,
            averageResponseTimeMs: 2000,
          },
        },
      });

    case 'weak_subtraction':
      return createSimulatedProfile({
        playerId,
        skills: {
          basic_subtraction: {
            level: 'weak',
            attempts: 20,
            accuracy: 0.32,
            recentAccuracy: 0.3,
            score: 0.32,
            hintsUsed: 4,
            averageResponseTimeMs: 6800,
          },
          cross_10_subtraction: {
            level: 'weak',
            attempts: 15,
            accuracy: 0.25,
            recentAccuracy: 0.25,
            score: 0.25,
            hintsUsed: 3,
            averageResponseTimeMs: 7200,
          },
          basic_addition: {
            level: 'strong',
            attempts: 25,
            accuracy: 0.96,
            recentAccuracy: 0.95,
            score: 0.93,
            hintsUsed: 0,
            averageResponseTimeMs: 1800,
          },
          addition_within_10: {
            level: 'strong',
            attempts: 20,
            accuracy: 0.9,
            recentAccuracy: 0.9,
            score: 0.88,
            hintsUsed: 0,
            averageResponseTimeMs: 2000,
          },
        },
      });

    case 'weak_cross_10_addition':
      return createSimulatedProfile({
        playerId,
        skills: {
          cross_10_addition: {
            level: 'weak',
            attempts: 20,
            accuracy: 0.3,
            recentAccuracy: 0.3,
            score: 0.3,
            hintsUsed: 4,
            averageResponseTimeMs: 7000,
          },
          basic_addition: {
            level: 'strong',
            attempts: 25,
            accuracy: 0.96,
            recentAccuracy: 0.95,
            score: 0.93,
            hintsUsed: 0,
            averageResponseTimeMs: 1800,
          },
          addition_within_10: {
            level: 'strong',
            attempts: 20,
            accuracy: 0.9,
            recentAccuracy: 0.9,
            score: 0.88,
            hintsUsed: 0,
            averageResponseTimeMs: 2000,
          },
        },
      });

    case 'mastered_beginner':
      return createSimulatedProfile({
        playerId,
        skills: {
          basic_addition: {
            level: 'mastered',
            attempts: 35,
            accuracy: 1.0,
            recentAccuracy: 1.0,
            score: 1.0,
            hintsUsed: 0,
            averageResponseTimeMs: 1400,
          },
          addition_within_10: {
            level: 'mastered',
            attempts: 30,
            accuracy: 0.98,
            recentAccuracy: 1.0,
            score: 0.96,
            hintsUsed: 0,
            averageResponseTimeMs: 1600,
          },
        },
      });

    case 'fresh_beginner':
    default:
      return createEmptyProfile(playerId);
  }
}
