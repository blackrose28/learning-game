import { describe, expect, it } from 'vitest';
import { createMemoryStorage } from '../session/storage';
import {
  CONTROLLED_TEST_PROFILES,
  createControlledTestProfile,
  getOrCreateProfile,
  getProfileStorageKey,
  loadProfile,
  saveProfile,
} from './storage';
import { selectNextQuestion } from '../questions/selector';
import { recordAttempt } from './recordAttempt';
import { createEmptyProfile } from './profile';

describe('Skill Profile Storage & Controlled Profiles (Task 3.4)', () => {
  describe('Profile Storage Operations', () => {
    it('generates consistent storage keys', () => {
      expect(getProfileStorageKey('child-1')).toBe('math_archer_profile_child-1');
      expect(getProfileStorageKey('player-test')).toBe('math_archer_profile_player-test');
    });

    it('saves and loads profile using memory storage', () => {
      const storage = createMemoryStorage();
      const profile = createEmptyProfile('player-test');
      profile.skills.basic_addition.attempts = 5;
      profile.skills.basic_addition.correct = 4;
      profile.skills.basic_addition.score = 0.8;

      saveProfile(profile, storage);

      const loaded = loadProfile('player-test', storage);
      expect(loaded).toBeDefined();
      expect(loaded?.playerId).toBe('player-test');
      expect(loaded?.skills.basic_addition.attempts).toBe(5);
      expect(loaded?.skills.basic_addition.correct).toBe(4);
      expect(loaded?.skills.basic_addition.score).toBe(0.8);
    });

    it('returns null when loading non-existent profile', () => {
      const storage = createMemoryStorage();
      expect(loadProfile('non-existent', storage)).toBeNull();
    });

    it('getOrCreateProfile loads existing or creates and persists fresh profile', () => {
      const storage = createMemoryStorage();

      // First call creates fresh profile and persists it
      const created = getOrCreateProfile('player-new', storage);
      expect(created.playerId).toBe('player-new');
      expect(created.skills.basic_addition.attempts).toBe(0);

      // Verify it was persisted to storage
      const loaded = loadProfile('player-new', storage);
      expect(loaded).toBeDefined();
      expect(loaded?.playerId).toBe('player-new');
    });
  });

  describe('Controlled Test Profiles & Question Selection Adaptation', () => {
    it('creates controlled test profiles with expected target weaknesses', () => {
      const weakMake10 = createControlledTestProfile('weak_make_10', 'player-test');
      expect(weakMake10.skills.make_10.masteryLevel).toBe('weak');
      expect(weakMake10.skills.make_10.score).toBeLessThan(0.5);
      expect(weakMake10.skills.basic_addition.masteryLevel).toBe('strong');

      const weakSub = createControlledTestProfile('weak_subtraction', 'player-test');
      expect(weakSub.skills.basic_subtraction.masteryLevel).toBe('weak');
      expect(weakSub.skills.cross_10_subtraction.masteryLevel).toBe('weak');
      expect(weakSub.skills.basic_addition.masteryLevel).toBe('strong');

      const weakCross10 = createControlledTestProfile('weak_cross_10_addition', 'player-test');
      expect(weakCross10.skills.cross_10_addition.masteryLevel).toBe('weak');
      expect(weakCross10.skills.basic_addition.masteryLevel).toBe('strong');

      const mastered = createControlledTestProfile('mastered_beginner', 'player-test');
      expect(mastered.skills.basic_addition.masteryLevel).toBe('mastered');
      expect(mastered.skills.addition_within_10.masteryLevel).toBe('mastered');
    });

    it('selectNextQuestion visibly adapts to weak_make_10 profile', () => {
      const profile = createControlledTestProfile('weak_make_10', 'player-test');

      // Sample 30 questions from this controlled profile
      const counts: Record<string, number> = {};
      for (let i = 0; i < 30; i++) {
        const q = selectNextQuestion(profile, { seed: 1000 + i });
        counts[q.skill] = (counts[q.skill] ?? 0) + 1;
      }

      // make_10 is weak and should be heavily selected (~50% target distribution)
      expect(counts.make_10).toBeGreaterThanOrEqual(10);
    });

    it('selectNextQuestion visibly adapts to weak_subtraction profile', () => {
      const profile = createControlledTestProfile('weak_subtraction', 'player-test');

      const counts: Record<string, number> = {};
      for (let i = 0; i < 30; i++) {
        const q = selectNextQuestion(profile, { seed: 2000 + i });
        counts[q.skill] = (counts[q.skill] ?? 0) + 1;
      }

      const totalSub = (counts.basic_subtraction ?? 0) + (counts.cross_10_subtraction ?? 0);
      expect(totalSub).toBeGreaterThanOrEqual(10);
    });

    it('updates profile via recordAttempt and updates skill metrics', () => {
      let profile = createControlledTestProfile('weak_make_10', 'player-test');
      const initialAttempts = profile.skills.make_10.attempts;
      const initialCorrect = profile.skills.make_10.correct;

      // Simulate a correct answer on make_10
      profile = recordAttempt(profile, {
        questionId: 'q_test_make_10',
        operation: 'add',
        left: 8,
        right: 2,
        answer: 10,
        selectedAnswer: 10,
        correct: true,
        responseTimeMs: 2500,
        skill: 'make_10',
        hintUsed: false,
        timestamp: new Date().toISOString(),
      });

      expect(profile.skills.make_10.attempts).toBe(initialAttempts + 1);
      expect(profile.skills.make_10.correct).toBe(initialCorrect + 1);
      expect(profile.pairs['8 + 2']).toBeDefined();
      expect(profile.pairs['8 + 2'].attempts).toBe(1);
      expect(profile.pairs['8 + 2'].correct).toBe(1);
    });

    it('metadata lists all available presets', () => {
      expect(CONTROLLED_TEST_PROFILES.weak_make_10).toBeDefined();
      expect(CONTROLLED_TEST_PROFILES.weak_subtraction).toBeDefined();
      expect(CONTROLLED_TEST_PROFILES.weak_cross_10_addition).toBeDefined();
      expect(CONTROLLED_TEST_PROFILES.mastered_beginner).toBeDefined();
      expect(CONTROLLED_TEST_PROFILES.fresh_beginner).toBeDefined();
    });
  });
});
