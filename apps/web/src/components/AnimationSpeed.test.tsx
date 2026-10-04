import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import {
  createMemoryStorage,
  type Question,
  type AnimationSpeed,
} from '@math-archer/learning-engine';
import { ParentDashboard } from './ParentDashboard';
import { GameScreen } from './GameScreen';
import { loadAnimationSpeed, saveAnimationSpeed } from '../speedPreferences';
import { MathArcherApiClient } from '../api/client';

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const question: Question = {
  id: 'speed-test',
  left: 2,
  right: 3,
  operation: 'add',
  answer: 5,
  correctAnswer: 5,
  skill: 'addition_within_10',
  choices: [
    { element: 'fire', value: 5, category: 'correct' },
    { element: 'ice', value: 4, category: 'too_low' },
    { element: 'wind', value: 6, category: 'too_high' },
    { element: 'earth', value: 3, category: 'common_mistake' },
  ],
};

describe('Animation speed in Parent Dashboard', () => {
  it('saves independently for each child and restores the choice on return', async () => {
    const storage = createMemoryStorage();
    const { rerender } = render(<ParentDashboard playerId="first" storage={storage} />);
    expect(screen.getByRole('combobox', { name: 'Animation speed' })).toHaveValue('fast');
    fireEvent.change(screen.getByRole('combobox', { name: 'Animation speed' }), {
      target: { value: 'slow' },
    });
    await waitFor(() =>
      expect(screen.getByText('Animation speed saved.')).toHaveTextContent('Animation speed saved.')
    );
    expect(loadAnimationSpeed('first', storage)).toBe('slow');
    rerender(<ParentDashboard playerId="second" storage={storage} />);
    expect(screen.getByRole('combobox', { name: 'Animation speed' })).toHaveValue('fast');
    fireEvent.change(screen.getByRole('combobox', { name: 'Animation speed' }), {
      target: { value: 'normal' },
    });
    await waitFor(() => expect(loadAnimationSpeed('second', storage)).toBe('normal'));
    rerender(<ParentDashboard playerId="first" storage={storage} />);
    expect(screen.getByRole('combobox', { name: 'Animation speed' })).toHaveValue('slow');
  });

  it('does not save locally when the server rejects the change', async () => {
    const storage = createMemoryStorage();
    const apiClient = new MathArcherApiClient({
      fetchFn: vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error: { message: 'Save failed' } }), { status: 500 })
        ),
    });
    const update = vi
      .spyOn(apiClient, 'updateChildProfile')
      .mockRejectedValue(new Error('Save failed'));
    render(<ParentDashboard playerId="first" storage={storage} apiClient={apiClient} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Animation speed' }), {
      target: { value: 'slow' },
    });
    await waitFor(() => expect(screen.getByText('Save failed')).toBeInTheDocument());
    expect(update).toHaveBeenCalledWith('first', { animationSpeed: 'slow' });
    expect(screen.getByRole('combobox', { name: 'Animation speed' })).toHaveValue('fast');
    expect(loadAnimationSpeed('first', storage)).toBe('fast');
  });
});

describe('Gameplay follows each child’s speed', () => {
  it.each<[AnimationSpeed, number, number]>([
    ['fast', 250, 750],
    ['normal', 500, 1400],
    ['slow', 1000, 2400],
  ])('uses %s for flight, impact, and question advance', (speed, flightMs, advanceMs) => {
    vi.useFakeTimers();
    const storage = createMemoryStorage();
    saveAnimationSpeed('speed-child', speed, storage);
    const next = vi.fn();
    render(
      <GameScreen
        playerId="speed-child"
        storage={storage}
        initialQuestion={question}
        onNextQuestion={next}
      />
    );
    fireEvent.click(screen.getByTestId('choice-fire'));
    expect(screen.getByTestId('flying-arrow')).toHaveStyle({
      '--shot-flight-duration': `${flightMs}ms`,
    });
    act(() => vi.advanceTimersByTime(flightMs - 1));
    expect(screen.queryByTestId('embedded-arrow')).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByTestId('embedded-arrow')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(advanceMs - flightMs - 1));
    expect(next).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('honors explicit zero-delay transitions even when a child prefers slow', () => {
    const storage = createMemoryStorage();
    saveAnimationSpeed('speed-child', 'slow', storage);
    const next = vi.fn();
    render(
      <GameScreen
        playerId="speed-child"
        storage={storage}
        initialQuestion={question}
        autoAdvanceDelayMs={0}
        onNextQuestion={next}
      />
    );
    fireEvent.click(screen.getByTestId('choice-fire'));
    expect(next).toHaveBeenCalledTimes(1);
  });
});
