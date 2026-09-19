import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { GameScreen, type GameMode } from './GameScreen';
import {
  type Question,
  type SkillProfile,
  createMemoryStorage,
  createControlledTestProfile,
  loadProfile,
  getActiveDailySession,
  startDailySession,
  saveDailySession,
  completeSession,
  loadAttempts,
  loadLocalProgress,
} from '@math-archer/learning-engine';
import { SyncManager } from '../sync';
import { MathArcherApiClient } from '../api/client';

beforeEach(() => {
  localStorage.clear();
});

describe('Task 3.1 — Create the game screen', () => {
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

  it('Done When: Question is visible', () => {
    render(<GameScreen initialQuestion={mockQuestion} />);

    // Archer icon header is visible
    expect(screen.getByRole('img', { name: 'archer' })).toBeInTheDocument();

    // Expression is visible
    const expression = screen.getByTestId('question-expression');
    expect(expression).toBeInTheDocument();
    expect(expression).toHaveTextContent('13 + 8');
  });

  it('Done When: Four answers are visible', () => {
    render(<GameScreen initialQuestion={mockQuestion} />);

    // Four elemental choices are visible
    const fireChoice = screen.getByTestId('choice-fire');
    const iceChoice = screen.getByTestId('choice-ice');
    const windChoice = screen.getByTestId('choice-wind');
    const earthChoice = screen.getByTestId('choice-earth');

    expect(fireChoice).toBeInTheDocument();
    expect(fireChoice).toHaveTextContent('21');
    expect(fireChoice).toHaveTextContent('🔥');

    expect(iceChoice).toBeInTheDocument();
    expect(iceChoice).toHaveTextContent('20');
    expect(iceChoice).toHaveTextContent('❄️');

    expect(windChoice).toBeInTheDocument();
    expect(windChoice).toHaveTextContent('22');
    expect(windChoice).toHaveTextContent('💨');

    expect(earthChoice).toBeInTheDocument();
    expect(earthChoice).toHaveTextContent('19');
    expect(earthChoice).toHaveTextContent('🪨');

    // Progress counter shows initial state
    expect(screen.getByTestId('arrow-counter')).toHaveTextContent('1 / 50');
  });

  it('Done When: Child can tap/click an answer and correct answer is detected', () => {
    const onAnswerSubmit = vi.fn();

    render(
      <GameScreen
        initialQuestion={mockQuestion}
        autoAdvanceDelayMs={500}
        onAnswerSubmit={onAnswerSubmit}
      />
    );

    const correctChoiceBtn = screen.getByTestId('choice-fire');
    fireEvent.click(correctChoiceBtn);

    // Answer callback was invoked with choice and isCorrect=true
    expect(onAnswerSubmit).toHaveBeenCalledTimes(1);
    expect(onAnswerSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ element: 'fire', value: 21 }),
      true
    );

    // Correct feedback is rendered
    expect(screen.getByTestId('feedback-banner')).toHaveTextContent('🎯 Hit!');
    expect(correctChoiceBtn).toHaveClass('selected-correct');
  });

  it('Detects wrong answer and reveals the correct answer', () => {
    const onAnswerSubmit = vi.fn();

    render(
      <GameScreen
        initialQuestion={mockQuestion}
        autoAdvanceDelayMs={500}
        onAnswerSubmit={onAnswerSubmit}
      />
    );

    const wrongChoiceBtn = screen.getByTestId('choice-ice');
    fireEvent.click(wrongChoiceBtn);

    // Answer callback was invoked with choice and isCorrect=false
    expect(onAnswerSubmit).toHaveBeenCalledTimes(1);
    expect(onAnswerSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ element: 'ice', value: 20 }),
      false
    );

    // Miss feedback is rendered
    expect(screen.getByTestId('feedback-banner')).toHaveTextContent('❌ Miss!');
    expect(wrongChoiceBtn).toHaveClass('selected-wrong');

    // Correct answer is revealed
    const correctBtn = screen.getByTestId('choice-fire');
    expect(correctBtn).toHaveClass('revealed-correct');
  });

  it('Done When: Next question appears and arrow counter advances', () => {
    vi.useFakeTimers();

    const onNextQuestion = vi.fn();

    render(
      <GameScreen
        initialQuestion={mockQuestion}
        autoAdvanceDelayMs={300}
        onNextQuestion={onNextQuestion}
      />
    );

    expect(screen.getByTestId('arrow-counter')).toHaveTextContent('1 / 50');

    // Tap answer
    fireEvent.click(screen.getByTestId('choice-fire'));

    // Fast-forward delay timer
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Arrow counter advances to 2 / 50
    expect(screen.getByTestId('arrow-counter')).toHaveTextContent('2 / 50');

    // Next question loaded
    expect(onNextQuestion).toHaveBeenCalledTimes(1);

    // Feedback banner is cleared for the new question
    expect(screen.getByTestId('feedback-banner')).toBeEmptyDOMElement();

    vi.useRealTimers();
  });

  it('Supports keyboard shortcuts (keys 1, 2, 3, 4)', () => {
    const onAnswerSubmit = vi.fn();

    render(
      <GameScreen
        initialQuestion={mockQuestion}
        autoAdvanceDelayMs={500}
        onAnswerSubmit={onAnswerSubmit}
      />
    );

    // Press key '1' corresponding to the first choice (fire: 21)
    fireEvent.keyDown(window, { key: '1' });

    expect(onAnswerSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ element: 'fire', value: 21 }),
      true
    );
    expect(screen.getByTestId('feedback-banner')).toHaveTextContent('🎯 Hit!');
  });

  it('Displays session completion when all 50 arrows are used', () => {
    vi.useFakeTimers();

    const onSessionComplete = vi.fn();

    render(
      <GameScreen
        initialQuestion={mockQuestion}
        maxArrows={2}
        initialArrowIndex={2}
        autoAdvanceDelayMs={100}
        allowSameDayRestart={true}
        onSessionComplete={onSessionComplete}
      />
    );

    expect(screen.getByTestId('arrow-counter')).toHaveTextContent('2 / 2');

    // Answer the final arrow
    fireEvent.click(screen.getByTestId('choice-fire'));

    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Session completion card is displayed
    expect(screen.getByTestId('session-complete')).toBeInTheDocument();
    expect(screen.getByText(/Daily Practice Complete!/i)).toBeInTheDocument();
    expect(onSessionComplete).toHaveBeenCalledWith({ hits: 1, total: 1 });

    // Restart resets session
    fireEvent.click(screen.getByTestId('restart-button'));
    expect(screen.getByTestId('arrow-counter')).toHaveTextContent('1 / 2');

    vi.useRealTimers();
  });
});

describe('Task 3.2 — Add the shooting interaction', () => {
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

  it('Done When: Full shooting sequence on selection (select -> archer shoots -> arrow hits target -> feedback -> next question)', () => {
    vi.useFakeTimers();
    const onAnswerSubmit = vi.fn();
    const onNextQuestion = vi.fn();

    render(
      <GameScreen
        initialQuestion={mockQuestion}
        autoAdvanceDelayMs={500}
        shotFlightDurationMs={150}
        onAnswerSubmit={onAnswerSubmit}
        onNextQuestion={onNextQuestion}
      />
    );

    // Initial state: Archer is idle, no arrow in flight, target has no hit state
    const archer = screen.getByTestId('archer-character');
    expect(archer).toHaveAttribute('data-state', 'idle');
    expect(screen.queryByTestId('flying-arrow')).not.toBeInTheDocument();
    const targetCard = screen.getByTestId('target-card');
    expect(targetCard).toHaveAttribute('data-hit-state', 'idle');

    // Step 1: select arrow
    const fireChoice = screen.getByTestId('choice-fire');
    fireEvent.click(fireChoice);

    // Step 2: archer shoots!
    expect(onAnswerSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ element: 'fire', value: 21 }),
      true
    );
    expect(archer).toHaveAttribute('data-state', 'released');
    expect(screen.getByTestId('archer-arrow-nock')).toHaveTextContent('🔥');

    const flyingArrow = screen.getByTestId('flying-arrow');
    expect(flyingArrow).toBeInTheDocument();
    expect(flyingArrow).toHaveAttribute('data-element', 'fire');
    expect(flyingArrow).toHaveAttribute('data-outcome', 'hit');
    expect(flyingArrow).toHaveClass('element-fire');

    // Step 3: arrow hits target after flight duration (150ms)
    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(targetCard).toHaveAttribute('data-hit-state', 'hit');
    expect(targetCard).toHaveClass('target-impact-hit');
    expect(screen.getByTestId('target-hit-effect')).toBeInTheDocument();
    expect(screen.getByText('✨🎯✨')).toBeInTheDocument();

    // Step 4: correct/wrong feedback
    expect(screen.getByTestId('feedback-banner')).toHaveTextContent('🎯 Hit!');
    expect(fireChoice).toHaveClass('selected-correct');

    // Step 5: next question after remaining duration (total 500ms)
    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(onNextQuestion).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('arrow-counter')).toHaveTextContent('2 / 50');

    // States are reset for the new question
    expect(archer).toHaveAttribute('data-state', 'idle');
    expect(screen.queryByTestId('flying-arrow')).not.toBeInTheDocument();
    expect(screen.getByTestId('target-card')).toHaveAttribute('data-hit-state', 'idle');

    vi.useRealTimers();
  });

  it('Done When: Miss sequence deflects off target with wobble and reveals correct choice', () => {
    vi.useFakeTimers();
    const onAnswerSubmit = vi.fn();

    render(
      <GameScreen
        initialQuestion={mockQuestion}
        autoAdvanceDelayMs={400}
        shotFlightDurationMs={120}
        onAnswerSubmit={onAnswerSubmit}
      />
    );

    // Child selects an incorrect choice (Ice: 20)
    const iceChoice = screen.getByTestId('choice-ice');
    fireEvent.click(iceChoice);

    expect(onAnswerSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ element: 'ice', value: 20 }),
      false
    );

    // Flying arrow launched with miss outcome
    const flyingArrow = screen.getByTestId('flying-arrow');
    expect(flyingArrow).toBeInTheDocument();
    expect(flyingArrow).toHaveAttribute('data-element', 'ice');
    expect(flyingArrow).toHaveAttribute('data-outcome', 'miss');

    // Arrow reaches target
    act(() => {
      vi.advanceTimersByTime(120);
    });

    const targetCard = screen.getByTestId('target-card');
    expect(targetCard).toHaveAttribute('data-hit-state', 'miss');
    expect(targetCard).toHaveClass('target-impact-miss');
    expect(screen.getByTestId('target-miss-effect')).toBeInTheDocument();

    // Feedback shows Miss and reveals the correct Fire arrow
    expect(screen.getByTestId('feedback-banner')).toHaveTextContent('❌ Miss!');
    expect(iceChoice).toHaveClass('selected-wrong');
    expect(screen.getByTestId('choice-fire')).toHaveClass('revealed-correct');

    vi.useRealTimers();
  });

  it('Shoots corresponding elemental arrow for each element choice (Wind & Earth)', () => {
    vi.useFakeTimers();

    const { rerender } = render(
      <GameScreen
        initialQuestion={mockQuestion}
        autoAdvanceDelayMs={500}
        shotFlightDurationMs={150}
      />
    );

    // Click Wind arrow
    fireEvent.click(screen.getByTestId('choice-wind'));
    let flyingArrow = screen.getByTestId('flying-arrow');
    expect(flyingArrow).toHaveAttribute('data-element', 'wind');
    expect(screen.getByTestId('archer-arrow-nock')).toHaveTextContent('💨');

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Re-render with fresh question for Earth
    rerender(
      <GameScreen
        initialQuestion={mockQuestion}
        autoAdvanceDelayMs={500}
        shotFlightDurationMs={150}
      />
    );

    // Click Earth arrow
    fireEvent.click(screen.getByTestId('choice-earth'));
    flyingArrow = screen.getByTestId('flying-arrow');
    expect(flyingArrow).toHaveAttribute('data-element', 'earth');
    expect(screen.getByTestId('archer-arrow-nock')).toHaveTextContent('🪨');

    vi.useRealTimers();
  });

  it('Keyboard shortcut triggers shooting interaction', () => {
    vi.useFakeTimers();

    render(
      <GameScreen
        initialQuestion={mockQuestion}
        autoAdvanceDelayMs={400}
        shotFlightDurationMs={100}
      />
    );

    // Press key 1 (Fire arrow)
    fireEvent.keyDown(window, { key: '1' });

    expect(screen.getByTestId('archer-character')).toHaveAttribute('data-state', 'released');
    const flyingArrow = screen.getByTestId('flying-arrow');
    expect(flyingArrow).toHaveAttribute('data-element', 'fire');

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByTestId('target-card')).toHaveAttribute('data-hit-state', 'hit');

    vi.useRealTimers();
  });

  it('Prevents double shooting while an arrow is already in flight', () => {
    vi.useFakeTimers();
    const onAnswerSubmit = vi.fn();

    render(
      <GameScreen
        initialQuestion={mockQuestion}
        autoAdvanceDelayMs={500}
        shotFlightDurationMs={150}
        onAnswerSubmit={onAnswerSubmit}
      />
    );

    // First shot
    fireEvent.click(screen.getByTestId('choice-fire'));
    expect(onAnswerSubmit).toHaveBeenCalledTimes(1);

    // Second click during flight
    fireEvent.click(screen.getByTestId('choice-ice'));
    expect(onAnswerSubmit).toHaveBeenCalledTimes(1); // Not called again!

    vi.useRealTimers();
  });
});

describe('Task 3.3 — Add daily 50-arrow session', () => {
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

  it('Done When: Starting a session gives 50 arrows', () => {
    const storage = createMemoryStorage();

    render(
      <GameScreen initialQuestion={mockQuestion} storage={storage} sessionDate="2026-09-16" />
    );

    // Initial arrow counter shows 1 / 50
    expect(screen.getByTestId('arrow-counter')).toHaveTextContent('1 / 50');
  });

  it('Done When: Each submitted answer consumes exactly one arrow', () => {
    vi.useFakeTimers();
    const storage = createMemoryStorage();

    render(
      <GameScreen
        initialQuestion={mockQuestion}
        autoAdvanceDelayMs={100}
        storage={storage}
        sessionDate="2026-09-16"
      />
    );

    expect(screen.getByTestId('arrow-counter')).toHaveTextContent('1 / 50');

    // First answer consumed
    fireEvent.click(screen.getByTestId('choice-fire'));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByTestId('arrow-counter')).toHaveTextContent('2 / 50');

    // Second answer consumed
    fireEvent.click(screen.getByTestId('choice-fire'));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByTestId('arrow-counter')).toHaveTextContent('3 / 50');

    vi.useRealTimers();
  });

  it('Done When: Refreshing the page does not restore spent arrows', () => {
    vi.useFakeTimers();
    const storage = createMemoryStorage();

    // 1. Initial play: answer 2 questions
    const { unmount } = render(
      <GameScreen
        initialQuestion={mockQuestion}
        autoAdvanceDelayMs={100}
        storage={storage}
        sessionDate="2026-09-16"
      />
    );

    fireEvent.click(screen.getByTestId('choice-fire'));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByTestId('arrow-counter')).toHaveTextContent('2 / 50');

    fireEvent.click(screen.getByTestId('choice-fire'));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByTestId('arrow-counter')).toHaveTextContent('3 / 50');

    // 2. Simulate page refresh: unmount GameScreen and remount with the SAME storage
    unmount();

    render(
      <GameScreen
        initialQuestion={mockQuestion}
        autoAdvanceDelayMs={100}
        storage={storage}
        sessionDate="2026-09-16"
      />
    );

    // Spent arrows were NOT restored: counter immediately resumes at 3 / 50
    expect(screen.getByTestId('arrow-counter')).toHaveTextContent('3 / 50');

    // Child answers question 3
    fireEvent.click(screen.getByTestId('choice-fire'));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByTestId('arrow-counter')).toHaveTextContent('4 / 50');

    vi.useRealTimers();
  });

  it('Done When: 50/50 ends the normal session', () => {
    vi.useFakeTimers();
    const storage = createMemoryStorage();
    const onSessionComplete = vi.fn();

    let secondQ: Question | null = null;

    // Use maxArrows=2 for test brevity
    render(
      <GameScreen
        initialQuestion={mockQuestion}
        maxArrows={2}
        autoAdvanceDelayMs={100}
        storage={storage}
        sessionDate="2026-09-16"
        onNextQuestion={(q) => {
          secondQ = q;
        }}
        onSessionComplete={onSessionComplete}
      />
    );

    // Arrow 1
    expect(screen.getByTestId('arrow-counter')).toHaveTextContent('1 / 2');
    fireEvent.click(screen.getByTestId('choice-fire'));
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Arrow 2 (final arrow)
    expect(screen.getByTestId('arrow-counter')).toHaveTextContent('2 / 2');
    const correctChoice = secondQ!.choices.find((c) => c.category === 'correct')!;
    fireEvent.click(screen.getByTestId(`choice-${correctChoice.element}`));
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // 2/2 ends the session
    expect(screen.getByTestId('session-complete')).toBeInTheDocument();
    expect(screen.getByText(/Daily Practice Complete!/i)).toBeInTheDocument();
    expect(screen.getByTestId('session-complete-notice')).toHaveTextContent(
      /All daily arrows used for today/i
    );
    expect(onSessionComplete).toHaveBeenCalledWith({ hits: 2, total: 2 });

    vi.useRealTimers();
  });

  it('Done When: A second session cannot give another 50 arrows on the same day', () => {
    vi.useFakeTimers();
    const storage = createMemoryStorage();

    // 1. Complete today's session (maxArrows=2)
    const { unmount } = render(
      <GameScreen
        initialQuestion={mockQuestion}
        maxArrows={2}
        autoAdvanceDelayMs={100}
        storage={storage}
        sessionDate="2026-09-16"
      />
    );

    fireEvent.click(screen.getByTestId('choice-fire'));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    fireEvent.click(screen.getByTestId('choice-fire'));
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByTestId('session-complete')).toBeInTheDocument();

    // 2. Child reloads the page or reopens the game on the SAME day
    unmount();

    render(
      <GameScreen
        initialQuestion={mockQuestion}
        maxArrows={2}
        storage={storage}
        sessionDate="2026-09-16"
      />
    );

    // Must immediately render completed state: 0 remaining arrows, no new questions
    expect(screen.getByTestId('session-complete')).toBeInTheDocument();
    expect(screen.queryByTestId('arrow-counter')).not.toBeInTheDocument();

    // Attempting to restart on the same day is prohibited
    const restartBtn = screen.getByTestId('restart-button');
    expect(restartBtn).toBeDisabled();
    expect(restartBtn).toHaveTextContent('🏹 Daily Practice Finished');

    fireEvent.click(restartBtn);
    // Remains on the completion card
    expect(screen.getByTestId('session-complete')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('Allows fresh 50 arrows when starting on the next day', () => {
    vi.useFakeTimers();
    const storage = createMemoryStorage();

    // Complete day 1 session
    const { unmount } = render(
      <GameScreen
        initialQuestion={mockQuestion}
        maxArrows={2}
        autoAdvanceDelayMs={100}
        storage={storage}
        sessionDate="2026-09-16"
      />
    );

    fireEvent.click(screen.getByTestId('choice-fire'));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    fireEvent.click(screen.getByTestId('choice-fire'));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByTestId('session-complete')).toBeInTheDocument();

    unmount();

    // Launch on next day: 2026-09-17
    render(
      <GameScreen
        initialQuestion={mockQuestion}
        maxArrows={50}
        storage={storage}
        sessionDate="2026-09-17"
      />
    );

    // Fresh 50 arrows available
    expect(screen.getByTestId('arrow-counter')).toHaveTextContent('1 / 50');

    vi.useRealTimers();
  });
});

describe('Task 3.4 — Connect the real learning engine', () => {
  it('connects the learning engine loop: SkillProfile -> selectNextQuestion -> Attempt -> recordAttempt -> updated Profile', () => {
    vi.useFakeTimers();
    const storage = createMemoryStorage();
    const onProfileChange = vi.fn();
    const onNextQuestion = vi.fn();

    // 1. Initial profile loaded into GameScreen
    const initialProfile = createControlledTestProfile('weak_make_10', 'player-loop-test');

    render(
      <GameScreen
        initialProfile={initialProfile}
        storage={storage}
        playerId="player-loop-test"
        autoAdvanceDelayMs={100}
        onProfileChange={onProfileChange}
        onNextQuestion={onNextQuestion}
      />
    );

    // Initial adaptation is visible
    expect(screen.getByTestId('active-skill-badge')).toHaveTextContent('Make 10');
    expect(screen.getByTestId('pedagogical-category-badge')).toHaveTextContent('Needs Practice');

    const initialAttempts = initialProfile.skills.make_10.attempts;

    // 2. Child answers the question
    const choices = screen.getAllByRole('button', { name: /arrow/i });
    fireEvent.click(choices[0]);

    // 3. recordAttempt was executed and profile was updated
    expect(onProfileChange).toHaveBeenCalledTimes(1);
    const updatedProfile: SkillProfile = onProfileChange.mock.calls[0][0];
    expect(updatedProfile).toBeDefined();
    expect(updatedProfile.skills.make_10.attempts).toBe(initialAttempts + 1);

    // 4. Advance timer to complete arrow flight and advance question
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // 5. Next question was generated using the updated profile
    expect(onNextQuestion).toHaveBeenCalledTimes(1);
    const nextQ = onNextQuestion.mock.calls[0][0];
    expect(nextQ).toBeDefined();

    // 6. Profile was persisted to storage
    const storedProfile = loadProfile('player-loop-test', storage);
    expect(storedProfile).toBeDefined();
    expect(storedProfile?.skills.make_10.attempts).toBe(initialAttempts + 1);

    vi.useRealTimers();
  });

  it('Done When: The game visibly adapts after a controlled test profile is loaded (weak_make_10)', () => {
    const controlledProfile = createControlledTestProfile('weak_make_10', 'player-test-1');

    render(<GameScreen initialProfile={controlledProfile} playerId="player-test-1" />);

    // Visibly adapts to Make 10:
    // 1. Active skill badge prominently displays Make 10
    const skillBadge = screen.getByTestId('active-skill-badge');
    expect(skillBadge).toBeInTheDocument();
    expect(skillBadge).toHaveTextContent('Make 10');

    // 2. Category badge displays weak practice focus
    const categoryBadge = screen.getByTestId('pedagogical-category-badge');
    expect(categoryBadge).toBeInTheDocument();
    expect(categoryBadge).toHaveTextContent('Needs Practice (Weak Focus)');

    // 3. Question expression is an addition problem targeting make-10 bonds
    const expression = screen.getByTestId('question-expression');
    expect(expression).toHaveTextContent('+');

    // 4. Mastery badge displays current mastery level from the profile
    const masteryBadge = screen.getByTestId('skill-mastery-badge');
    expect(masteryBadge).toBeInTheDocument();
    expect(masteryBadge).toHaveTextContent('weak');
  });

  it('Done When: The game visibly adapts after a controlled test profile is loaded (weak_subtraction)', () => {
    const controlledProfile = createControlledTestProfile('weak_subtraction', 'player-test-2');

    render(<GameScreen initialProfile={controlledProfile} playerId="player-test-2" />);

    // Visibly adapts to Subtraction:
    // 1. Active skill badge displays subtraction
    const skillBadge = screen.getByTestId('active-skill-badge');
    expect(skillBadge).toBeInTheDocument();
    expect(skillBadge.textContent?.toLowerCase()).toContain('subtraction');

    // 2. Expression uses subtraction operator '-'
    const expression = screen.getByTestId('question-expression');
    expect(expression).toHaveTextContent('-');

    // 3. Category badge indicates weak practice focus
    const categoryBadge = screen.getByTestId('pedagogical-category-badge');
    expect(categoryBadge).toHaveTextContent('Needs Practice');
  });

  it('Done When: The game visibly adapts via in-game profile selector toolbar', () => {
    render(<GameScreen showProfileSelector={true} />);

    // Initially fresh beginner
    expect(screen.getByTestId('active-skill-badge')).toHaveTextContent('Basic addition');

    // 1. User/tester selects "Weak at Make-10" preset
    const make10Btn = screen.getByTestId('load-preset-weak_make_10');
    fireEvent.click(make10Btn);

    // Game VISIBLY adapts immediately:
    expect(screen.getByTestId('active-skill-badge')).toHaveTextContent('Make 10');
    expect(screen.getByTestId('pedagogical-category-badge')).toHaveTextContent('Needs Practice');
    expect(make10Btn).toHaveClass('active');

    // 2. User/tester selects "Weak at Subtraction" preset
    const subBtn = screen.getByTestId('load-preset-weak_subtraction');
    fireEvent.click(subBtn);

    // Game VISIBLY adapts immediately to subtraction:
    expect(screen.getByTestId('active-skill-badge').textContent?.toLowerCase()).toContain(
      'subtraction'
    );
    expect(screen.getByTestId('question-expression')).toHaveTextContent('-');
    expect(subBtn).toHaveClass('active');
    expect(make10Btn).not.toHaveClass('active');

    // 3. User resets back to fresh beginner
    const resetBtn = screen.getByTestId('load-preset-fresh_beginner');
    fireEvent.click(resetBtn);

    expect(screen.getByTestId('active-skill-badge')).toHaveTextContent('Basic addition');
    expect(resetBtn).toHaveClass('active');
  });

  it('shows the controlled test profile bar by default in development environment', () => {
    render(<GameScreen />);
    expect(screen.getByTestId('profile-selector-bar')).toBeInTheDocument();
    expect(screen.getByText(/Test Controlled Profile/i)).toBeInTheDocument();
  });

  it('hides the controlled test profile bar when showProfileSelector is false', () => {
    render(<GameScreen showProfileSelector={false} />);
    expect(screen.queryByTestId('profile-selector-bar')).not.toBeInTheDocument();
  });

  it('persists and restores updated skill profile across browser reloads / storage', () => {
    vi.useFakeTimers();
    const storage = createMemoryStorage();

    // 1. Mount with fresh profile and complete 1 question
    const { unmount } = render(
      <GameScreen storage={storage} playerId="persist-profile-player" autoAdvanceDelayMs={50} />
    );

    // Fire first answer
    const choices = screen.getAllByRole('button', { name: /arrow/i });
    fireEvent.click(choices[0]);

    act(() => {
      vi.advanceTimersByTime(50);
    });

    // Unmount (simulates navigating away or page refresh)
    unmount();

    // 2. Remount with same storage adapter
    render(<GameScreen storage={storage} playerId="persist-profile-player" />);

    // Profile was restored with 1 attempt recorded
    const saved = loadProfile('persist-profile-player', storage);
    expect(saved).toBeDefined();
    expect(saved?.skills.basic_addition.attempts).toBe(1);

    vi.useRealTimers();
  });
});

const make10Question8Add7: Question = {
  id: 'q_test_8_add_7',
  left: 8,
  right: 7,
  operation: 'add',
  answer: 15,
  correctAnswer: 15,
  skill: 'make_10',
  choices: [
    { element: 'fire', value: 15, category: 'correct' },
    { element: 'ice', value: 14, category: 'too_low' },
    { element: 'wind', value: 16, category: 'too_high' },
    { element: 'earth', value: 17, category: 'common_mistake' },
  ],
};

const make10Question9Add6: Question = {
  id: 'q_test_9_add_6',
  left: 9,
  right: 6,
  operation: 'add',
  answer: 15,
  correctAnswer: 15,
  skill: 'make_10',
  choices: [
    { element: 'fire', value: 15, category: 'correct' },
    { element: 'ice', value: 14, category: 'too_low' },
    { element: 'wind', value: 16, category: 'too_high' },
    { element: 'earth', value: 13, category: 'common_mistake' },
  ],
};

const make10Question7Add8: Question = {
  id: 'q_test_7_add_8',
  left: 7,
  right: 8,
  operation: 'add',
  answer: 15,
  correctAnswer: 15,
  skill: 'cross_10_addition',
  choices: [
    { element: 'fire', value: 15, category: 'correct' },
    { element: 'ice', value: 14, category: 'too_low' },
    { element: 'wind', value: 16, category: 'too_high' },
    { element: 'earth', value: 17, category: 'common_mistake' },
  ],
};

const basicAdditionQuestion: Question = {
  id: 'q_test_3_add_4',
  left: 3,
  right: 4,
  operation: 'add',
  answer: 7,
  correctAnswer: 7,
  skill: 'basic_addition',
  choices: [
    { element: 'fire', value: 7, category: 'correct' },
    { element: 'ice', value: 6, category: 'too_low' },
    { element: 'wind', value: 8, category: 'too_high' },
    { element: 'earth', value: 5, category: 'common_mistake' },
  ],
};

describe('Task 4.1 — Implement guided make-10 feedback', () => {
  it('Done When: The child can see a complete worked example after requesting help for 8 + 7', () => {
    render(<GameScreen initialQuestion={make10Question8Add7} mode="training" />);

    // Help button is visible for 8 + 7
    const helpBtn = screen.getByTestId('request-help-button');
    expect(helpBtn).toBeInTheDocument();
    expect(helpBtn).toHaveTextContent(/Make-10/i);

    // Click request help button
    fireEvent.click(helpBtn);

    // Modal and worked example card are displayed
    const workedExample = screen.getByTestId('worked-example-card');
    expect(workedExample).toBeInTheDocument();
    expect(screen.getByTestId('worked-example-title')).toHaveTextContent('8 + 7');

    // Step 1: Make 10 first (8 + 2 = 10)
    const step1 = screen.getByTestId('make10-step-1');
    expect(step1).toBeInTheDocument();
    expect(screen.getByTestId('step-1-equation')).toHaveTextContent('8 + 2 = 10');

    // Step 2: Split the second number (7 - 2 = 5)
    const step2 = screen.getByTestId('make10-step-2');
    expect(step2).toBeInTheDocument();
    expect(screen.getByTestId('step-2-equation')).toHaveTextContent('7 - 2 = 5');

    // Step 3: Add to 10 (10 + 5 = 15)
    const step3 = screen.getByTestId('make10-step-3');
    expect(step3).toBeInTheDocument();
    expect(screen.getByTestId('step-3-equation')).toHaveTextContent('10 + 5 = 15');

    // Summary equation
    expect(screen.getByTestId('summary-equation')).toHaveTextContent(
      '8 + 7 = 8 + 2 + 5 = 10 + 5 = 15'
    );

    // Ten frames visual model is rendered
    expect(screen.getByTestId('ten-frames-visual')).toBeInTheDocument();
  });

  it('Done When: The child can see a complete worked example for 9 + 6 and 7 + 8', () => {
    const { unmount } = render(
      <GameScreen initialQuestion={make10Question9Add6} mode="training" />
    );

    fireEvent.click(screen.getByTestId('request-help-button'));
    expect(screen.getByTestId('step-1-equation')).toHaveTextContent('9 + 1 = 10');
    expect(screen.getByTestId('step-2-equation')).toHaveTextContent('6 - 1 = 5');
    expect(screen.getByTestId('step-3-equation')).toHaveTextContent('10 + 5 = 15');
    expect(screen.getByTestId('summary-equation')).toHaveTextContent(
      '9 + 6 = 9 + 1 + 5 = 10 + 5 = 15'
    );

    unmount();

    render(<GameScreen initialQuestion={make10Question7Add8} mode="training" />);

    fireEvent.click(screen.getByTestId('request-help-button'));
    expect(screen.getByTestId('step-1-equation')).toHaveTextContent('7 + 3 = 10');
    expect(screen.getByTestId('step-2-equation')).toHaveTextContent('8 - 3 = 5');
    expect(screen.getByTestId('step-3-equation')).toHaveTextContent('10 + 5 = 15');
    expect(screen.getByTestId('summary-equation')).toHaveTextContent(
      '7 + 8 = 7 + 3 + 5 = 10 + 5 = 15'
    );
  });

  it('allows child to dismiss help and proceed to shoot an answer', () => {
    render(<GameScreen initialQuestion={make10Question8Add7} autoAdvanceDelayMs={100} />);

    fireEvent.click(screen.getByTestId('request-help-button'));
    expect(screen.getByTestId('worked-example-card')).toBeInTheDocument();

    // Child clicks dismiss button
    const closeBtn = screen.getByTestId('close-help-button');
    fireEvent.click(closeBtn);

    // Worked example card closed
    expect(screen.queryByTestId('worked-example-card')).not.toBeInTheDocument();

    // Now child can click answer
    const choiceBtn = screen.getByTestId('choice-fire');
    fireEvent.click(choiceBtn);

    expect(screen.getByTestId('feedback-banner')).toHaveTextContent('🎯 Hit!');
  });

  it('closes help modal when clicking the top close icon', () => {
    render(<GameScreen initialQuestion={make10Question8Add7} />);

    fireEvent.click(screen.getByTestId('request-help-button'));
    expect(screen.getByTestId('worked-example-card')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('close-help-icon'));
    expect(screen.queryByTestId('worked-example-card')).not.toBeInTheDocument();
  });

  it('records hintUsed: true on attempt and updates profile when help was requested', () => {
    let capturedProfile: SkillProfile | undefined;
    const storage = createMemoryStorage();

    render(
      <GameScreen
        initialQuestion={make10Question8Add7}
        storage={storage}
        playerId="test-hint-player"
        autoAdvanceDelayMs={0}
        onProfileChange={(p) => {
          capturedProfile = p;
        }}
      />
    );

    // Request help
    fireEvent.click(screen.getByTestId('request-help-button'));

    // Dismiss help
    fireEvent.click(screen.getByTestId('close-help-button'));

    // Shoot correct answer
    fireEvent.click(screen.getByTestId('choice-fire'));

    // Check captured profile
    expect(capturedProfile).toBeDefined();
    const make10Progress = capturedProfile?.skills.make_10;
    expect(make10Progress?.attempts).toBe(1);
    expect(make10Progress?.hintsUsed).toBe(1);
    expect(make10Progress?.hintRate).toBe(1);
  });

  it('records hintUsed: false when help was NOT requested', () => {
    let capturedProfile: SkillProfile | undefined;
    const storage = createMemoryStorage();

    render(
      <GameScreen
        initialQuestion={make10Question8Add7}
        storage={storage}
        playerId="test-no-hint-player"
        autoAdvanceDelayMs={0}
        onProfileChange={(p) => {
          capturedProfile = p;
        }}
      />
    );

    // Do NOT request help, shoot answer directly
    fireEvent.click(screen.getByTestId('choice-fire'));

    expect(capturedProfile).toBeDefined();
    const make10Progress = capturedProfile?.skills.make_10;
    expect(make10Progress?.attempts).toBe(1);
    expect(make10Progress?.hintsUsed).toBe(0);
    expect(make10Progress?.hintRate).toBe(0);
  });

  it('supports keyboard shortcuts H to open help and Escape to close help', () => {
    render(<GameScreen initialQuestion={make10Question8Add7} />);

    // Press H
    fireEvent.keyDown(window, { key: 'h' });
    expect(screen.getByTestId('worked-example-card')).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('worked-example-card')).not.toBeInTheDocument();
  });

  it('does not display make-10 help button on non-eligible questions (e.g. 3 + 4)', () => {
    render(<GameScreen initialQuestion={basicAdditionQuestion} />);

    expect(screen.queryByTestId('request-help-button')).not.toBeInTheDocument();
  });
});

describe('Task 4.2 — Implement hint levels', () => {
  it('Done When: Adventure mode does not automatically dump a full explanation', () => {
    render(<GameScreen initialQuestion={make10Question8Add7} mode="adventure" />);

    // Click request help
    fireEvent.click(screen.getByTestId('request-help-button'));

    // Strategy Hint is displayed
    expect(screen.getByTestId('strategy-hint-card')).toBeInTheDocument();
    expect(screen.getByTestId('strategy-hint-headline')).toHaveTextContent(/Make 10 first/i);
    expect(screen.getByTestId('strategy-hint-target')).toHaveTextContent('8 needs 2 to make 10');

    // Does NOT automatically dump full explanation elements (Step 2, Step 3, visual frames, full summary)
    expect(screen.queryByTestId('make10-step-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('make10-step-3')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ten-frames-visual')).not.toBeInTheDocument();
    expect(screen.queryByTestId('make10-summary')).not.toBeInTheDocument();
  });

  it('Done When: Training mode can show the complete explanation', () => {
    render(<GameScreen initialQuestion={make10Question8Add7} mode="training" />);

    // Click request help in training mode
    fireEvent.click(screen.getByTestId('request-help-button'));

    // Complete explanation is immediately shown
    expect(screen.getByTestId('full-explanation-content')).toBeInTheDocument();
    expect(screen.getByTestId('make10-step-1')).toBeInTheDocument();
    expect(screen.getByTestId('make10-step-2')).toBeInTheDocument();
    expect(screen.getByTestId('make10-step-3')).toBeInTheDocument();
    expect(screen.getByTestId('ten-frames-visual')).toBeInTheDocument();
    expect(screen.getByTestId('make10-summary')).toBeInTheDocument();
  });

  it('allows stepping through progressive hint levels: strategy hint -> partial decomposition -> full explanation', () => {
    render(<GameScreen initialQuestion={make10Question8Add7} mode="adventure" />);

    fireEvent.click(screen.getByTestId('request-help-button'));
    expect(screen.getByTestId('strategy-hint-card')).toBeInTheDocument();

    // Step to partial decomposition
    fireEvent.click(screen.getByTestId('show-partial-hint-button'));
    expect(screen.getByTestId('partial-decomposition-card')).toBeInTheDocument();
    expect(screen.getByTestId('step-1-equation')).toHaveTextContent('8 + 2 = 10');
    expect(screen.getByTestId('partial-split-equation')).toHaveTextContent('7 = 2 + 5');

    // Step to full explanation
    fireEvent.click(screen.getByTestId('show-full-explanation-button'));
    expect(screen.getByTestId('full-explanation-content')).toBeInTheDocument();
    expect(screen.getByTestId('make10-step-3')).toBeInTheDocument();
    expect(screen.getByTestId('ten-frames-visual')).toBeInTheDocument();
  });

  it('Done When: Hint usage and hint level are recorded on attempt and profile', () => {
    let capturedProfile: SkillProfile | undefined;
    const storage = createMemoryStorage();

    render(
      <GameScreen
        initialQuestion={make10Question8Add7}
        mode="adventure"
        storage={storage}
        playerId="test-hint-level-player"
        autoAdvanceDelayMs={0}
        onProfileChange={(p) => {
          capturedProfile = p;
        }}
      />
    );

    // Request help (opens at strategy hint)
    fireEvent.click(screen.getByTestId('request-help-button'));
    // Advance to partial decomposition
    fireEvent.click(screen.getByTestId('show-partial-hint-button'));
    // Close help and shoot
    fireEvent.click(screen.getByTestId('close-help-button'));
    fireEvent.click(screen.getByTestId('choice-fire'));

    expect(capturedProfile).toBeDefined();
    const progress = capturedProfile?.skills.make_10;
    expect(progress?.hintsUsed).toBe(1);
    expect(progress?.hintRate).toBe(1);
    expect(progress?.hintLevels?.partial_decomposition).toBe(1);
  });

  it('Done When: Repeated hint use influences skill assessment (score & mastery level)', () => {
    let capturedProfile: SkillProfile | undefined;
    const storage = createMemoryStorage();

    render(
      <GameScreen
        initialQuestion={make10Question8Add7}
        mode="training"
        storage={storage}
        playerId="test-repeated-hints"
        autoAdvanceDelayMs={0}
        onProfileChange={(p) => {
          capturedProfile = p;
        }}
      />
    );

    // Submit attempt with hints in training mode
    fireEvent.click(screen.getByTestId('request-help-button'));
    fireEvent.click(screen.getByTestId('close-help-button'));
    fireEvent.click(screen.getByTestId('choice-fire'));

    expect(capturedProfile).toBeDefined();
    const progressWithHints = capturedProfile?.skills.make_10;
    expect(progressWithHints?.attempts).toBe(1);
    expect(progressWithHints?.hintsUsed).toBe(1);
    expect(progressWithHints?.hintRate).toBe(1.0);
    // Because of repeated hint reliance, skill score is penalized and cannot be classified as 'mastered'
    expect(progressWithHints?.masteryLevel).not.toBe('mastered');
  });

  it('switches game mode via in-game mode toolbar', () => {
    let capturedMode: GameMode | undefined;
    render(
      <GameScreen
        initialQuestion={make10Question8Add7}
        mode="adventure"
        onModeChange={(m) => {
          capturedMode = m;
        }}
      />
    );

    expect(screen.getByTestId('mode-tab-adventure')).toHaveClass('active');
    expect(screen.getByTestId('mode-tab-training')).not.toHaveClass('active');

    // Click Training tab
    fireEvent.click(screen.getByTestId('mode-tab-training'));

    expect(screen.getByTestId('mode-tab-training')).toHaveClass('active');
    expect(screen.getByTestId('training-mode-banner')).toBeInTheDocument();
    expect(capturedMode).toBe('training');

    // In training mode, opening help shows full explanation directly
    fireEvent.click(screen.getByTestId('request-help-button'));
    expect(screen.getByTestId('full-explanation-content')).toBeInTheDocument();
  });

  it('in Adventure mode, missing does not dump full explanation and shows encouraging strategy note', () => {
    render(
      <GameScreen initialQuestion={make10Question8Add7} mode="adventure" autoAdvanceDelayMs={100} />
    );

    // Shoot wrong answer (ice = 16)
    fireEvent.click(screen.getByTestId('choice-ice'));

    // Feedback banner includes make-10 strategy tip without dumping explanation modal
    const banner = screen.getByTestId('feedback-banner');
    expect(banner).toHaveTextContent(/Try making 10 first/i);
    expect(screen.queryByTestId('worked-example-card')).not.toBeInTheDocument();
  });
});

describe('Task 4.3 — Create Training mode', () => {
  const make10Question8Add7: Question = {
    id: 'q_test_8_add_7',
    left: 8,
    right: 7,
    operation: 'add',
    answer: 15,
    correctAnswer: 15,
    skill: 'make_10',
    choices: [
      { element: 'fire', value: 15, category: 'correct' },
      { element: 'ice', value: 16, category: 'too_high' },
      { element: 'wind', value: 14, category: 'too_low' },
      { element: 'earth', value: 13, category: 'common_mistake' },
    ],
  };

  it('Done When: Training mode does not consume the daily 50 arrows', () => {
    const storage = createMemoryStorage();
    const playerId = 'player-training-test';
    const date = '2026-09-16';

    // Start with fresh daily session (0 arrows used)
    const initialSession = startDailySession({ playerId, date, storage, arrowsAllowed: 50 });
    expect(initialSession.arrowsUsed).toBe(0);

    render(
      <GameScreen
        initialQuestion={make10Question8Add7}
        mode="training"
        playerId={playerId}
        sessionDate={date}
        storage={storage}
        autoAdvanceDelayMs={0}
      />
    );

    // Displays Training practice counter and unlimited badge
    expect(screen.getByTestId('arrow-counter')).toHaveTextContent('Practice #1');
    expect(screen.getByTestId('training-unlimited-badge')).toBeInTheDocument();
    expect(screen.getByTestId('training-unlimited-badge')).toHaveTextContent(/Unlimited Arrows/i);

    // Answer 3 questions in Training mode
    fireEvent.click(screen.getByTestId('choice-fire'));
    fireEvent.click(screen.getByTestId('choice-fire'));
    fireEvent.click(screen.getByTestId('choice-fire'));

    // Daily session in storage still has exactly 0 arrows used!
    const persistedSession = getActiveDailySession({ playerId, date, storage });
    expect(persistedSession).toBeDefined();
    expect(persistedSession?.arrowsUsed).toBe(0);

    // Training practice counter advances
    expect(screen.getByTestId('arrow-counter')).toHaveTextContent('Practice #4');
  });

  it('Done When: Switching between modes preserves daily arrow count', () => {
    const storage = createMemoryStorage();
    const playerId = 'player-mode-switch';
    const date = '2026-09-16';

    render(
      <GameScreen
        initialQuestion={make10Question8Add7}
        mode="adventure"
        playerId={playerId}
        sessionDate={date}
        storage={storage}
        autoAdvanceDelayMs={0}
      />
    );

    // Shoot 2 arrows in Adventure mode -> consumes 2 daily arrows
    fireEvent.click(screen.getByTestId('choice-fire'));
    fireEvent.click(screen.getByTestId('choice-fire'));

    let session = getActiveDailySession({ playerId, date, storage });
    expect(session?.arrowsUsed).toBe(2);
    expect(screen.getByTestId('arrow-counter')).toHaveTextContent('3 / 50');

    // Switch to Training mode
    fireEvent.click(screen.getByTestId('mode-tab-training'));
    expect(screen.getByTestId('training-mode-banner')).toBeInTheDocument();
    expect(screen.getByTestId('arrow-counter')).toHaveTextContent('Practice #1');

    // Practice 4 questions in Training mode
    fireEvent.click(screen.getByTestId('choice-fire'));
    fireEvent.click(screen.getByTestId('choice-fire'));
    fireEvent.click(screen.getByTestId('choice-fire'));
    fireEvent.click(screen.getByTestId('choice-fire'));

    // Daily arrows still at exactly 2!
    session = getActiveDailySession({ playerId, date, storage });
    expect(session?.arrowsUsed).toBe(2);

    // Switch back to Adventure mode
    fireEvent.click(screen.getByTestId('mode-tab-adventure'));
    expect(screen.getByTestId('arrow-counter')).toHaveTextContent('3 / 50');

    // Shoot 1 more arrow in Adventure mode -> advances daily session to 3
    fireEvent.click(screen.getByTestId('choice-fire'));
    session = getActiveDailySession({ playerId, date, storage });
    expect(session?.arrowsUsed).toBe(3);
    expect(screen.getByTestId('arrow-counter')).toHaveTextContent('4 / 50');
  });

  it('Done When: Training mode allows unlimited questions without 50-arrow cutoff', () => {
    const storage = createMemoryStorage();
    const onSessionComplete = vi.fn();

    render(
      <GameScreen
        initialQuestion={make10Question8Add7}
        mode="training"
        maxArrows={2}
        storage={storage}
        autoAdvanceDelayMs={0}
        onSessionComplete={onSessionComplete}
      />
    );

    // In training mode, answer 5 questions (which exceeds maxArrows = 2)
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByTestId('choice-fire'));
    }

    // Session completion card is NOT triggered because training mode is unlimited
    expect(screen.queryByTestId('session-complete')).not.toBeInTheDocument();
    expect(onSessionComplete).not.toHaveBeenCalled();

    // Still able to shoot
    expect(screen.getByTestId('choice-fire')).toBeInTheDocument();
    expect(screen.getByTestId('arrow-counter')).toHaveTextContent('Practice #6');
  });

  it('Done When: Parent can deliberately practice a weak skill', () => {
    const storage = createMemoryStorage();
    const playerId = 'player-deliberate-practice';
    // Load a profile weak at basic_subtraction
    const weakSubProfile = createControlledTestProfile('weak_subtraction', playerId);

    render(
      <GameScreen
        initialProfile={weakSubProfile}
        mode="training"
        playerId={playerId}
        storage={storage}
        autoAdvanceDelayMs={0}
      />
    );

    // Deliberate practice bar is rendered
    expect(screen.getByTestId('deliberate-practice-bar')).toBeInTheDocument();

    // Detected weak skills section displays weak_subtraction chip
    expect(screen.getByTestId('weak-skills-section')).toBeInTheDocument();
    const weakChip = screen.getByTestId('practice-weak-skill-basic_subtraction');
    expect(weakChip).toBeInTheDocument();
    expect(weakChip).toHaveTextContent(/Basic subtraction/i);

    // Click to deliberately practice basic_subtraction
    fireEvent.click(weakChip);

    // Active deliberate badge displays Basic subtraction
    expect(screen.getByTestId('active-deliberate-badge')).toHaveTextContent(/Basic subtraction/i);

    // Active skill badge confirms question target
    expect(screen.getByTestId('active-skill-badge')).toHaveTextContent(/Basic subtraction/i);

    // Answer question -> next question generated is also for Basic subtraction
    fireEvent.click(screen.getByTestId('choice-fire'));
    expect(screen.getByTestId('active-skill-badge')).toHaveTextContent(/Basic subtraction/i);

    // Parent can switch target to Make 10 via dropdown
    const select = screen.getByTestId('training-skill-select');
    fireEvent.change(select, { target: { value: 'make_10' } });

    expect(screen.getByTestId('active-deliberate-badge')).toHaveTextContent(/Make 10/i);
    expect(screen.getByTestId('active-skill-badge')).toHaveTextContent(/Make 10/i);
  });

  it('Done When: Deliberate practice updates skill profile mastery without consuming daily arrows', () => {
    const storage = createMemoryStorage();
    const playerId = 'player-profile-update';
    const date = '2026-09-16';
    let latestProfile: SkillProfile | undefined;

    // Load weak_make_10 profile
    const weakProfile = createControlledTestProfile('weak_make_10', playerId);

    render(
      <GameScreen
        initialQuestion={make10Question8Add7}
        initialProfile={weakProfile}
        mode="training"
        playerId={playerId}
        sessionDate={date}
        storage={storage}
        autoAdvanceDelayMs={0}
        onProfileChange={(p) => {
          latestProfile = p;
        }}
      />
    );

    const initialAttempts = weakProfile.skills.make_10.attempts;

    // Child answers make-10 question correctly in training mode
    fireEvent.click(screen.getByTestId('choice-fire'));

    // Profile is updated and recorded
    expect(latestProfile).toBeDefined();
    expect(latestProfile?.skills.make_10.attempts).toBe(initialAttempts + 1);

    // Daily arrows were NOT consumed
    const session = getActiveDailySession({ playerId, date, storage });
    expect(session?.arrowsUsed ?? 0).toBe(0);
  });

  it('Done When: Completed daily session allows transitioning to Training mode', () => {
    const storage = createMemoryStorage();
    const playerId = 'player-completed-daily';
    const date = '2026-09-16';

    // Set up an already completed session (e.g. 2/2 arrows used)
    const session = startDailySession({ playerId, date, storage, arrowsAllowed: 2 });
    session.arrowsUsed = 2;
    session.status = 'completed';
    completeSession(session, { storage, playerId, date });

    render(
      <GameScreen
        maxArrows={2}
        mode="adventure"
        playerId={playerId}
        sessionDate={date}
        storage={storage}
        autoAdvanceDelayMs={0}
      />
    );

    // Adventure mode shows completion card
    expect(screen.getByTestId('session-complete')).toBeInTheDocument();
    expect(screen.getByTestId('go-to-training-button')).toBeInTheDocument();

    // Click "Practice in Training Mode"
    fireEvent.click(screen.getByTestId('go-to-training-button'));

    // Immediately enters Training mode and displays question and deliberate practice bar
    expect(screen.queryByTestId('session-complete')).not.toBeInTheDocument();
    expect(screen.getByTestId('training-mode-banner')).toBeInTheDocument();
    expect(screen.getByTestId('deliberate-practice-bar')).toBeInTheDocument();
    expect(screen.getByTestId('arrow-counter')).toHaveTextContent('Practice #1');

    // Child can practice answers
    fireEvent.click(screen.getByTestId('choice-fire'));
    expect(screen.getByTestId('arrow-counter')).toHaveTextContent('Practice #2');
  });

  it('Done When: In Training mode, complete explanations are readily accessible for teachable questions', () => {
    render(
      <GameScreen initialQuestion={make10Question8Add7} mode="training" autoAdvanceDelayMs={0} />
    );

    // In training mode, requesting help directly opens full explanation (Task 4.2 & 4.3)
    fireEvent.click(screen.getByTestId('request-help-button'));
    expect(screen.getByTestId('full-explanation-content')).toBeInTheDocument();
    expect(screen.getByTestId('make10-step-1')).toBeInTheDocument();
    expect(screen.getByTestId('make10-step-2')).toBeInTheDocument();
    expect(screen.getByTestId('make10-step-3')).toBeInTheDocument();
    expect(screen.getByTestId('ten-frames-visual')).toBeInTheDocument();
    expect(screen.getByTestId('summary-equation')).toHaveTextContent(
      '8 + 7 = 8 + 2 + 5 = 10 + 5 = 15'
    );

    // Child closes explanation and shoots
    fireEvent.click(screen.getByTestId('close-help-button'));
    expect(screen.queryByTestId('worked-example-card')).not.toBeInTheDocument();
  });

  it('in Training mode, misses show guidance that complete explanation is ready', () => {
    render(
      <GameScreen initialQuestion={make10Question8Add7} mode="training" autoAdvanceDelayMs={100} />
    );

    // Miss answer (ice = 16)
    fireEvent.click(screen.getByTestId('choice-ice'));

    // Feedback displays Make-10 explanation prompt
    expect(screen.getByTestId('feedback-banner')).toHaveTextContent(
      /Make-10 explanation available below/i
    );
  });
});

describe('Task 5.1 — Build attempt history', () => {
  const testQuestion: Question = {
    id: 'q_test_8_add_7',
    left: 8,
    right: 7,
    operation: 'add',
    answer: 15,
    correctAnswer: 15,
    skill: 'make_10',
    choices: [
      { element: 'fire', value: 15, category: 'correct' },
      { element: 'ice', value: 14, category: 'too_low' },
      { element: 'wind', value: 16, category: 'too_high' },
      { element: 'earth', value: 13, category: 'common_mistake' },
    ],
  };

  it('Done When: Closing and reopening the application preserves progress across sessions, attempts, and profile', () => {
    const storage = createMemoryStorage();

    // 1. Initial Session: User opens app and plays 2 questions
    const { unmount } = render(
      <GameScreen initialQuestion={testQuestion} storage={storage} autoAdvanceDelayMs={0} />
    );

    expect(screen.getByTestId('arrow-counter')).toHaveTextContent('1 / 50');
    expect(screen.getByTestId('active-skill-badge')).toBeInTheDocument();

    // Answer 1st question correctly (fire = 15)
    fireEvent.click(screen.getByTestId('choice-fire'));

    // Check attempts in storage immediately after shot
    let storedAttempts = loadAttempts('player-local', storage);
    expect(storedAttempts).toHaveLength(1);
    expect(storedAttempts[0].correct).toBe(true);
    expect(storedAttempts[0].left).toBe(8);
    expect(storedAttempts[0].right).toBe(7);
    expect(storedAttempts[0].selectedAnswer).toBe(15);
    expect(storedAttempts[0].skill).toBe('make_10');
    expect(storedAttempts[0].sessionId).toBeDefined();

    // Session advances to arrow 2
    expect(screen.getByTestId('arrow-counter')).toHaveTextContent('2 / 50');
    expect(screen.getByTestId('active-skill-badge')).toBeInTheDocument();

    // 2. Simulate closing the application (unmount)
    unmount();

    // Verify persisted state in storage directly
    const persistedSession = getActiveDailySession({ storage });
    expect(persistedSession?.arrowsUsed).toBe(1);
    expect(persistedSession?.hits).toBe(1);

    const persistedProfile = loadProfile('player-local', storage);
    expect(persistedProfile?.skills.make_10.attempts).toBe(1);
    expect(persistedProfile?.skills.make_10.correct).toBe(1);

    // 3. Simulate reopening the application (fresh render with same storage)
    render(<GameScreen storage={storage} autoAdvanceDelayMs={0} />);

    // Verified: Arrow count and active question are strictly preserved!
    expect(screen.getByTestId('arrow-counter')).toHaveTextContent('2 / 50');
    expect(screen.getByTestId('active-skill-badge')).toBeInTheDocument();

    // All attempts and skill progress remain preserved in storage
    storedAttempts = loadAttempts('player-local', storage);
    expect(storedAttempts).toHaveLength(1);
    expect(storedAttempts[0].questionId).toBe('q_test_8_add_7');

    const progress = loadLocalProgress('player-local', storage);
    expect(progress.profile.skills.make_10.attempts).toBe(1);
    expect(progress.profile.skills.make_10.correct).toBe(1);
    expect(progress.currentSession?.arrowsUsed).toBe(1);
    expect(progress.currentSession?.hits).toBe(1);
  });

  it('Done When: Closing and reopening preserves detailed attempt metadata (hints, response times, categories)', () => {
    const storage = createMemoryStorage();

    const { unmount } = render(
      <GameScreen initialQuestion={testQuestion} storage={storage} autoAdvanceDelayMs={0} />
    );

    // Child opens help (strategy hint in Adventure mode)
    fireEvent.click(screen.getByTestId('request-help-button'));
    expect(screen.getByTestId('strategy-hint-card')).toBeInTheDocument();

    // Child shoots correct answer after viewing hint
    fireEvent.click(screen.getByTestId('choice-fire'));

    // Verify hint metadata on saved attempt
    const attempts = loadAttempts('player-local', storage);
    expect(attempts).toHaveLength(1);
    expect(attempts[0].hintUsed).toBe(true);
    expect(attempts[0].hintLevel).toBe('strategy_hint');
    expect(attempts[0].responseTimeMs).toBeGreaterThan(0);
    expect(attempts[0].category).toBe('correct');

    // Reopen app
    unmount();
    render(<GameScreen storage={storage} autoAdvanceDelayMs={0} />);

    // Load unified local progress
    const progress = loadLocalProgress('player-local', storage);
    expect(progress.attempts).toHaveLength(1);
    expect(progress.attempts[0].hintUsed).toBe(true);
    expect(progress.stats.hintsUsed).toBe(1);
    expect(progress.stats.hintRate).toBe(1.0);
  });

  it('Done When: Sequential questions across Adventure and Training modes are all logged in attempt history', () => {
    const storage = createMemoryStorage();

    // 1. Play in Adventure mode
    const { unmount } = render(
      <GameScreen
        initialQuestion={testQuestion}
        mode="adventure"
        storage={storage}
        autoAdvanceDelayMs={0}
      />
    );

    // Shoot 1st arrow in Adventure mode
    fireEvent.click(screen.getByTestId('choice-fire'));

    // Switch to Training mode via toolbar
    fireEvent.click(screen.getByTestId('mode-tab-training'));

    // Shoot in Training mode
    fireEvent.click(screen.getByTestId('choice-fire'));

    // Unmount and reopen
    unmount();

    render(<GameScreen storage={storage} autoAdvanceDelayMs={0} />);

    const attempts = loadAttempts('player-local', storage);
    expect(attempts).toHaveLength(2);
    expect(attempts[0].mode).toBe('adventure');
    expect(attempts[1].mode).toBe('training');

    // Adventure mode arrowsUsed is still 1 (training mode did not consume arrows)
    const session = getActiveDailySession({ storage });
    expect(session?.arrowsUsed).toBe(1);
  });

  it('Done When: Closing and reopening a completed session preserves completion status and attempt history', () => {
    const storage = createMemoryStorage();

    // Start session at 49 arrows used
    startDailySession({ storage, arrowsAllowed: 50 });
    const active = getActiveDailySession({ storage })!;
    active.arrowsUsed = 49;
    active.hits = 40;
    saveDailySession(active, storage);

    const { unmount } = render(
      <GameScreen initialQuestion={testQuestion} storage={storage} autoAdvanceDelayMs={0} />
    );

    expect(screen.getByTestId('arrow-counter')).toHaveTextContent('50 / 50');

    // Answer the 50th arrow
    fireEvent.click(screen.getByTestId('choice-fire'));

    // Session completion overlay is visible
    expect(screen.getByTestId('session-complete')).toBeInTheDocument();

    // Reopen application
    unmount();
    render(<GameScreen storage={storage} autoAdvanceDelayMs={0} />);

    // Remains completed, session complete card visible
    expect(screen.getByTestId('session-complete')).toBeInTheDocument();

    const progress = loadLocalProgress('player-local', storage);
    expect(progress.currentSession?.status).toBe('completed');
    expect(progress.currentSession?.arrowsUsed).toBe(50);
    expect(progress.attempts).toHaveLength(1);
  });

  describe('Task 6.4 — Cloud Synchronization UI Integration', () => {
    it('renders the cloud sync status indicator in the game header', () => {
      const storage = createMemoryStorage();
      render(
        <GameScreen initialQuestion={testQuestion} storage={storage} autoAdvanceDelayMs={0} />
      );

      const syncStatus = screen.getByTestId('cloud-sync-status');
      expect(syncStatus).toBeInTheDocument();
      expect(syncStatus).toHaveTextContent(/Synced|Offline|Syncing/);
    });

    it('displays offline badge when network is offline and shows pending queue count', () => {
      const storage = createMemoryStorage();
      const mockApiClient = new MathArcherApiClient({
        fetchFn: async () => {
          throw new TypeError('Network offline');
        },
      });

      const syncManager = new SyncManager({
        playerId: 'offline-ui-player',
        apiClient: mockApiClient,
        storage,
        initialOnline: false,
      });

      render(
        <GameScreen
          initialQuestion={testQuestion}
          storage={storage}
          syncManager={syncManager}
          playerId="offline-ui-player"
          autoAdvanceDelayMs={0}
        />
      );

      // Verify offline badge is visible
      const syncStatus = screen.getByTestId('cloud-sync-status');
      expect(syncStatus).toHaveTextContent('Offline (0 queued)');

      // Answer a question while offline
      fireEvent.click(screen.getByTestId('choice-fire'));

      // Indicator updates to show 1 queued attempt
      expect(screen.getByTestId('cloud-sync-status')).toHaveTextContent('Offline (1 queued)');

      // Sync now button becomes visible
      expect(screen.getByTestId('sync-now-button')).toBeInTheDocument();

      syncManager.destroy();
    });
  });
});
