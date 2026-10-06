import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { ParentDashboard } from './ParentDashboard';
import { AuthProvider } from '../context/AuthContext';
import {
  getAllSkills,
  saveDailySession,
  saveAttempt,
  saveProfile,
  createSimulatedProfile,
  createEmptyProfile,
  loadPlayerRewards,
  loadWorldProgression,
  COSMETIC_ITEMS,
  ACHIEVEMENTS,
} from '@math-archer/learning-engine';
import { MathArcherApiClient } from '../api/client';

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

    const today = new Date().toISOString().slice(0, 10);
    // 1. Today's session with arrows
    saveDailySession({
      id: 'sess-today',
      playerId,
      date: today,
      arrowsAllowed: 50,
      arrowsUsed: 35,
      hits: 30,
      status: 'in_progress',
      startedAt: `${today}T10:00:00.000Z`,
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

    const today = new Date().toISOString().slice(0, 10);
    saveDailySession({
      id: 'sess-q',
      playerId,
      date: today,
      arrowsAllowed: 50,
      arrowsUsed: 50,
      hits: 40,
      status: 'completed',
      startedAt: `${today}T10:00:00.000Z`,
    });

    const profile = createSimulatedProfile({
      playerId,
      skills: {
        cross_10_subtraction: { level: 'weak', accuracy: 0.5, attempts: 10 },
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

    const today = new Date().toISOString().slice(0, 10);
    // Add new session to storage
    saveDailySession({
      id: 'sess-new',
      playerId,
      date: today,
      arrowsAllowed: 50,
      arrowsUsed: 25,
      hits: 22,
      status: 'in_progress',
      startedAt: `${today}T12:00:00.000Z`,
    });

    // Click Refresh
    fireEvent.click(screen.getByTestId('refresh-dashboard-btn'));

    expect(screen.getByTestId('today-arrows-metric')).toHaveTextContent('25 / 50');
  });

  it('labels reasoning mission arrows separately from arithmetic accuracy', () => {
    const playerId = 'player-mission-arrows';
    const today = new Date().toISOString().slice(0, 10);
    saveDailySession({
      id: 'sess-missions',
      playerId,
      date: today,
      arrowsAllowed: 50,
      arrowsUsed: 2,
      hits: 2,
      status: 'in_progress',
      startedAt: `${today}T12:00:00.000Z`,
      missionAttemptIds: ['one', 'two'],
    });
    render(<ParentDashboard playerId={playerId} />);
    expect(screen.getByTestId('today-arrows-metric')).toHaveTextContent('2 / 50');
    expect(screen.getByTestId('q1-mission-arrows')).toHaveTextContent(
      'Includes 2 reasoning missions; accuracy below is arithmetic only'
    );
    expect(screen.getByTestId('overall-accuracy-metric')).toHaveTextContent('0%');
  });

  describe('Task 5.3 — Recommendation Explanation & Traceability', () => {
    it("displays the exact Today's focus, Why, and Practice format for Crossing 10 in addition", () => {
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
          '9 + 6': { attempts: 5, correct: 2, accuracy: 0.4 },
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

  describe('Child Profile Management in Parent Dashboard', () => {
    it('renders child switcher bar with quick edit and manage profiles buttons', () => {
      render(
        <AuthProvider>
          <ParentDashboard />
        </AuthProvider>
      );

      expect(screen.getByTestId('parent-child-switcher-bar')).toBeInTheDocument();
      expect(screen.getByTestId('manage-profiles-btn')).toBeInTheDocument();
      expect(screen.getByTestId('add-child-profile-btn')).toBeInTheDocument();
      expect(screen.getByTestId('quick-edit-child-btn')).toBeInTheDocument();
    });

    it('allows adding a new child profile with custom avatar, grade, and PIN', async () => {
      render(
        <AuthProvider>
          <ParentDashboard />
        </AuthProvider>
      );

      // Open Add Child modal
      fireEvent.click(screen.getByTestId('add-child-profile-btn'));
      expect(screen.getByTestId('add-child-modal')).toBeInTheDocument();

      // Enter name
      fireEvent.change(screen.getByTestId('new-child-name-input'), {
        target: { value: 'Lucas' },
      });

      // Change grade
      fireEvent.change(screen.getByTestId('new-child-grade-select'), {
        target: { value: '2nd Grade' },
      });

      // Select avatar
      fireEvent.click(screen.getByTestId('avatar-option-archer-fire'));

      // Enter PIN
      fireEvent.change(screen.getByTestId('new-child-pin-input'), {
        target: { value: '4321' },
      });

      // Submit form
      fireEvent.click(screen.getByTestId('save-new-child-btn'));

      await waitFor(() => {
        expect(screen.queryByTestId('add-child-modal')).not.toBeInTheDocument();
        expect(screen.getByText('Lucas')).toBeInTheDocument();
      });
    });

    it('opens Manage Profiles modal and edits a child name, grade, and passcode', async () => {
      render(
        <AuthProvider>
          <ParentDashboard />
        </AuthProvider>
      );

      // Open Manage Profiles modal
      fireEvent.click(screen.getByTestId('manage-profiles-btn'));
      expect(screen.getByTestId('manage-children-modal')).toBeInTheDocument();
      expect(screen.getByTestId('child-manage-list')).toBeInTheDocument();

      // Click Edit on Alex (player-local)
      fireEvent.click(screen.getByTestId('edit-child-btn-player-local'));
      expect(screen.getByTestId('edit-child-modal')).toBeInTheDocument();

      // Change Alex to Alexander
      fireEvent.change(screen.getByTestId('edit-child-name-input'), {
        target: { value: 'Alexander' },
      });

      // Change PIN to 9999
      fireEvent.change(screen.getByTestId('edit-child-pin-input'), {
        target: { value: '9999' },
      });

      // Save changes
      fireEvent.click(screen.getByTestId('save-edit-child-btn'));

      await waitFor(() => {
        expect(screen.queryByTestId('edit-child-modal')).not.toBeInTheDocument();
        expect(screen.getByTestId('select-child-btn-player-local')).toHaveTextContent('Alexander');
      });
    });

    it('allows deleting a child profile with confirmation prompt', async () => {
      render(
        <AuthProvider>
          <ParentDashboard />
        </AuthProvider>
      );

      // Open Manage Profiles modal
      fireEvent.click(screen.getByTestId('manage-profiles-btn'));
      expect(screen.getByTestId('manage-children-modal')).toBeInTheDocument();

      // Click Delete on Mia
      fireEvent.click(screen.getByTestId('delete-child-btn-child_mia'));
      expect(screen.getByTestId('delete-child-modal')).toBeInTheDocument();
      expect(screen.getByTestId('delete-child-modal')).toHaveTextContent(
        /Are you sure you want to delete/i
      );
      expect(screen.getByTestId('delete-child-modal')).toHaveTextContent('Mia');

      // Cancel first
      fireEvent.click(screen.getByTestId('cancel-delete-child-btn'));
      expect(screen.queryByTestId('delete-child-modal')).not.toBeInTheDocument();

      // Re-open Delete modal and confirm
      fireEvent.click(screen.getByTestId('delete-child-btn-child_mia'));
      fireEvent.click(screen.getByTestId('confirm-delete-child-btn'));

      await waitFor(() => {
        expect(screen.queryByTestId('delete-child-modal')).not.toBeInTheDocument();
        expect(screen.queryByTestId('child-manage-row-child_mia')).not.toBeInTheDocument();
      });
    });

    it('allows changing the parent PIN code with validation and confirmation', async () => {
      render(
        <AuthProvider>
          <ParentDashboard />
        </AuthProvider>
      );

      // Open Change Parent PIN modal from switcher bar
      fireEvent.click(screen.getByTestId('change-parent-pin-btn'));
      expect(screen.getByTestId('change-parent-pin-modal')).toBeInTheDocument();

      // 1. Validation: Mismatched new PIN and confirmation
      fireEvent.change(screen.getByTestId('current-parent-pin-input'), {
        target: { value: '1234' },
      });
      fireEvent.change(screen.getByTestId('new-parent-pin-input'), {
        target: { value: '5678' },
      });
      fireEvent.change(screen.getByTestId('confirm-parent-pin-input'), {
        target: { value: '9999' },
      });
      fireEvent.click(screen.getByTestId('save-parent-pin-btn'));

      expect(screen.getByTestId('change-pin-error')).toHaveTextContent(
        /New PIN and confirmation do not match/i
      );

      // 2. Validation: Incorrect current PIN
      fireEvent.change(screen.getByTestId('current-parent-pin-input'), {
        target: { value: '0000' },
      });
      fireEvent.change(screen.getByTestId('confirm-parent-pin-input'), {
        target: { value: '5678' },
      });
      fireEvent.click(screen.getByTestId('save-parent-pin-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('change-pin-error')).toHaveTextContent(
          /Current PIN is incorrect/i
        );
      });

      // 3. Successful update: Correct current PIN (1234), matching new PIN (5678)
      fireEvent.change(screen.getByTestId('current-parent-pin-input'), {
        target: { value: '1234' },
      });
      fireEvent.click(screen.getByTestId('save-parent-pin-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('change-pin-success')).toHaveTextContent(
          /Parent PIN successfully updated!/i
        );
      });

      // Close modal
      fireEvent.click(screen.getByTestId('cancel-change-pin-btn'));
      expect(screen.queryByTestId('change-parent-pin-modal')).not.toBeInTheDocument();
    });

    it('allows opening Change Parent PIN modal from within Manage Profiles modal', () => {
      render(
        <AuthProvider>
          <ParentDashboard />
        </AuthProvider>
      );

      // Open Manage Profiles modal
      fireEvent.click(screen.getByTestId('manage-profiles-btn'));
      expect(screen.getByTestId('manage-children-modal')).toBeInTheDocument();

      // Click Change PIN from inside the Manage Profiles modal
      fireEvent.click(screen.getByTestId('manage-change-parent-pin-btn'));
      expect(screen.queryByTestId('manage-children-modal')).not.toBeInTheDocument();
      expect(screen.getByTestId('change-parent-pin-modal')).toBeInTheDocument();

      // Close modal
      fireEvent.click(screen.getByTestId('close-change-pin-btn'));
      expect(screen.queryByTestId('change-parent-pin-modal')).not.toBeInTheDocument();
    });
  });

  describe('Multi-Child On-Demand Cloud Hydration (Item 4)', () => {
    it('triggers on-demand cloud hydration when switching children and updates metrics', async () => {
      const requestedPlayerIds: string[] = [];
      const today = new Date().toISOString().slice(0, 10);

      const mockApiClient = new MathArcherApiClient({
        fetchFn: async (url) => {
          const u = new URL(url.toString(), 'https://api.math-archer.local');
          const targetChildId = u.searchParams.get('playerId') || 'player-local';
          requestedPlayerIds.push(targetChildId);

          if (targetChildId === 'child_mia') {
            return new Response(
              JSON.stringify({
                profile: createSimulatedProfile({
                  playerId: 'child_mia',
                  skills: {
                    basic_addition: { level: 'mastered', accuracy: 0.9, attempts: 20 },
                  },
                }),
                stats: { totalAttempts: 20, accuracy: 0.9, averageSpeedMs: 2100 },
                currentSession: {
                  id: 'mia-sess-today',
                  playerId: 'child_mia',
                  date: today,
                  arrowsAllowed: 50,
                  arrowsUsed: 40,
                  hits: 36,
                  status: 'in_progress',
                  startedAt: `${today}T09:00:00.000Z`,
                },
                sessions: [
                  {
                    id: 'mia-sess-today',
                    playerId: 'child_mia',
                    date: today,
                    arrowsAllowed: 50,
                    arrowsUsed: 40,
                    hits: 36,
                    status: 'in_progress',
                    startedAt: `${today}T09:00:00.000Z`,
                  },
                ],
                attempts: Array.from({ length: 20 }, (_, i) => ({
                  questionId: `mia_q_${i}`,
                  operation: 'add' as const,
                  left: 5,
                  right: 4,
                  answer: 9,
                  selectedAnswer: 9,
                  correct: true,
                  responseTimeMs: 2100,
                  skill: 'basic_addition',
                  hintUsed: false,
                  timestamp: `${today}T09:0${i < 10 ? '0' + i : i}:00.000Z`,
                  playerId: 'child_mia',
                })),
                worldProgression: {
                  unlockedAreaIds: ['castle', 'forest_area'],
                  activeAreaId: 'forest_area',
                  completedSessionsCount: 1,
                },
                rewards: {
                  totalXp: 200,
                  unlockedCosmeticIds: ['bow-wood'],
                  equippedCosmetics: { bow: 'bow-wood' },
                },
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          }

          // Default fallback for Alex (player-local)
          return new Response(
            JSON.stringify({
              profile: createEmptyProfile(targetChildId),
              stats: { totalAttempts: 0, accuracy: 0, averageSpeedMs: 0 },
              currentSession: null,
              sessions: [],
              attempts: [],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        },
      });

      render(
        <AuthProvider apiClient={mockApiClient}>
          <ParentDashboard apiClient={mockApiClient} />
        </AuthProvider>
      );

      // Initially viewing Alex (player-local), 0 arrows
      expect(screen.getByTestId('today-arrows-metric')).toHaveTextContent('0 / 50');

      // Click on Mia in child switcher bar
      const miaButton = screen.getByTestId('select-child-btn-child_mia');
      expect(miaButton).toBeInTheDocument();
      fireEvent.click(miaButton);

      // Verify that cloud hydration was triggered for Mia and metrics updated
      await waitFor(() => {
        expect(requestedPlayerIds).toContain('child_mia');
        expect(screen.getByTestId('today-arrows-metric')).toHaveTextContent('40 / 50');
        expect(screen.getByTestId('overall-accuracy-metric')).toHaveTextContent('100%');
      });

      // Sync indicator should be dismissed after completion
      expect(screen.queryByTestId('syncing-indicator')).not.toBeInTheDocument();
    });

    it('allows manually triggering hydration via the Refresh button', async () => {
      let callCount = 0;

      const mockApiClient = new MathArcherApiClient({
        fetchFn: async () => {
          callCount++;
          return new Response(
            JSON.stringify({
              profile: createEmptyProfile('player-local'),
              stats: { totalAttempts: 0, accuracy: 0, averageSpeedMs: 0 },
              currentSession: null,
              sessions: [],
              attempts: [],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        },
      });

      render(
        <AuthProvider apiClient={mockApiClient}>
          <ParentDashboard apiClient={mockApiClient} />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(callCount).toBeGreaterThanOrEqual(1);
      });

      const previousCount = callCount;
      fireEvent.click(screen.getByTestId('refresh-dashboard-btn'));

      await waitFor(() => {
        expect(callCount).toBeGreaterThan(previousCount);
      });
    });

    it('handles fast child switching without race condition overwrites', async () => {
      const today = new Date().toISOString().slice(0, 10);
      let resolveAlex: ((val: Response) => void) | null = null;

      const mockApiClient = new MathArcherApiClient({
        fetchFn: async (url) => {
          const u = new URL(url.toString(), 'https://api.math-archer.local');
          const targetChildId = u.searchParams.get('playerId') || 'player-local';

          if (targetChildId === 'player-local') {
            // Slow response for Alex
            return new Promise<Response>((res) => {
              resolveAlex = res;
            });
          }

          // Immediate response for Mia
          return new Response(
            JSON.stringify({
              profile: createSimulatedProfile({
                playerId: 'child_mia',
                skills: {
                  basic_addition: { level: 'mastered', accuracy: 1.0, attempts: 5 },
                },
              }),
              stats: { totalAttempts: 5, accuracy: 1.0, averageSpeedMs: 1500 },
              currentSession: {
                id: 'mia-sess',
                playerId: 'child_mia',
                date: today,
                arrowsAllowed: 50,
                arrowsUsed: 48,
                hits: 48,
                status: 'in_progress',
                startedAt: `${today}T10:00:00.000Z`,
              },
              sessions: [],
              attempts: [
                {
                  questionId: 'q1',
                  operation: 'add',
                  left: 2,
                  right: 3,
                  answer: 5,
                  selectedAnswer: 5,
                  correct: true,
                  responseTimeMs: 1500,
                  skill: 'basic_addition',
                  hintUsed: false,
                  timestamp: `${today}T10:00:00.000Z`,
                  playerId: 'child_mia',
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        },
      });

      render(
        <AuthProvider apiClient={mockApiClient}>
          <ParentDashboard apiClient={mockApiClient} />
        </AuthProvider>
      );

      // Quickly switch to Mia while Alex is still waiting
      fireEvent.click(screen.getByTestId('select-child-btn-child_mia'));

      // Mia's data loads
      await waitFor(() => {
        expect(screen.getByTestId('today-arrows-metric')).toHaveTextContent('48 / 50');
      });

      // Now Alex's delayed response finishes with stale 10 / 50 data
      if (resolveAlex) {
        await act(async () => {
          resolveAlex!(
            new Response(
              JSON.stringify({
                profile: createEmptyProfile('player-local'),
                stats: { totalAttempts: 1, accuracy: 1.0, averageSpeedMs: 2000 },
                currentSession: {
                  id: 'alex-sess',
                  playerId: 'player-local',
                  date: today,
                  arrowsAllowed: 50,
                  arrowsUsed: 10,
                  hits: 10,
                  status: 'in_progress',
                  startedAt: `${today}T08:00:00.000Z`,
                },
                sessions: [],
                attempts: [],
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          );
          await new Promise((r) => setTimeout(r, 50));
        });
      }

      // Assert that Mia's 48 / 50 remains on screen and was NOT overwritten by Alex's delayed response
      expect(screen.getByTestId('today-arrows-metric')).toHaveTextContent('48 / 50');
    });

    it('falls back gracefully to local storage if offline or network error occurs', async () => {
      const mockApiClient = new MathArcherApiClient({
        fetchFn: async () => {
          throw new Error('Network offline');
        },
      });

      render(
        <AuthProvider apiClient={mockApiClient}>
          <ParentDashboard apiClient={mockApiClient} />
        </AuthProvider>
      );

      // Should render without throwing
      expect(screen.getByTestId('parent-dashboard-view')).toBeInTheDocument();
      expect(screen.getByTestId('today-arrows-metric')).toHaveTextContent('0 / 50');

      // Sync indicator should be cleared when error is handled
      await waitFor(() => {
        expect(screen.queryByTestId('syncing-indicator')).not.toBeInTheDocument();
      });
    });
  });

  describe('Dev Mode: Enable All Rewards', () => {
    it('renders the Enable All Rewards button when showDevTools={true} (or dev env)', () => {
      render(<ParentDashboard playerId="player-local" showDevTools={true} />);
      const btn = screen.getByTestId('enable-all-rewards-btn');
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveTextContent('Enable All Rewards');
    });

    it('hides the Enable All Rewards button when showDevTools={false}', () => {
      render(<ParentDashboard playerId="player-local" showDevTools={false} />);
      expect(screen.queryByTestId('enable-all-rewards-btn')).not.toBeInTheDocument();
    });

    it('clicking Enable All Rewards unlocks all cosmetics, achievements, and world areas', async () => {
      const playerId = 'child-reward-test';
      render(<ParentDashboard playerId={playerId} showDevTools={true} />);

      const btn = screen.getByTestId('enable-all-rewards-btn');
      await act(async () => {
        fireEvent.click(btn);
      });

      // Feedback toast appears
      expect(screen.getByTestId('dev-action-feedback')).toBeInTheDocument();
      expect(screen.getByTestId('dev-action-feedback')).toHaveTextContent(
        'All rewards, cosmetics & world realms unlocked'
      );

      // Verify in storage
      const rewards = loadPlayerRewards(playerId);
      expect(rewards.unlockedCosmeticIds.length).toBe(COSMETIC_ITEMS.length);
      expect(rewards.unlockedAchievementIds.length).toBe(ACHIEVEMENTS.length);
      expect(rewards.level).toBe(30);
      expect(rewards.totalXp).toBeGreaterThanOrEqual(45000);

      const world = loadWorldProgression(playerId);
      expect(world.unlockedAreaIds).toHaveLength(5);
    });

    it('syncs unlocked rewards to apiClient when apiClient is provided', async () => {
      const playerId = 'child-cloud-rewards';
      let pushedPayload: unknown = null;

      const mockApiClient = new MathArcherApiClient({
        fetchFn: async (url, init) => {
          if (String(url).includes('/api/progress/rewards') && init?.method === 'PUT') {
            pushedPayload = JSON.parse(init.body as string);
            return new Response(JSON.stringify({ success: true, rewards: pushedPayload }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          return new Response(JSON.stringify({}), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        },
      });

      render(<ParentDashboard playerId={playerId} apiClient={mockApiClient} showDevTools={true} />);

      const btn = screen.getByTestId('enable-all-rewards-btn');
      await act(async () => {
        fireEvent.click(btn);
      });

      expect(pushedPayload).toBeDefined();
      const payload = pushedPayload as { unlockedCosmeticIds: string[]; level: number };
      expect(payload.unlockedCosmeticIds.length).toBe(COSMETIC_ITEMS.length);
      expect(payload.level).toBe(30);
    });
  });
});

describe('Practice skill switches', () => {
  it('saves switches per child, survives reopening, and keeps progress', async () => {
    saveProfile(
      createSimulatedProfile({ playerId: 'child-a', skills: { addition_within_10: 'mastered' } })
    );
    const view = render(<ParentDashboard playerId="child-a" />);
    const toggle = screen.getByRole('switch', { name: 'Addition within 10' });
    expect(
      within(screen.getByRole('region', { name: 'Practice skills' })).getAllByRole('switch')
    ).toHaveLength(getAllSkills().length);
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).not.toBeChecked());
    view.rerender(<ParentDashboard playerId="child-b" />);
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Addition within 10' })).toBeChecked()
    );
    view.unmount();
    render(<ParentDashboard playerId="child-a" />);
    expect(screen.getByRole('switch', { name: 'Addition within 10' })).not.toBeChecked();
    expect(
      JSON.parse(localStorage.getItem('math_archer_profile_child-a')!).skills.addition_within_10
        .masteryLevel
    ).toBe('mastered');
    fireEvent.click(screen.getByRole('switch', { name: 'Addition within 10' }));
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Addition within 10' })).toBeChecked()
    );
  });

  it('protects the last enabled skill and disables editing in sample mode', () => {
    localStorage.setItem(
      'math_archer_disabled_skills_player-local',
      JSON.stringify(
        getAllSkills()
          .map((s) => s.id)
          .filter((s) => s !== 'make_10')
      )
    );
    render(<ParentDashboard />);
    expect(screen.getByRole('switch', { name: 'Make 10' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'Basic addition' })).not.toBeDisabled();
    fireEvent.click(screen.getByTestId('toggle-sample-data-btn'));
    screen.getAllByRole('switch').forEach((toggle) => expect(toggle).toBeDisabled());
  });

  it('shows a save failure without changing the skill', async () => {
    const apiClient = new MathArcherApiClient({
      fetchFn: async () =>
        new Response(JSON.stringify({ message: 'Unable to save skills' }), { status: 500 }),
    });
    render(<ParentDashboard apiClient={apiClient} />);
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Addition within 10' })).not.toBeDisabled()
    );
    fireEvent.click(screen.getByRole('switch', { name: 'Addition within 10' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Unable to save skills')
    );
    expect(screen.getByRole('switch', { name: 'Addition within 10' })).toBeChecked();
  });
});
