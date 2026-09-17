import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from './App';
import { saveAttempt, saveDailySession } from '@math-archer/learning-engine';

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
    const today = new Date().toISOString().slice(0, 10);
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
