import { describe, expect, it } from 'vitest';
import {
  computeParentDashboardData,
  createBaseQuestion,
  createEmptyProfile,
  createMemoryStorage,
  createSimulatedProfile,
  generatePracticeRecommendation,
  generateQuestionHint,
  getCurriculumLevelByNumber,
  getOrCreateProfile,
  getProfileStorageKey,
  getSkillQuestionPool,
  isQuestionInSkillBounds,
  loadProfile,
  recordAttempt,
  saveProfile,
  selectNextQuestionWithDistractors,
  type Attempt,
  type Skill,
} from './index';

const NEW_SKILLS: Skill[] = ['addition_within_100', 'subtraction_within_100'];

describe('Arithmetic beyond 10 and within 100', () => {
  it('appends the new skills without changing the existing curriculum', () => {
    expect(getCurriculumLevelByNumber(7)?.skills).toEqual(['mixed_operations']);
    expect(getCurriculumLevelByNumber(8)?.skills).toEqual(['addition_within_100']);
    expect(getCurriculumLevelByNumber(9)?.skills).toEqual(['subtraction_within_100']);
  });

  it.each([
    [10, 1, 'add', 'addition_within_100'],
    [28, 7, 'add', 'addition_within_100'],
    [34, 25, 'add', 'addition_within_100'],
    [67, 33, 'add', 'addition_within_100'],
    [99, 1, 'add', 'addition_within_100'],
    [11, 10, 'subtract', 'subtraction_within_100'],
    [32, 7, 'subtract', 'subtraction_within_100'],
    [76, 24, 'subtract', 'subtraction_within_100'],
    [100, 37, 'subtract', 'subtraction_within_100'],
    [100, 99, 'subtract', 'subtraction_within_100'],
  ] as const)('includes %i %s %s in %s', (left, right, operation, skill) => {
    const pool = getSkillQuestionPool(skill);
    expect(
      pool.some((q) => q.left === left && q.right === right && q.operation === operation)
    ).toBe(true);
  });

  it.each([
    [9, 9, 'add', 'addition_within_100'],
    [99, 2, 'add', 'addition_within_100'],
    [0, 20, 'add', 'addition_within_100'],
    [20.5, 1, 'add', 'addition_within_100'],
    [10, 1, 'subtract', 'subtraction_within_100'],
    [101, 1, 'subtract', 'subtraction_within_100'],
    [20, 20, 'subtract', 'subtraction_within_100'],
    [20, 21, 'subtract', 'subtraction_within_100'],
    [20, 0, 'subtract', 'subtraction_within_100'],
  ] as const)('rejects out-of-bounds operands %i, %i for %s / %s', (left, right, op, skill) => {
    const answer = op === 'add' ? left + right : left - right;
    expect(
      isQuestionInSkillBounds(
        { id: 'invalid', left, right, operation: op, skill, answer, correctAnswer: answer },
        skill
      )
    ).toBe(false);
  });

  it('adds missing skills to saved profiles without losing progress or pair history', () => {
    const storage = createMemoryStorage();
    const question = createBaseQuestion(8, 7, 'add', 'cross_10_addition');
    const profile = recordAttempt(createEmptyProfile('child'), {
      ...question,
      questionId: question.id,
      selectedAnswer: 15,
      correct: true,
      responseTimeMs: 2000,
      hintUsed: false,
      timestamp: '2026-10-15T10:00:00.000Z',
    });
    const legacySkills = { ...profile.skills } as Partial<typeof profile.skills>;
    delete legacySkills.addition_within_100;
    delete legacySkills.subtraction_within_100;
    storage.setItem(
      getProfileStorageKey('child'),
      JSON.stringify({ ...profile, skills: legacySkills })
    );

    const loaded = getOrCreateProfile('child', storage);
    expect(loaded.skills.cross_10_addition).toEqual(profile.skills.cross_10_addition);
    expect(loaded.pairs).toEqual(profile.pairs);
    expect(loaded.createdAt).toBe(profile.createdAt);
    for (const skill of NEW_SKILLS) {
      expect(loaded.skills[skill].attempts).toBe(0);
      expect(loaded.skills[skill].playerId).toBe('child');
      const question = selectNextQuestionWithDistractors(loaded, {
        allowedSkills: [skill],
        seed: 7,
      });
      expect(question.skill).toBe(skill);
      expect(question.choices).toHaveLength(4);
    }
  });

  it.each(NEW_SKILLS)('tracks, persists, recommends, and displays progress for %s', (skill) => {
    const storage = createMemoryStorage();
    const empty = createEmptyProfile('child');
    const question = selectNextQuestionWithDistractors(empty, { allowedSkills: [skill], seed: 5 });
    const profile = recordAttempt(empty, {
      ...question,
      questionId: question.id,
      selectedAnswer: question.answer + 1,
      correct: false,
      responseTimeMs: 5000,
      hintUsed: false,
      timestamp: '2026-10-15T10:00:00.000Z',
    });
    expect(profile.skills[skill].attempts).toBe(1);
    expect(profile.skills[skill].correct).toBe(0);
    saveProfile(profile, storage);
    expect(loadProfile('child', storage)?.skills[skill]).toEqual(profile.skills[skill]);
    expect(generatePracticeRecommendation(profile).primarySkill).toBe(skill);
    const dashboard = computeParentDashboardData({ profile });
    expect(dashboard.skills.find((s) => s.skillId === skill)).toMatchObject({
      attempts: 1,
      correct: 0,
      category: skill === 'addition_within_100' ? 'addition' : 'subtraction',
    });
  });

  it.each([
    [28, 17, 'add', 'addition_within_100'],
    [13, 5, 'subtract', 'subtraction_within_100'],
    [15, 2, 'subtract', 'subtraction_within_100'],
    [52, 28, 'subtract', 'subtraction_within_100'],
  ] as const)(
    'targets repeated mistakes on %i and %i to the new skill',
    (left, right, op, skill) => {
      const question = createBaseQuestion(left, right, op, skill);
      const attempts: Attempt[] = Array.from({ length: 4 }, (_, i) => ({
        ...question,
        questionId: `mistake-${i}`,
        selectedAnswer: question.answer + 10,
        correct: false,
        responseTimeMs: 3000,
        hintUsed: false,
        timestamp: `2026-10-15T10:00:0${i}.000Z`,
      }));
      const profile = createSimulatedProfile({ skills: { [skill]: 'strong' } });
      expect(generatePracticeRecommendation(profile, attempts)).toMatchObject({
        primarySkill: skill,
        action: 'address_systematic_error',
      });
    }
  );

  it.each([
    [67, 33, 'add', 'addition_within_100', 100],
    [32, 7, 'subtract', 'subtraction_within_100', 25],
    [100, 37, 'subtract', 'subtraction_within_100', 63],
  ] as const)('provides place-value hints for %i and %i', (left, right, op, skill, answer) => {
    const question = createBaseQuestion(left, right, op, skill);
    expect(generateQuestionHint(question, 'none')).toEqual({ level: 'none' });
    expect(generateQuestionHint(question, 'strategy_hint')).toMatchObject({
      headline: '💡 Think in tens and ones!',
    });
    expect(generateQuestionHint(question, 'partial_decomposition')).toMatchObject({
      equationScaffold: expect.stringContaining('= ?'),
    });
    const full = generateQuestionHint(question, 'full_explanation');
    expect(full).toMatchObject({ answer, equation: expect.stringContaining(`= ${answer}`) });
    expect(full).not.toHaveProperty('decomposition');
  });
});
