import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { GameScreen } from './GameScreen';
import { AppContent } from '../App';
import { AuthProvider } from '../context/AuthContext';
import { gamepadManager, XboxButton } from '../input/gamepad';
import {
  type Question,
  createMemoryStorage,
} from '@math-archer/learning-engine';

describe('Phase 10 — Xbox Controller Integration', () => {
  const mockQuestion: Question = {
    id: 'q_test_13_add_8',
    left: 13,
    right: 8,
    operation: 'add',
    answer: 21,
    correctAnswer: 21,
    skill: 'cross_10_addition',
    choices: [
      { element: 'fire', value: 21, category: 'correct' },
      { element: 'ice', value: 20, category: 'too_low' },
      { element: 'wind', value: 22, category: 'too_high' },
      { element: 'earth', value: 19, category: 'common_mistake' },
    ],
  };

  beforeEach(() => {
    localStorage.clear();
    document.body.className = '';
  });

  afterEach(() => {
    gamepadManager.destroy();
  });

  describe('Task 10.1 — Controller mapping (A→Fire, B→Ice, X→Wind, Y→Earth)', () => {
    it('Done When: Choices render authentic Xbox controller button badges', () => {
      render(<GameScreen initialQuestion={mockQuestion} />);

      const fireHint = screen.getByTestId('controller-hint-fire');
      const iceHint = screen.getByTestId('controller-hint-ice');
      const windHint = screen.getByTestId('controller-hint-wind');
      const earthHint = screen.getByTestId('controller-hint-earth');

      expect(fireHint).toHaveTextContent('A');
      expect(fireHint).toHaveClass('btn-a');

      expect(iceHint).toHaveTextContent('B');
      expect(iceHint).toHaveClass('btn-b');

      expect(windHint).toHaveTextContent('X');
      expect(windHint).toHaveClass('btn-x');

      expect(earthHint).toHaveTextContent('Y');
      expect(earthHint).toHaveClass('btn-y');
    });

    it('Done When: A child can answer questions by pressing A (Fire), B (Ice), X (Wind), Y (Earth)', () => {
      const onAnswerSubmit = vi.fn();

      render(
        <GameScreen
          initialQuestion={mockQuestion}
          autoAdvanceDelayMs={100}
          onAnswerSubmit={onAnswerSubmit}
        />
      );

      // Pressing A button activates Fire arrow
      act(() => {
        gamepadManager.simulateButtonDown(XboxButton.A);
      });

      expect(onAnswerSubmit).toHaveBeenCalledTimes(1);
      expect(onAnswerSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ element: 'fire', value: 21 }),
        true
      );
    });

    it('Done When: Pressing B activates Ice arrow without mouse/touch', () => {
      const onAnswerSubmit = vi.fn();

      render(
        <GameScreen
          initialQuestion={mockQuestion}
          autoAdvanceDelayMs={100}
          onAnswerSubmit={onAnswerSubmit}
        />
      );

      act(() => {
        gamepadManager.simulateButtonDown(XboxButton.B);
      });

      expect(onAnswerSubmit).toHaveBeenCalledTimes(1);
      expect(onAnswerSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ element: 'ice', value: 20 }),
        false
      );
    });

    it('Done When: Pressing X activates Wind arrow and Y activates Earth arrow', () => {
      const onAnswerSubmitWind = vi.fn();

      const { unmount } = render(
        <GameScreen
          initialQuestion={mockQuestion}
          autoAdvanceDelayMs={100}
          onAnswerSubmit={onAnswerSubmitWind}
        />
      );

      act(() => {
        gamepadManager.simulateButtonDown(XboxButton.X);
      });

      expect(onAnswerSubmitWind).toHaveBeenCalledWith(
        expect.objectContaining({ element: 'wind', value: 22 }),
        false
      );

      unmount();

      const onAnswerSubmitEarth = vi.fn();
      render(
        <GameScreen
          initialQuestion={mockQuestion}
          autoAdvanceDelayMs={100}
          onAnswerSubmit={onAnswerSubmitEarth}
        />
      );

      act(() => {
        gamepadManager.simulateButtonDown(XboxButton.Y);
      });

      expect(onAnswerSubmitEarth).toHaveBeenCalledWith(
        expect.objectContaining({ element: 'earth', value: 19 }),
        false
      );
    });
  });

  describe('Task 10.2 — Focus/navigation', () => {
    it('Done When: Child can navigate 2x2 arrow choices with D-pad directional input', () => {
      render(<GameScreen initialQuestion={mockQuestion} />);

      const fireBtn = screen.getByTestId('choice-fire');
      const iceBtn = screen.getByTestId('choice-ice');
      const windBtn = screen.getByTestId('choice-wind');
      const earthBtn = screen.getByTestId('choice-earth');

      // Initial D-pad Down highlights wind from top-left (fire)
      act(() => {
        gamepadManager.simulateDirection('down');
      });
      expect(windBtn).toHaveAttribute('data-controller-focus', 'true');
      expect(windBtn).toHaveClass('controller-focused');

      // Navigate with D-pad: Right moves to earth
      act(() => {
        gamepadManager.simulateDirection('right');
      });
      expect(earthBtn).toHaveAttribute('data-controller-focus', 'true');
      expect(earthBtn).toHaveClass('controller-focused');

      // D-pad Up moves to ice
      act(() => {
        gamepadManager.simulateDirection('up');
      });
      expect(iceBtn).toHaveAttribute('data-controller-focus', 'true');
      expect(iceBtn).toHaveClass('controller-focused');

      // D-pad Left moves to fire
      act(() => {
        gamepadManager.simulateDirection('left');
      });
      expect(fireBtn).toHaveAttribute('data-controller-focus', 'true');
      expect(fireBtn).toHaveClass('controller-focused');
    });

    it('Done When: Child can navigate menus and finish the daily session using only controller', () => {
      const storage = createMemoryStorage();

      render(
        <GameScreen
          storage={storage}
          maxArrows={1}
          autoAdvanceDelayMs={0}
          allowSameDayRestart={true}
        />
      );

      // 1. Answer question with A button
      act(() => {
        gamepadManager.simulateButtonDown(XboxButton.A);
      });

      // 2. Daily session is completed and session complete card appears
      expect(screen.getByTestId('session-complete')).toBeInTheDocument();

      // Controller focus is initialized on action 0: Training mode
      const trainingBtn = screen.getByTestId('go-to-training-button');
      const restartBtn = screen.getByTestId('restart-button');

      expect(trainingBtn).toHaveAttribute('data-controller-focus', 'true');
      expect(trainingBtn).toHaveClass('controller-focused');

      // 3. Child uses D-pad down to navigate to Restart button
      act(() => {
        gamepadManager.simulateDirection('down');
      });
      expect(restartBtn).toHaveAttribute('data-controller-focus', 'true');
      expect(restartBtn).toHaveClass('controller-focused');

      // 4. Child presses A to restart and start a new session using only controller
      act(() => {
        gamepadManager.simulateButtonDown(XboxButton.A);
      });

      // Game is restarted and back to active question screen!
      expect(screen.queryByTestId('session-complete')).not.toBeInTheDocument();
      expect(screen.getByTestId('question-expression')).toBeInTheDocument();
    });

    it('Done When: Bumpers (LB/RB) switch tabs in App navigation', () => {
      render(
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      );

      // Initial tab is game
      expect(screen.getByTestId('tab-game')).toHaveClass('active');

      // Pressing RB moves to World tab
      act(() => {
        gamepadManager.simulateButtonDown(XboxButton.RB);
      });
      expect(screen.getByTestId('tab-world')).toHaveClass('active');

      // Pressing RB again moves to Royal Armory (rewards) tab
      act(() => {
        gamepadManager.simulateButtonDown(XboxButton.RB);
      });
      expect(screen.getByTestId('tab-rewards')).toHaveClass('active');

      // Pressing LB returns to World tab
      act(() => {
        gamepadManager.simulateButtonDown(XboxButton.LB);
      });
      expect(screen.getByTestId('tab-world')).toHaveClass('active');

      // Controller status badge is displayed
      expect(screen.getByTestId('controller-status-badge')).toBeInTheDocument();
    });
  });
});
