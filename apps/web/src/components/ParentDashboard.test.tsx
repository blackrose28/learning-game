import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ParentDashboard } from './ParentDashboard';
import {
  saveDailySession,
  saveAttempt,
  saveProfile,
  createSimulatedProfile,
} from '@math-archer/learning-engine';

beforeEach(() => {
  localStorage.clear();
});

describe('ParentDashboard Component (Task 5.2)', () => {
  it('renders initial empty state gracefully', () => {
    render(<ParentDashboard playerId="player-local" />);

    expect(screen.getByTestId('parent-dashboard-view')).toBeInTheDocument();
    expect(screen.getByTestId('today-arrows-metric')).toHaveTextContent('0 / 50');
    expect(screen.getByTestId('overall-accuracy-metric')).toHaveTextContent('0%');
    expect(screen.getByTestId('addition-accuracy-metric')).toHaveTextContent('0%');
    expect(screen.getByTestId('subtraction-accuracy-metric')).toHaveTextContent('0%');
    expect(screen.getByTestId('no-weak-pairs-msg')).toBeInTheDocument();
    expect(screen.getByTestId('trend-status-pill')).toBeInTheDocument();
  });

  it('displays all 8 required metrics when data is present', () => {
    const playerId = 'player-metrics-test';

    // 1. Today's session with arrows
    saveDailySession({
      id: 'sess-today',
      playerId,
      date: '2026-09-16',
      arrowsAllowed: 50,
      arrowsUsed: 35,
      hits: 30,
      status: 'in_progress',
      startedAt: '2026-09-16T10:00:00.000Z',
    });

    // 2. Addition attempts: 3 attempts, 3 correct (100%), avg speed 2000ms
    for (let i = 0; i < 3; i++) {
      saveAttempt({
        questionId: `add_${i}`,
        operation: 'add',
        left: 4,
        right: 3,
        answer: 7,
        selectedAnswer: 7,
        correct: true,
        responseTimeMs: 2000,
        skill: 'basic_addition',
        hintUsed: false,
        timestamp: '2026-09-16T10:05:00.000Z',
        playerId,
      });
    }

    // 3. Subtraction attempts: 3 attempts, 1 correct (33%), avg speed 4000ms, 1 hint used
    for (let i = 0; i < 3; i++) {
      saveAttempt({
        questionId: `sub_${i}`,
        operation: 'subtract',
        left: 14,
        right: 6,
        answer: 8,
        selectedAnswer: i === 0 ? 8 : 7,
        correct: i === 0,
        responseTimeMs: 4000,
        skill: 'cross_10_subtraction',
        hintUsed: i === 1,
        timestamp: '2026-09-16T10:10:00.000Z',
        playerId,
      });
    }

    // 4. Profile with skills and weak combinations
    const profile = createSimulatedProfile({
      playerId,
      skills: {
        basic_addition: { level: 'mastered', accuracy: 1.0, attempts: 3 },
        cross_10_subtraction: { level: 'weak', accuracy: 0.33, attempts: 3 },
      },
      pairs: {
        '14 - 6': { attempts: 3, correct: 1, accuracy: 0.33, averageResponseTimeMs: 4000 },
      },
    });
    saveProfile(profile);

    render(<ParentDashboard playerId={playerId} />);

    // 1. Today's arrows
    expect(screen.getByTestId('today-arrows-metric')).toHaveTextContent('35 / 50');

    // 2. Accuracy: (3 + 1) / 6 = 67%
    expect(screen.getByTestId('overall-accuracy-metric')).toHaveTextContent('67%');

    // 3. Addition accuracy: 3/3 = 100%
    expect(screen.getByTestId('addition-accuracy-metric')).toHaveTextContent('100%');

    // 4. Subtraction accuracy: 1/3 = 33%
    expect(screen.getByTestId('subtraction-accuracy-metric')).toHaveTextContent('33%');

    // 5. Skill breakdown
    expect(screen.getByTestId('skill-row-basic_addition')).toBeInTheDocument();
    expect(screen.getByTestId('skill-row-cross_10_subtraction')).toBeInTheDocument();

    // 6. Weak number pairs
    expect(screen.getByTestId('weak-pair-14-6')).toBeInTheDocument();
    expect(screen.getByTestId('weak-pair-14-6')).toHaveTextContent('33% accuracy');

    // 7. Average response time: (3*2000 + 3*4000) / 6 = 3000ms = 3.0s
    expect(screen.getByTestId('avg-response-time-metric')).toHaveTextContent('3.0s');

    // 8. Hint rate: 1/6 = 17%
    expect(screen.getByTestId('hint-rate-metric')).toHaveTextContent('17%');
  });

  it('answers all 6 questions clearly in the at-a-glance section', () => {
    const playerId = 'player-q-test';

    saveDailySession({
      id: 'sess-q',
      playerId,
      date: '2026-09-16',
      arrowsAllowed: 50,
      arrowsUsed: 50,
      hits: 40,
      status: 'completed',
      startedAt: '2026-09-16T10:00:00.000Z',
    });

    const profile = createSimulatedProfile({
      playerId,
      skills: {
        cross_10_subtraction: { level: 'weak', accuracy: 0.50, attempts: 10 },
      },
      pairs: {
        '17 - 9': { attempts: 6, correct: 2, accuracy: 0.33 },
      },
    });
    saveProfile(profile);

    // 10 attempts
    for (let i = 0; i < 6; i++) {
      saveAttempt({
        questionId: `add_${i}`,
        operation: 'add',
        left: 8,
        right: 7,
        answer: 15,
        selectedAnswer: 15,
        correct: true,
        responseTimeMs: 2200,
        skill: 'cross_10_addition',
        hintUsed: false,
        timestamp: '2026-09-16T10:00:00.000Z',
        playerId,
      });
    }
    for (let i = 0; i < 4; i++) {
      saveAttempt({
        questionId: `sub_${i}`,
        operation: 'subtract',
        left: 17,
        right: 9,
        answer: 8,
        selectedAnswer: i === 0 ? 8 : 7,
        correct: i === 0,
        responseTimeMs: 4200,
        skill: 'cross_10_subtraction',
        hintUsed: false,
        timestamp: '2026-09-16T10:10:00.000Z',
        playerId,
      });
    }

    render(<ParentDashboard playerId={playerId} />);

    // Q1: Practice amount
    expect(screen.getByTestId('q1-practice-answer')).toHaveTextContent('50 / 50 arrows today');

    // Q2: Accuracy
    expect(screen.getByTestId('q2-accuracy-answer')).toHaveTextContent('70% accuracy');

    // Q3: Operation comparison (subtraction is weaker: 25% vs 100%)
    expect(screen.getByTestId('q3-operation-answer')).toHaveTextContent('Subtraction is weaker');

    // Q4: Weak skills
    expect(screen.getByTestId('q4-weak-skills-answer')).toHaveTextContent('1 skill to practice');

    // Q5: Problem combinations
    expect(screen.getByTestId('q5-weak-pairs-answer')).toHaveTextContent('1 pair with misses');

    // Q6: Performance trend
    expect(screen.getByTestId('q6-improving-card')).toBeInTheDocument();
  });

  it('allows toggling sample preview data with rich history and charts', () => {
    render(<ParentDashboard playerId="player-local" />);

    // Initially 0 attempts
    expect(screen.getByTestId('today-arrows-metric')).toHaveTextContent('0 / 50');

    // Click Preview Sample Data button
    const sampleBtn = screen.getByTestId('toggle-sample-data-btn');
    fireEvent.click(sampleBtn);

    // Should display sample data banner and populated metrics
    expect(screen.getByTestId('sample-data-banner')).toBeInTheDocument();
    expect(screen.getByTestId('today-arrows-metric')).toHaveTextContent('50 / 50');
    expect(screen.getByTestId('q1-practice-answer')).toHaveTextContent('50 / 50 arrows today');
    expect(screen.getByTestId('weak-pair-13+8')).toBeInTheDocument();
    expect(screen.getByTestId('weak-pair-17-9')).toBeInTheDocument();
    expect(screen.getByTestId('history-chart-bars')).toBeInTheDocument();
    expect(screen.getByTestId('focus-recommendation-section')).toBeInTheDocument();

    // Toggle back to real data
    fireEvent.click(screen.getByTestId('toggle-sample-data-btn'));
    expect(screen.queryByTestId('sample-data-banner')).not.toBeInTheDocument();
    expect(screen.getByTestId('today-arrows-metric')).toHaveTextContent('0 / 50');
  });

  it('refreshes data when refresh button is clicked', () => {
    const playerId = 'player-refresh-test';
    render(<ParentDashboard playerId={playerId} />);

    expect(screen.getByTestId('today-arrows-metric')).toHaveTextContent('0 / 50');

    // Add new session to storage
    saveDailySession({
      id: 'sess-new',
      playerId,
      date: '2026-09-16',
      arrowsAllowed: 50,
      arrowsUsed: 25,
      hits: 22,
      status: 'in_progress',
      startedAt: '2026-09-16T12:00:00.000Z',
    });

    // Click Refresh
    fireEvent.click(screen.getByTestId('refresh-dashboard-btn'));

    expect(screen.getByTestId('today-arrows-metric')).toHaveTextContent('25 / 50');
  });

  describe('Task 5.3 — Recommendation Explanation & Traceability', () => {
    it('displays the exact Today\'s focus, Why, and Practice format for Crossing 10 in addition', () => {
      render(<ParentDashboard playerId="player-local" />);

      // Preview sample data which features Crossing 10 in addition
      fireEvent.click(screen.getByTestId('toggle-sample-data-btn'));

      // 1. Focus header & Skill Name
      expect(screen.getByTestId('todays-focus-header')).toHaveTextContent("Today's focus");
      expect(screen.getByTestId('todays-focus-skill')).toHaveTextContent('Crossing 10 in addition');

      // 2. Why Section with recorded accuracy metrics
      expect(screen.getByTestId('recommendation-why-section')).toBeInTheDocument();
      expect(screen.getByTestId('why-item-0')).toHaveTextContent('Recent accuracy: 64%');
      expect(screen.getByTestId('why-item-1')).toHaveTextContent('Previous accuracy: 51%');

      // 3. Practice combinations
      expect(screen.getByTestId('recommendation-practice-section')).toBeInTheDocument();
      expect(screen.getByTestId('practice-pair-0')).toHaveTextContent('8 + 7');
      expect(screen.getByTestId('practice-pair-1')).toHaveTextContent('9 + 6');
      expect(screen.getByTestId('practice-pair-2')).toHaveTextContent('13 + 8');
    });

    it('renders verifiable data trace proving recommendations are 100% data-backed without mysterious AI', () => {
      const playerId = 'player-traceability-test';

      const profile = createSimulatedProfile({
        playerId,
        skills: {
          cross_10_addition: {
            level: 'weak',
            accuracy: 0.51,
            recentAccuracy: 0.64,
            attempts: 28,
            averageResponseTimeMs: 4200,
          },
        },
        pairs: {
          '8 + 7': { attempts: 6, correct: 2, accuracy: 0.33 },
          '9 + 6': { attempts: 5, correct: 2, accuracy: 0.40 },
        },
      });
      saveProfile(profile);

      render(<ParentDashboard playerId={playerId} />);

      // Verify Data Trace container is rendered
      expect(screen.getByTestId('recommendation-data-trace')).toBeInTheDocument();

      // Verify audit statement cites actual numbers
      const auditText = screen.getByTestId('data-trace-audit-statement').textContent ?? '';
      expect(auditText).toContain("Traced to 28 recorded attempts in 'Crossing 10 in addition'");
      expect(auditText).toContain('Recent accuracy: 64%');
      expect(auditText).toContain('previous accuracy: 51%');
      expect(auditText).toContain('zero mysterious AI guessing');

      // Ensure no mysterious AI claims exist in the card
      const focusCardText = screen.getByTestId('focus-recommendation-section').textContent ?? '';
      expect(focusCardText).not.toMatch(/AI thinks/i);
      expect(focusCardText).not.toMatch(/AI predicts/i);
      expect(focusCardText).not.toMatch(/black[- ]box/i);
    });
  });
});

