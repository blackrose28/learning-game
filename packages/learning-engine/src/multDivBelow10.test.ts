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
  recordAttempt,
  saveProfile,
  loadProfile,
  selectNextQuestionWithDistractors,
  type Attempt,
  type Skill,
} from './index';

const NEW_SKILLS: Skill[] = ['multiplication_below_10', 'division_below_10'];

describe('Multiplication and division below 10', () => {
  it('appends the new skills without changing the existing curriculum', () => {
    expect(getCurriculumLevelByNumber(9)?.skills).toEqual(['subtraction_within_100']);
    expect(getCurriculumLevelByNumber(10)?.skills).toEqual(['multiplication_below_10']);
    expect(getCurriculumLevelByNumber(11)?.skills).toEqual(['division_below_10']);
  });

  it.each([
    [3, 4, 'multiply', 'multiplication_below_10'],
    [7, 8, 'multiply', 'multiplication_below_10'],
    [9, 9, 'multiply', 'multiplication_below_10'],
    [1, 1, 'multiply', 'multiplication_below_10'],
    [12, 3, 'divide', 'division_below_10'],
    [56, 7, 'divide', 'division_below_10'],
    [81, 9, 'divide', 'division_below_10'],
    [1, 1, 'divide', 'division_below_10'],
  ] as const)('includes %i %s %i in %s', (left, right, operation, skill) => {
    const pool = getSkillQuestionPool(skill);
    expect(
      pool.some((q) => q.left === left && q.right === right && q.operation === operation)
    ).toBe(true);
  });

  it('generates exact, remainder-free division facts only', () => {
    for (const q of getSkillQuestionPool('division_below_10')) {
      expect(q.left % q.right).toBe(0);
      expect(q.answer).toBe(q.left / q.right);
    }
  });

  it.each([
    [10, 5, 'multiply', 'multiplication_below_10'],
    [0, 5, 'multiply', 'multiplication_below_10'],
    [7, 8, 'add', 'multiplication_below_10'],
    [7, 2, 'divide', 'division_below_10'],
    [14, 4, 'divide', 'division_below_10'],
    [55, 8, 'divide', 'division_below_10'],
    [56, 7, 'multiply', 'division_below_10'],
  ] as const)('rejects out-of-bounds %i %s %i for %s', (left, right, op, skill) => {
    const answer = op === 'multiply' ? left * right : left / right;
    expect(
      isQuestionInSkillBounds(
        { id: 'invalid', left, right, operation: op, skill, answer, correctAnswer: answer },
        skill
      )
    ).toBe(false);
  });

  it('adds missing skills to saved profiles without losing progress or pair history', () => {
    const storage = createMemoryStorage();
    const question = createBaseQuestion(7, 8, 'multiply', 'multiplication_below_10');
    const profile = recordAttempt(createEmptyProfile('child'), {
      ...question,
      questionId: question.id,
      selectedAnswer: 56,
      correct: true,
      responseTimeMs: 2000,
      hintUsed: false,
      timestamp: '2026-10-29T10:00:00.000Z',
    });
    const legacySkills = { ...profile.skills } as Partial<typeof profile.skills>;
    delete legacySkills.multiplication_below_10;
    delete legacySkills.division_below_10;
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
      const next = selectNextQuestionWithDistractors(loaded, {
        allowedSkills: [skill],
        seed: 7,
      });
      expect(next.skill).toBe(skill);
      expect(next.choices).toHaveLength(4);
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
      timestamp: '2026-10-29T10:00:00.000Z',
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
      category: skill === 'multiplication_below_10' ? 'multiplication' : 'division',
    });
  });

  it.each([
    [7, 8, 'multiply', 'multiplication_below_10'],
    [56, 7, 'divide', 'division_below_10'],
  ] as const)(
    'targets repeated mistakes on %i %s %i to the new skill',
    (left, right, op, skill) => {
      const question = createBaseQuestion(left, right, op, skill);
      const attempts: Attempt[] = Array.from({ length: 4 }, (_, i) => ({
        ...question,
        questionId: `mistake-${i}`,
        selectedAnswer: question.answer + 10,
        correct: false,
        responseTimeMs: 3000,
        hintUsed: false,
        timestamp: `2026-10-29T10:00:0${i}.000Z`,
      }));
      const profile = createSimulatedProfile({ skills: { [skill]: 'strong' } });
      expect(generatePracticeRecommendation(profile, attempts)).toMatchObject({
        primarySkill: skill,
        action: 'address_systematic_error',
      });
    }
  );

  it.each([
    [7, 8, 'multiply', 'multiplication_below_10', 56, '×'],
    [56, 7, 'divide', 'division_below_10', 8, '÷'],
  ] as const)(
    'provides times-table hints for %i %s %i',
    (left, right, op, skill, answer, symbol) => {
      const question = createBaseQuestion(left, right, op, skill);
      expect(generateQuestionHint(question, 'none')).toEqual({ level: 'none' });
      expect(generateQuestionHint(question, 'strategy_hint')).toMatchObject({
        headline: expect.stringContaining('💡'),
      });
      expect(generateQuestionHint(question, 'partial_decomposition')).toMatchObject({
        equationScaffold: expect.stringContaining('= ?'),
      });
      const full = generateQuestionHint(question, 'full_explanation');
      expect(full).toMatchObject({
        answer,
        equation: expect.stringContaining(`${left} ${symbol} ${right} = ${answer}`),
      });
    }
  );

  it.each(NEW_SKILLS)('generates four unique, sensible choices for %s', (skill) => {
    const question = selectNextQuestionWithDistractors(createEmptyProfile('child'), {
      allowedSkills: [skill],
      seed: 11,
    });
    const values = question.choices.map((c) => c.value);
    expect(question.choices).toHaveLength(4);
    expect(new Set(values).size).toBe(4);
    expect(values).toContain(question.answer);
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(90);
    }
  });
});
