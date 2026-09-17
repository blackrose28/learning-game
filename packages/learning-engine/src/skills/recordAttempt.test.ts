import { describe, expect, it } from 'vitest';
import {
  createEmptyProfile,
  createSimulatedProfile,
  formatPairKey,
  getAllSkills,
  isMastered,
  isStrong,
  isWeak,
  recordAttempt,
  recordAttempts,
  type Attempt,
  type Skill,
} from '../index';

describe('Task 1.5 — Attempt Recording', () => {
  const createMockAttempt = (overrides: Partial<Attempt> = {}): Attempt => ({
    questionId: 'q-1',
    operation: 'add',
    left: 8,
    right: 7,
    answer: 15,
    selectedAnswer: 15,
    correct: true,
    responseTimeMs: 2500,
    skill: 'cross_10_addition',
    hintUsed: false,
    timestamp: '2026-09-16T10:00:00.000Z',
    ...overrides,
  });

  describe('Purity & Immutability', () => {
    it('is a pure function that leaves the original profile and sub-objects untouched', () => {
      const initialProfile = createEmptyProfile('player-immutable');
      const frozenProfile = JSON.parse(JSON.stringify(initialProfile));

      const attempt = createMockAttempt({
        skill: 'cross_10_addition',
        left: 8,
        right: 7,
        correct: true,
        responseTimeMs: 3200,
      });

      const updatedProfile = recordAttempt(initialProfile, attempt);

      // 1. Returned profile is a new object reference
      expect(updatedProfile).not.toBe(initialProfile);
      expect(updatedProfile.skills).not.toBe(initialProfile.skills);
      expect(updatedProfile.pairs).not.toBe(initialProfile.pairs);

      // 2. Original profile is completely unmutated
      expect(initialProfile.skills.cross_10_addition.attempts).toBe(0);
      expect(initialProfile.skills.cross_10_addition.correct).toBe(0);
      expect(initialProfile.pairs['8 + 7']).toBeUndefined();
      expect(JSON.parse(JSON.stringify(initialProfile))).toEqual(frozenProfile);

      // 3. New profile has updated values
      expect(updatedProfile.skills.cross_10_addition.attempts).toBe(1);
      expect(updatedProfile.skills.cross_10_addition.correct).toBe(1);
      expect(updatedProfile.pairs['8 + 7']).toBeDefined();
    });
  });

  describe('Criterion 1: Correct answers improve the relevant skill', () => {
    it('increases attempts, correct count, accuracy, and score on correct answers', () => {
      const initialProfile = createEmptyProfile('player-progress');

      const attempt1 = createMockAttempt({
        skill: 'basic_addition',
        left: 3,
        right: 4,
        correct: true,
        responseTimeMs: 2000,
      });
      const p1 = recordAttempt(initialProfile, attempt1);

      expect(p1.skills.basic_addition.attempts).toBe(1);
      expect(p1.skills.basic_addition.correct).toBe(1);
      expect(p1.skills.basic_addition.accuracy).toBe(1.0);
      expect(p1.skills.basic_addition.recentAccuracy).toBe(1.0);
      expect(p1.skills.basic_addition.score).toBeGreaterThan(0);

      // Answering more correct problems raises proficiency toward mastered
      let current = p1;
      for (let i = 2; i <= 10; i++) {
        current = recordAttempt(
          current,
          createMockAttempt({
            skill: 'basic_addition',
            left: 2,
            right: 3,
            correct: true,
            responseTimeMs: 1800,
          })
        );
      }

      expect(current.skills.basic_addition.attempts).toBe(10);
      expect(current.skills.basic_addition.correct).toBe(10);
      expect(current.skills.basic_addition.accuracy).toBe(1.0);
      expect(current.skills.basic_addition.score).toBe(1.0);
      expect(isMastered(current.skills.basic_addition)).toBe(true);
    });
  });

  describe('Criterion 2: Incorrect answers reduce/slow skill progression', () => {
    it('decreases accuracy and reduces score on incorrect answers', () => {
      // Start with a strong skill profile
      const profile = createSimulatedProfile({
        playerId: 'player-mistakes',
        skills: {
          cross_10_addition: {
            attempts: 10,
            accuracy: 0.9,
            recentAccuracy: 0.9,
            score: 0.9,
            level: 'strong',
          },
        },
      });

      const initialScore = profile.skills.cross_10_addition.score;
      const initialAccuracy = profile.skills.cross_10_addition.accuracy;

      // Make 3 consecutive mistakes
      let updated = profile;
      for (let i = 0; i < 3; i++) {
        updated = recordAttempt(
          updated,
          createMockAttempt({
            skill: 'cross_10_addition',
            left: 9,
            right: 6,
            correct: false,
            selectedAnswer: 14,
            responseTimeMs: 6500,
          })
        );
      }

      const currentSkill = updated.skills.cross_10_addition;
      expect(currentSkill.attempts).toBe(13);
      expect(currentSkill.correct).toBe(9); // Unchanged from 9
      expect(currentSkill.accuracy).toBeLessThan(initialAccuracy);
      expect(currentSkill.score).toBeLessThan(initialScore);
      expect(currentSkill.recentAccuracy).toBeLessThan(0.9);
    });

    it('slows progression compared to correct answers', () => {
      const base = createEmptyProfile('compare-player');

      // Profile A answers correctly
      const profileA = recordAttempt(
        base,
        createMockAttempt({ skill: 'make_10', correct: true, responseTimeMs: 2000 })
      );

      // Profile B answers incorrectly
      const profileB = recordAttempt(
        base,
        createMockAttempt({ skill: 'make_10', correct: false, responseTimeMs: 2000 })
      );

      expect(profileA.skills.make_10.score).toBeGreaterThan(profileB.skills.make_10.score);
      expect(profileA.skills.make_10.correct).toBe(1);
      expect(profileB.skills.make_10.correct).toBe(0);
    });
  });

  describe('Criterion 3: Recent performance is represented', () => {
    it('reflects recent recovery via sliding window and weighted score', () => {
      const initialProfile = createEmptyProfile('player-recovery');

      // 1. Student initially struggles: 5 incorrect attempts in a row
      let profile = initialProfile;
      for (let i = 0; i < 5; i++) {
        profile = recordAttempt(
          profile,
          createMockAttempt({
            skill: 'cross_10_addition',
            correct: false,
            responseTimeMs: 8000,
          }),
          { recentWindowSize: 5 }
        );
      }

      expect(profile.skills.cross_10_addition.accuracy).toBe(0);
      expect(profile.skills.cross_10_addition.recentAccuracy).toBe(0);
      expect(isWeak(profile.skills.cross_10_addition)).toBe(true);

      // 2. Student masters the concept and gets the next 5 correct
      for (let i = 0; i < 5; i++) {
        profile = recordAttempt(
          profile,
          createMockAttempt({
            skill: 'cross_10_addition',
            correct: true,
            responseTimeMs: 2500,
          }),
          { recentWindowSize: 5 }
        );
      }

      const skillProgress = profile.skills.cross_10_addition;
      expect(skillProgress.attempts).toBe(10);
      expect(skillProgress.correct).toBe(5);
      // Overall accuracy is 5 / 10 = 0.5
      expect(skillProgress.accuracy).toBe(0.5);
      // Recent window of last 5 is 5 / 5 = 1.0 (100% recent!)
      expect(skillProgress.recentAccuracy).toBe(1.0);
      // Score heavily weights recent performance: 0.4 * 0.5 + 0.6 * 1.0 = 0.80
      expect(skillProgress.score).toBeGreaterThanOrEqual(0.75);
      expect(isStrong(skillProgress)).toBe(true);
    });

    it('reflects a recent slump even if historical accuracy was high', () => {
      const initial = createEmptyProfile('player-slump');

      // 10 correct attempts
      let profile = initial;
      for (let i = 0; i < 10; i++) {
        profile = recordAttempt(
          profile,
          createMockAttempt({
            skill: 'basic_subtraction',
            correct: true,
            responseTimeMs: 2000,
          }),
          { recentWindowSize: 5 }
        );
      }
      expect(profile.skills.basic_subtraction.recentAccuracy).toBe(1.0);

      // Now 5 wrong answers in a row
      for (let i = 0; i < 5; i++) {
        profile = recordAttempt(
          profile,
          createMockAttempt({
            skill: 'basic_subtraction',
            correct: false,
            responseTimeMs: 4000,
          }),
          { recentWindowSize: 5 }
        );
      }

      const progress = profile.skills.basic_subtraction;
      expect(progress.attempts).toBe(15);
      expect(progress.accuracy).toBeCloseTo(10 / 15, 2); // 67% overall
      expect(progress.recentAccuracy).toBe(0); // 0% in recent window of 5!
      expect(progress.score).toBeLessThan(0.4); // Score drops sharply reflecting the slump
    });
  });

  describe('Criterion 4: Exact number-pair performance is updated', () => {
    it('creates and updates exact operand pair statistics accurately', () => {
      const profile = createEmptyProfile('player-pairs');

      // Record an attempt for 8 + 7
      const p1 = recordAttempt(
        profile,
        createMockAttempt({
          skill: 'cross_10_addition',
          operation: 'add',
          left: 8,
          right: 7,
          correct: true,
          responseTimeMs: 3500,
          hintUsed: false,
        })
      );

      const pairKey = formatPairKey(8, 'add', 7);
      expect(pairKey).toBe('8 + 7');
      expect(p1.pairs[pairKey]).toBeDefined();

      const pairProgress = p1.pairs[pairKey];
      expect(pairProgress.key).toBe('8 + 7');
      expect(pairProgress.left).toBe(8);
      expect(pairProgress.operation).toBe('add');
      expect(pairProgress.right).toBe(7);
      expect(pairProgress.attempts).toBe(1);
      expect(pairProgress.correct).toBe(1);
      expect(pairProgress.accuracy).toBe(1.0);
      expect(pairProgress.averageResponseTimeMs).toBe(3500);
      expect(pairProgress.hintsUsed).toBe(0);

      // Record a second attempt on the same pair (incorrect, with hint)
      const p2 = recordAttempt(
        p1,
        createMockAttempt({
          skill: 'cross_10_addition',
          operation: 'add',
          left: 8,
          right: 7,
          correct: false,
          responseTimeMs: 6500,
          hintUsed: true,
        })
      );

      const updatedPair = p2.pairs[pairKey];
      expect(updatedPair.attempts).toBe(2);
      expect(updatedPair.correct).toBe(1);
      expect(updatedPair.accuracy).toBe(0.5);
      expect(updatedPair.averageResponseTimeMs).toBe(5000); // (3500 + 6500) / 2
      expect(updatedPair.hintsUsed).toBe(1);
    });

    it('records specific hintLevel on attempt and updates profile hintLevels', () => {
      let profile = createEmptyProfile('player-hint-levels');

      profile = recordAttempt(
        profile,
        createMockAttempt({
          skill: 'make_10',
          left: 8,
          right: 7,
          correct: true,
          hintUsed: true,
          hintLevel: 'strategy_hint',
        })
      );

      expect(profile.skills.make_10.hintsUsed).toBe(1);
      expect(profile.skills.make_10.hintLevels?.strategy_hint).toBe(1);

      profile = recordAttempt(
        profile,
        createMockAttempt({
          skill: 'make_10',
          left: 9,
          right: 6,
          correct: true,
          hintUsed: true,
          hintLevel: 'full_explanation',
        })
      );

      expect(profile.skills.make_10.hintsUsed).toBe(2);
      expect(profile.skills.make_10.hintLevels?.strategy_hint).toBe(1);
      expect(profile.skills.make_10.hintLevels?.full_explanation).toBe(1);
    });

    it('tracks different operand pairs independently', () => {
      let profile = createEmptyProfile('player-multi-pairs');

      // Answer 8 + 7 correctly
      profile = recordAttempt(
        profile,
        createMockAttempt({
          skill: 'cross_10_addition',
          operation: 'add',
          left: 8,
          right: 7,
          correct: true,
          responseTimeMs: 2000,
        })
      );

      // Answer 9 + 6 incorrectly
      profile = recordAttempt(
        profile,
        createMockAttempt({
          skill: 'cross_10_addition',
          operation: 'add',
          left: 9,
          right: 6,
          correct: false,
          responseTimeMs: 7000,
        })
      );

      // Answer 17 - 9 correctly
      profile = recordAttempt(
        profile,
        createMockAttempt({
          skill: 'cross_10_subtraction',
          operation: 'subtract',
          left: 17,
          right: 9,
          correct: true,
          responseTimeMs: 3000,
        })
      );

      expect(Object.keys(profile.pairs).length).toBe(3);
      expect(profile.pairs['8 + 7'].accuracy).toBe(1.0);
      expect(profile.pairs['8 + 7'].correct).toBe(1);

      expect(profile.pairs['9 + 6'].accuracy).toBe(0.0);
      expect(profile.pairs['9 + 6'].correct).toBe(0);

      expect(profile.pairs['17 - 9'].accuracy).toBe(1.0);
      expect(profile.pairs['17 - 9'].operation).toBe('subtract');
    });
  });

  describe('Criterion 5: Response time is incorporated', () => {
    it('maintains cumulative and average response time on skill and pair', () => {
      let profile = createEmptyProfile('player-timing');

      // Attempt 1: 3000ms
      profile = recordAttempt(
        profile,
        createMockAttempt({
          skill: 'make_10',
          left: 6,
          right: 4,
          responseTimeMs: 3000,
        })
      );

      expect(profile.skills.make_10.totalResponseTimeMs).toBe(3000);
      expect(profile.skills.make_10.averageResponseTimeMs).toBe(3000);
      expect(profile.pairs['6 + 4'].averageResponseTimeMs).toBe(3000);

      // Attempt 2: 5000ms
      profile = recordAttempt(
        profile,
        createMockAttempt({
          skill: 'make_10',
          left: 6,
          right: 4,
          responseTimeMs: 5000,
        })
      );

      expect(profile.skills.make_10.totalResponseTimeMs).toBe(8000);
      expect(profile.skills.make_10.averageResponseTimeMs).toBe(4000);
      expect(profile.pairs['6 + 4'].averageResponseTimeMs).toBe(4000);

      // Attempt 3: 1000ms
      profile = recordAttempt(
        profile,
        createMockAttempt({
          skill: 'make_10',
          left: 6,
          right: 4,
          responseTimeMs: 1000,
        })
      );

      expect(profile.skills.make_10.totalResponseTimeMs).toBe(9000);
      expect(profile.skills.make_10.averageResponseTimeMs).toBe(3000); // 9000 / 3
      expect(profile.pairs['6 + 4'].averageResponseTimeMs).toBe(3000);
    });

    it('factors extreme response time into fluency score evaluation', () => {
      const base = createEmptyProfile('player-fluency');

      // Fast child: 5 correct attempts taking 1,500ms each
      let fastProfile = base;
      for (let i = 0; i < 5; i++) {
        fastProfile = recordAttempt(
          fastProfile,
          createMockAttempt({
            skill: 'basic_addition',
            correct: true,
            responseTimeMs: 1500,
          })
        );
      }

      // Slow/finger-counting child: 5 correct attempts taking 14,000ms each
      let slowProfile = base;
      for (let i = 0; i < 5; i++) {
        slowProfile = recordAttempt(
          slowProfile,
          createMockAttempt({
            skill: 'basic_addition',
            correct: true,
            responseTimeMs: 14000,
          })
        );
      }

      // Both have 100% accuracy
      expect(fastProfile.skills.basic_addition.accuracy).toBe(1.0);
      expect(slowProfile.skills.basic_addition.accuracy).toBe(1.0);

      // But response times differ
      expect(fastProfile.skills.basic_addition.averageResponseTimeMs).toBe(1500);
      expect(slowProfile.skills.basic_addition.averageResponseTimeMs).toBe(14000);

      // Score for slow profile incorporates response time penalty for fluency
      expect(slowProfile.skills.basic_addition.score).toBeLessThan(
        fastProfile.skills.basic_addition.score
      );
    });
  });

  describe('Criterion 6: One attempt cannot accidentally update unrelated skills', () => {
    it('only updates the targeted skill and leaves all other skills unchanged', () => {
      const initialProfile = createEmptyProfile('player-isolation');
      const allCurriculumSkills = getAllSkills().map((s) => s.id);

      const targetSkill: Skill = 'cross_10_addition';
      const unrelatedSkills = allCurriculumSkills.filter((s) => s !== targetSkill);

      // Snapshot unrelated skills
      const initialSnapshots = unrelatedSkills.reduce(
        (acc, skill) => {
          acc[skill] = { ...initialProfile.skills[skill] };
          return acc;
        },
        {} as Record<Skill, unknown>
      );

      // Record attempt targeting cross_10_addition
      const updatedProfile = recordAttempt(
        initialProfile,
        createMockAttempt({
          skill: targetSkill,
          left: 8,
          right: 7,
          correct: true,
          responseTimeMs: 3000,
        })
      );

      // Target skill must be updated
      expect(updatedProfile.skills[targetSkill].attempts).toBe(1);
      expect(updatedProfile.skills[targetSkill].correct).toBe(1);

      // All other 6 skills must remain completely unchanged
      for (const skill of unrelatedSkills) {
        expect(updatedProfile.skills[skill].attempts).toBe(0);
        expect(updatedProfile.skills[skill].correct).toBe(0);
        expect(updatedProfile.skills[skill].accuracy).toBe(0);
        expect(updatedProfile.skills[skill].score).toBe(0);
        expect(updatedProfile.skills[skill]).toEqual(initialSnapshots[skill]);
      }
    });

    it('only updates the targeted number pair and leaves other pairs unchanged', () => {
      let profile = createEmptyProfile('player-pair-isolation');

      // Seed with an existing pair
      profile = recordAttempt(
        profile,
        createMockAttempt({
          skill: 'basic_addition',
          left: 2,
          operation: 'add',
          right: 3,
          correct: true,
          responseTimeMs: 1500,
        })
      );

      const pair2Plus3Snapshot = { ...profile.pairs['2 + 3'] };

      // Record attempt for 9 + 4
      profile = recordAttempt(
        profile,
        createMockAttempt({
          skill: 'cross_10_addition',
          left: 9,
          operation: 'add',
          right: 4,
          correct: false,
          responseTimeMs: 6000,
        })
      );

      // '9 + 4' is added and updated
      expect(profile.pairs['9 + 4'].attempts).toBe(1);
      expect(profile.pairs['9 + 4'].correct).toBe(0);

      // '2 + 3' remains completely unchanged
      expect(profile.pairs['2 + 3']).toEqual(pair2Plus3Snapshot);
    });
  });

  describe('Batch Attempt Recording (recordAttempts helper)', () => {
    it('processes a sequential series of attempts and produces the aggregated profile', () => {
      const initialProfile = createEmptyProfile('batch-player');

      const attempts: Attempt[] = [
        createMockAttempt({
          skill: 'basic_addition',
          left: 3,
          right: 2,
          correct: true,
          responseTimeMs: 2000,
        }),
        createMockAttempt({
          skill: 'basic_addition',
          left: 4,
          right: 3,
          correct: true,
          responseTimeMs: 1800,
        }),
        createMockAttempt({
          skill: 'cross_10_addition',
          left: 8,
          right: 7,
          correct: false,
          responseTimeMs: 7500,
        }),
      ];

      const finalProfile = recordAttempts(initialProfile, attempts);

      expect(finalProfile.skills.basic_addition.attempts).toBe(2);
      expect(finalProfile.skills.basic_addition.correct).toBe(2);
      expect(finalProfile.skills.basic_addition.accuracy).toBe(1.0);

      expect(finalProfile.skills.cross_10_addition.attempts).toBe(1);
      expect(finalProfile.skills.cross_10_addition.correct).toBe(0);
      expect(finalProfile.skills.cross_10_addition.accuracy).toBe(0);

      expect(finalProfile.pairs['3 + 2'].correct).toBe(1);
      expect(finalProfile.pairs['4 + 3'].correct).toBe(1);
      expect(finalProfile.pairs['8 + 7'].correct).toBe(0);
    });
  });
});
