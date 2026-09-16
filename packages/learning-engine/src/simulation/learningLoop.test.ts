import { describe, expect, it } from 'vitest';
import { simulateLearningLoop, simulateSessions } from './player';
import { getConsecutiveSkillCount } from '../questions/selector';

describe('Task 2.2 — Test the learning loop', () => {
  describe('Multi-session Learning Loop Execution', () => {
    it('runs simulate → select question → answer → update profile across multiple 50-arrow sessions', () => {
      const result = simulateSessions({
        strengths: ['basic_addition'],
        weaknesses: ['make_10'],
        numSessions: 5,
        attemptsPerSession: 50,
        seed: 42,
      });

      expect(result).toBeDefined();
      expect(result.sessions.length).toBe(5);
      expect(result.summary.totalSessions).toBe(5);
      expect(result.summary.totalAttempts).toBe(250);

      // Verify each session satisfies the 50-arrow contract
      for (const [index, session] of result.sessions.entries()) {
        expect(session.sessionIndex).toBe(index + 1);
        expect(session.attempts.length).toBe(50);
        expect(session.profile).toBeDefined();
        expect(session.recommendation).toBeDefined();
        expect(session.overallAccuracy).toBeGreaterThan(0);
        expect(session.averageResponseTimeMs).toBeGreaterThan(0);

        // Sum of question counts across skills in each session equals 50
        const totalSessionQuestions = Object.values(session.questionCounts).reduce(
          (sum: number, count) => sum + (count ?? 0),
          0
        );
        expect(totalSessionQuestions).toBe(50);
      }
    });

    it('is completely deterministic when provided a PRNG seed', () => {
      const run1 = simulateSessions({
        strengths: ['basic_addition'],
        weaknesses: ['make_10'],
        numSessions: 4,
        attemptsPerSession: 50,
        seed: 98765,
      });

      const run2 = simulateSessions({
        strengths: ['basic_addition'],
        weaknesses: ['make_10'],
        numSessions: 4,
        attemptsPerSession: 50,
        seed: 98765,
      });

      expect(run1.summary.overallAccuracy).toBe(run2.summary.overallAccuracy);
      expect(run1.summary.totalAttempts).toBe(run2.summary.totalAttempts);
      expect(run1.finalRecommendation.action).toBe(run2.finalRecommendation.action);

      for (let s = 0; s < run1.sessions.length; s++) {
        expect(run1.sessions[s].questionCounts).toEqual(run2.sessions[s].questionCounts);
        expect(run1.sessions[s].accuracyPerSkill).toEqual(run2.sessions[s].accuracyPerSkill);
      }
    });

    it('simulates 5 sessions (250 attempts) quickly (<150ms)', () => {
      const start = performance.now();
      const result = simulateLearningLoop({
        strengths: ['basic_addition'],
        weaknesses: ['make_10'],
        numSessions: 5,
        attemptsPerSession: 50,
        seed: 111,
      });
      const duration = performance.now() - start;

      expect(result.summary.totalAttempts).toBe(250);
      expect(duration).toBeLessThan(150);
    });
  });

  describe('Core Acceptance Criterion: Weak skill practice reduction upon improvement', () => {
    it('weak skill receives more practice initially and receives less practice as its performance improves', () => {
      const result = simulateSessions({
        strengths: ['basic_addition'],
        weaknesses: ['make_10'],
        allowedSkills: ['basic_addition', 'make_10', 'cross_10_addition'],
        numSessions: 6,
        attemptsPerSession: 50,
        seed: 2026,
      });

      const make10Trajectory = result.summary.trajectories.make_10;
      expect(make10Trajectory).toBeDefined();
      if (!make10Trajectory) return;

      const initialCount = make10Trajectory.sessionQuestionCounts[0];
      const initialPercentage = make10Trajectory.sessionQuestionPercentages[0];
      const initialScore = make10Trajectory.sessionScores[0];

      const finalIndex = result.sessions.length - 1;
      const finalCount = make10Trajectory.sessionQuestionCounts[finalIndex];
      const finalPercentage = make10Trajectory.sessionQuestionPercentages[finalIndex];
      const finalScore = make10Trajectory.sessionScores[finalIndex];

      // 1. Weak skill received high volume in initial session (>50% of session)
      expect(initialPercentage).toBeGreaterThanOrEqual(0.5);
      expect(initialCount).toBeGreaterThan(25);

      // 2. Performance improved as the child practiced
      expect(finalScore).toBeGreaterThan(initialScore);
      expect(make10Trajectory.sessionAccuracies[finalIndex]).toBeGreaterThan(
        make10Trajectory.sessionAccuracies[0]
      );

      // 3. Final mastery level reached strong or mastered
      expect(['strong', 'mastered']).toContain(make10Trajectory.finalMasteryLevel);

      // 4. In the final session, make_10 receives significantly LESS practice
      expect(finalPercentage).toBeLessThan(initialPercentage);
      expect(finalCount).toBeLessThan(initialCount);
      expect(finalPercentage).toBeLessThanOrEqual(0.45);
    });

    it('subtraction weakness receives more practice initially and tapers off as mastery develops', () => {
      const result = simulateSessions({
        preset: 'weak_subtraction',
        numSessions: 6,
        attemptsPerSession: 50,
        seed: 777,
      });

      const subTrajectory = result.summary.trajectories.basic_subtraction;
      expect(subTrajectory).toBeDefined();
      if (!subTrajectory) return;

      const initialPercentage = subTrajectory.sessionQuestionPercentages[0];
      const finalPercentage = subTrajectory.sessionQuestionPercentages[result.sessions.length - 1];

      // Since weak_subtraction has 2 weaknesses (basic_subtraction and cross_10_subtraction),
      // each individual subtraction skill receives ~35-40% initially
      expect(initialPercentage).toBeGreaterThanOrEqual(0.3);
      expect(finalPercentage).toBeLessThan(initialPercentage);
      expect(['strong', 'mastered', 'medium']).toContain(subTrajectory.finalMasteryLevel);
    });
  });

  describe('Anti-Hammering & Anti-Repetition Safeguards', () => {
    it('never hammers the same skill more than maxConsecutiveSameSkill times in a row', () => {
      const maxConsecutive = 3;
      const result = simulateSessions({
        strengths: ['basic_addition'],
        weaknesses: ['make_10'],
        allowedSkills: ['basic_addition', 'make_10', 'cross_10_addition'],
        numSessions: 5,
        attemptsPerSession: 50,
        maxConsecutiveSameSkill: maxConsecutive,
        seed: 555,
      });

      for (const session of result.sessions) {
        const skills = session.attempts.map((a) => a.skill);
        let consecutiveCount = 1;
        let currentSkill = skills[0];

        for (let i = 1; i < skills.length; i++) {
          if (skills[i] === currentSkill) {
            consecutiveCount++;
            expect(consecutiveCount).toBeLessThanOrEqual(maxConsecutive);
          } else {
            currentSkill = skills[i];
            consecutiveCount = 1;
          }
        }
      }
    });

    it('never repeats the exact same question pair back-to-back', () => {
      const result = simulateSessions({
        strengths: ['basic_addition'],
        weaknesses: ['make_10'],
        numSessions: 5,
        attemptsPerSession: 50,
        seed: 444,
      });

      for (const session of result.sessions) {
        for (let i = 1; i < session.attempts.length; i++) {
          const prev = session.attempts[i - 1];
          const curr = session.attempts[i];
          const prevKey = `${prev.left} ${prev.operation === 'add' ? '+' : '-'} ${prev.right}`;
          const currKey = `${curr.left} ${curr.operation === 'add' ? '+' : '-'} ${curr.right}`;

          expect(currKey === prevKey).toBe(false);
        }
      }
    });

    it('getConsecutiveSkillCount accurately detects streaks', () => {
      expect(getConsecutiveSkillCount([])).toEqual({ count: 0 });
      expect(getConsecutiveSkillCount(['basic_addition'])).toEqual({
        skill: 'basic_addition',
        count: 1,
      });
      expect(getConsecutiveSkillCount(['make_10', 'make_10', 'make_10'])).toEqual({
        skill: 'make_10',
        count: 3,
      });
      expect(getConsecutiveSkillCount(['make_10', 'basic_addition', 'make_10'])).toEqual({
        skill: 'make_10',
        count: 1,
      });
    });
  });

  describe('Curriculum Progression & Recommendation Evolution', () => {
    it('transitions recommendations from remediation to consolidation to advancement', () => {
      const result = simulateSessions({
        strengths: ['basic_addition'],
        weaknesses: ['make_10'],
        allowedSkills: ['basic_addition', 'make_10', 'cross_10_addition'],
        numSessions: 6,
        attemptsPerSession: 50,
        seed: 3030,
      });

      // Session 1: initial recommendation is targeted remediation on make_10
      const session1Rec = result.sessions[0].recommendation;
      expect(['remediate_weakness', 'encourage_accuracy']).toContain(session1Rec.action);
      if (session1Rec.action === 'remediate_weakness') {
        expect(['make_10', 'cross_10_addition']).toContain(session1Rec.primarySkill);
      }

      // Final recommendation recognizes advancement or consolidation
      const finalRec = result.finalRecommendation;
      expect(['advance_curriculum', 'consolidate_progress']).toContain(finalRec.action);
    });

    it('introduces the next unattempted curriculum level as challenge once prior skills develop', () => {
      const result = simulateSessions({
        strengths: ['basic_addition'],
        weaknesses: ['addition_within_10'],
        allowedSkills: ['basic_addition', 'addition_within_10', 'make_10'],
        numSessions: 6,
        attemptsPerSession: 50,
        seed: 888,
      });

      // In later sessions, challenge questions introduce make_10 (Level 3)
      const allSkillsAttempted = Object.entries(result.finalProfile.skills)
        .filter(([, progress]) => (progress?.attempts ?? 0) > 0)
        .map(([skill]) => skill);

      // Level 1, Level 2, and Level 3 should be attempted
      expect(allSkillsAttempted).toContain('basic_addition');
      expect(allSkillsAttempted).toContain('addition_within_10');
      expect(allSkillsAttempted).toContain('make_10');
    });
  });
});
