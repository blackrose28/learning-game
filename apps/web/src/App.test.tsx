import { describe, it, expect, beforeEach } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from './App';
import { saveReasoningSettings } from './reasoningPreferences';
import {
  getActiveDailySession,
  getTodayDateString,
  loadPlayerRewards,
  saveAttempt,
  saveDailySession,
  startDailySession,
} from '@math-archer/learning-engine';
import { loadMissionWorkspace } from './sync/missions';

beforeEach(() => {
  localStorage.clear();
});

describe('App navigation and Progress & History View', () => {
  it('navigates between Game, Parent Dashboard (with Parent Gate protection), Progress & History, and Curriculum tabs', async () => {
    render(<App />);

    // Default tab is Game Screen with child badge
    expect(screen.getByTestId('tab-game')).toBeInTheDocument();
    expect(screen.getByTestId('question-expression')).toBeInTheDocument();
    expect(screen.getByTestId('current-player-badge')).toHaveTextContent(/Alex/i);

    // Switch to Parent Dashboard tab: Parent Gate intercepts to protect parent data
    fireEvent.click(screen.getByTestId('tab-dashboard'));
    expect(screen.getByTestId('parent-gate')).toBeInTheDocument();

    // Unlock Parent Gate with Demo PIN (1234)
    fireEvent.click(screen.getByTestId('keypad-1'));
    fireEvent.click(screen.getByTestId('keypad-2'));
    fireEvent.click(screen.getByTestId('keypad-3'));
    fireEvent.click(screen.getByTestId('keypad-4'));

    // Now parent dashboard is unlocked and visible
    await waitFor(() => {
      expect(screen.getByTestId('today-arrows-metric')).toHaveTextContent('0 / 50');
    });

    // Switch to Progress & History tab
    fireEvent.click(screen.getByTestId('tab-history'));
    expect(screen.getByTestId('local-progress-view')).toBeInTheDocument();
    expect(screen.getByTestId('total-attempts-metric')).toHaveTextContent('0');

    // Switch to Curriculum tab
    fireEvent.click(screen.getByTestId('tab-curriculum'));
    expect(screen.getByText(/Curriculum Definition/i)).toBeInTheDocument();

    // Switch back to Game Screen
    fireEvent.click(screen.getByTestId('tab-game'));
    expect(screen.getByTestId('question-expression')).toBeInTheDocument();
  });

  it('allows switching child profile via the header badge', () => {
    render(<App />);

    expect(screen.getByTestId('current-player-badge')).toHaveTextContent(/Alex/i);

    // Open child profile picker
    fireEvent.click(screen.getByTestId('switch-child-profile-btn'));
    expect(screen.getByTestId('child-profile-picker')).toBeInTheDocument();

    // Close picker
    fireEvent.click(screen.getByTestId('close-child-picker-btn'));
    expect(screen.queryByTestId('child-profile-picker')).not.toBeInTheDocument();
  });

  it('opens and closes the slide-out game menu drawer via button and Escape key', () => {
    render(<App />);

    const menuDrawer = screen.getByTestId('app-menu-drawer');
    expect(menuDrawer).not.toHaveClass('open');

    // Open menu
    fireEvent.click(screen.getByTestId('app-menu-toggle'));
    expect(menuDrawer).toHaveClass('open');

    // Close via close button
    fireEvent.click(screen.getByTestId('close-menu-btn'));
    expect(menuDrawer).not.toHaveClass('open');

    // Reopen and close via Escape key
    fireEvent.click(screen.getByTestId('app-menu-toggle'));
    expect(menuDrawer).toHaveClass('open');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(menuDrawer).not.toHaveClass('open');
  });

  it('navigates to World Map tab and renders the world exploration view', () => {
    render(<App />);

    expect(screen.getByTestId('tab-world')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('tab-world'));

    expect(screen.getByTestId('world-map-container')).toBeInTheDocument();
    expect(screen.getByTestId('world-map-title')).toHaveTextContent(/Archery World Map/i);

    // Click "Back to Archery Range" from WorldMap returns to Game Screen
    fireEvent.click(screen.getByTestId('back-to-game-btn'));
    expect(screen.getByTestId('question-expression')).toBeInTheDocument();
  });

  it('displays stored attempts and sessions in Progress & History tab', () => {
    // Seed some attempts and sessions in localStorage
    const today = getTodayDateString();
    saveDailySession({
      id: 'session-app-test',
      playerId: 'player-local',
      date: today,
      arrowsAllowed: 50,
      arrowsUsed: 10,
      hits: 8,
      status: 'in_progress',
      startedAt: `${today}T10:00:00.000Z`,
    });

    saveAttempt({
      questionId: 'q_seed_1',
      operation: 'add',
      left: 8,
      right: 7,
      answer: 15,
      selectedAnswer: 15,
      correct: true,
      responseTimeMs: 2000,
      skill: 'make_10',
      hintUsed: false,
      timestamp: '2026-09-16T10:05:00.000Z',
      playerId: 'player-local',
      sessionId: 'session-app-test',
    });

    render(<App />);

    // Navigate to Progress & History tab
    fireEvent.click(screen.getByTestId('tab-history'));

    expect(screen.getByTestId('total-attempts-metric')).toHaveTextContent('1');
    expect(screen.getByTestId('accuracy-metric')).toHaveTextContent('100%');
    expect(screen.getByTestId('total-sessions-metric')).toHaveTextContent('1');
    expect(screen.getByTestId('session-item-session-app-test')).toBeInTheDocument();
    expect(screen.getByTestId('attempt-item-0')).toHaveTextContent('8 + 7 = 15');
  });

  it('clears progress history when clicking Clear History', () => {
    saveAttempt({
      questionId: 'q_seed_1',
      operation: 'add',
      left: 8,
      right: 7,
      answer: 15,
      selectedAnswer: 15,
      correct: true,
      responseTimeMs: 2000,
      skill: 'make_10',
      hintUsed: false,
      timestamp: '2026-09-16T10:05:00.000Z',
      playerId: 'player-local',
    });

    render(<App />);

    fireEvent.click(screen.getByTestId('tab-history'));
    expect(screen.getByTestId('total-attempts-metric')).toHaveTextContent('1');

    // Click Clear History button
    fireEvent.click(screen.getByTestId('clear-progress-button'));

    expect(screen.getByTestId('total-attempts-metric')).toHaveTextContent('0');
    expect(screen.getByText(/No attempts recorded yet/i)).toBeInTheDocument();
  });
});

describe('reasoning Training entry', () => {
  it('opens opted-in reasoning practice, resumes saved work and returns to arithmetic Training', async () => {
    saveReasoningSettings('player-local', {
      schemaVersion: 1,
      enabledFamilies: ['instruction_chain'],
    });
    render(<App />);
    fireEvent.click(screen.getByTestId('mode-tab-training'));
    fireEvent.click(screen.getByRole('button', { name: /Đọc đề, chọn bước/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }));
    expect(screen.getByRole('region', { name: 'Luyện đọc đề và lập kế hoạch' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '← Về luyện tính' }));
    expect(screen.getByTestId('training-mode-banner')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /Đọc đề, chọn bước/ }));
    expect(screen.getByText('Số liền sau của 7 là số nào?')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Bắt đầu' })).not.toBeInTheDocument();
  });
  it('keeps reasoning unavailable for a child who has not opted in', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('mode-tab-training'));
    expect(screen.queryByRole('button', { name: /Đọc đề, chọn bước/ })).not.toBeInTheDocument();
  });
});

describe('Adventure reasoning missions', () => {
  const enable = (arrowsUsed: number, adventureEnabled = true) => {
    saveReasoningSettings('player-local', {
      schemaVersion: 1,
      enabledFamilies: ['instruction_chain'],
      ...(adventureEnabled ? { adventureEnabled } : {}),
    });
    saveDailySession({
      ...startDailySession({ playerId: 'player-local', storage: localStorage }),
      arrowsUsed,
    });
  };
  const today = () => getActiveDailySession({ playerId: 'player-local', storage: localStorage })!;
  const attempts = () =>
    loadMissionWorkspace('player-local', localStorage).items.map((i) => i.local);
  const solveStep = (index: number) => {
    const step = attempts()[0].mission.steps[index];
    const choice = step.choices.findIndex((item) => item.id === step.correctChoiceId);
    fireEvent.keyDown(screen.getByRole('region'), { key: String(choice + 1) });
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
  };

  it('offers nothing before five arrows or when the parent has not opted in', () => {
    enable(4);
    render(<App />);
    expect(screen.getByTestId('question-expression')).toBeInTheDocument();
    cleanup();
    enable(9, false);
    render(<App />);
    expect(screen.getByTestId('question-expression')).toBeInTheDocument();
  });

  it('spends one arrow and grants one reward only when the mission completes', async () => {
    enable(5);
    const xpBefore = loadPlayerRewards('player-local', localStorage).totalXp;
    render(<App />);
    expect(await screen.findByRole('heading', { name: /Nhiệm vụ suy luận/ })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu nhiệm vụ' }));
    for (let i = 0; i < 3; i++) {
      solveStep(i);
      expect(today().arrowsUsed).toBe(5);
    }
    const step = attempts()[0].mission.steps[3];
    fireEvent.keyDown(screen.getByRole('region'), {
      key: String(step.choices.findIndex((item) => item.id === step.correctChoiceId) + 1),
    });
    expect(today()).toMatchObject({ arrowsUsed: 6, hits: 1 });
    expect(today().missionAttemptIds).toEqual([attempts()[0].id]);
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    expect(screen.getByText(/Nhiệm vụ dùng 1 mũi tên/)).toBeVisible();
    const xp = loadPlayerRewards('player-local', localStorage).totalXp;
    expect(xp).toBeGreaterThan(xpBefore);
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    expect(await screen.findByTestId('question-expression')).toBeInTheDocument();
    expect(today().arrowsUsed).toBe(6);
    expect(loadPlayerRewards('player-local', localStorage).totalXp).toBe(xp);
    expect(attempts()[0]).toMatchObject({ mode: 'adventure' });
  });

  it('declining spends nothing and waits another five arrows', async () => {
    enable(5);
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Để sau' }));
    expect(await screen.findByTestId('question-expression')).toBeInTheDocument();
    expect(today()).toMatchObject({ arrowsUsed: 5, missionOfferedAtArrow: 5 });
    expect(attempts()).toHaveLength(0);
    cleanup();
    render(<App />);
    expect(screen.getByTestId('question-expression')).toBeInTheDocument();
  });

  it('resumes a paused mission after a reload without charging an arrow', async () => {
    enable(5);
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Bắt đầu nhiệm vụ' }));
    solveStep(0);
    fireEvent.click(screen.getByRole('button', { name: /Tạm dừng/ }));
    expect(await screen.findByTestId('question-expression')).toBeInTheDocument();
    expect(today().arrowsUsed).toBe(5);
    cleanup();
    render(<App />);
    expect(await screen.findByText('Hiệu của 14 và 8 được viết như thế nào?')).toBeVisible();
    expect(attempts()).toHaveLength(1);
    expect(attempts()[0].responses).toHaveLength(1);
  });
});
