import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ArcherGraphic } from './ArcherGraphic';
import { ArcheryTarget } from './ArcheryTarget';
import { GameScreen } from './GameScreen';
import { audioFx } from '../audio/AudioFx';
import type { Question } from '@math-archer/learning-engine';

const mockQuestion: Question = {
  id: 'q-task-9-1',
  operation: 'add',
  left: 8,
  right: 7,
  answer: 15,
  skill: 'make_10',
  choices: [
    { element: 'fire', value: 15, category: 'correct' },
    { element: 'ice', value: 14, category: 'too_low' },
    { element: 'wind', value: 16, category: 'too_high' },
    { element: 'earth', value: 17, category: 'common_mistake' },
  ],
};

describe('Task 9.1 — Archer presentation', () => {
  describe('ArcherGraphic Component (Character & Recurve Bow)', () => {
    it('renders archer character with bow, cowl, feather, and quiver', () => {
      const { container } = render(<ArcherGraphic state="idle" />);

      const archerGraphic = screen.getByTestId('archer-graphic');
      expect(archerGraphic).toHaveClass('state-idle');

      // Vector elements exist
      expect(container.querySelector('.archer-svg')).toBeInTheDocument();
      expect(container.querySelector('.archer-quiver')).toBeInTheDocument();
      expect(container.querySelector('.archer-body')).toBeInTheDocument();
      expect(container.querySelector('.archer-head')).toBeInTheDocument();
      expect(container.querySelector('.archer-bow')).toBeInTheDocument();
      expect(container.querySelector('.bow-string')).toBeInTheDocument();
    });

    it('displays aiming posture and nocked arrow when drawing', () => {
      const { container } = render(<ArcherGraphic state="drawing" element="fire" />);

      const archerGraphic = screen.getByTestId('archer-graphic');
      expect(archerGraphic).toHaveClass('state-drawing');

      // Nocked arrow with elemental glow is rendered
      expect(container.querySelector('.nocked-arrow')).toBeInTheDocument();
      // Bowstring flexes into draw position
      const bowString = container.querySelector('.bow-string');
      expect(bowString).toHaveAttribute('d', expect.stringContaining('Q 20 50'));
    });

    it('displays release recoil and bowstring snap on loose', () => {
      const { container } = render(<ArcherGraphic state="released" element="ice" />);

      const bowString = container.querySelector('.bow-string');
      expect(bowString).toHaveClass('bowstring-vibrate');

      const bow = container.querySelector('.archer-bow');
      expect(bow).toHaveClass('bow-recoil-active');
    });
  });

  describe('ArcheryTarget Component (Concentric Rings & Kinetic Hit)', () => {
    it('renders concentric archery rings and wooden easel stand', () => {
      render(<ArcheryTarget expression="8 + 7" hitState="idle" />);

      expect(screen.getByTestId('target-card')).toHaveAttribute('data-hit-state', 'idle');
      expect(screen.getByTestId('target-face')).toBeInTheDocument();
      expect(screen.getByText('8 + 7')).toBeInTheDocument();
      expect(screen.getByText('TARGET')).toBeInTheDocument();

      // No embedded arrow in idle state
      expect(screen.queryByTestId('embedded-arrow')).not.toBeInTheDocument();
    });

    it('renders embedded quivering arrow and impact shockwave on hit', () => {
      render(<ArcheryTarget expression="8 + 7" hitState="hit" activeElement="fire" />);

      const targetCard = screen.getByTestId('target-card');
      expect(targetCard).toHaveClass('target-impact-hit');
      expect(targetCard).toHaveAttribute('data-hit-state', 'hit');

      // Embedded arrow lodged into the bullseye
      const embeddedArrow = screen.getByTestId('embedded-arrow');
      expect(embeddedArrow).toBeInTheDocument();

      // Target impact shockwave and effects
      expect(screen.getByTestId('target-hit-effect')).toBeInTheDocument();
      expect(screen.getByText('✨🎯✨')).toBeInTheDocument();
    });

    it('renders deflection effect on miss without embedded arrow', () => {
      render(<ArcheryTarget expression="8 + 7" hitState="miss" activeElement="ice" />);

      const targetCard = screen.getByTestId('target-card');
      expect(targetCard).toHaveClass('target-impact-miss');
      expect(targetCard).toHaveAttribute('data-hit-state', 'miss');

      expect(screen.queryByTestId('embedded-arrow')).not.toBeInTheDocument();
      expect(screen.getByTestId('target-miss-effect')).toBeInTheDocument();
      expect(screen.getByText('💨 Miss!')).toBeInTheDocument();
    });
  });

  describe('Archer Quiver Selection & Procedural Audio Integration', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('Done When: Answering a question feels like shooting an arrow rather than clicking a button', () => {
      const playBowSpy = vi.spyOn(audioFx, 'playBowRelease');
      const playFlightSpy = vi.spyOn(audioFx, 'playArrowFlight');
      const playHitSpy = vi.spyOn(audioFx, 'playTargetHit');

      render(
        <GameScreen
          initialQuestion={mockQuestion}
          autoAdvanceDelayMs={600}
          shotFlightDurationMs={180}
        />
      );

      // 1. Archer is initially idle, quiver is ready
      expect(screen.getByTestId('archer-character')).toHaveAttribute('data-state', 'idle');
      expect(screen.getByTestId('quiver-section')).toBeInTheDocument();
      expect(screen.getByText(/ARCHER'S QUIVER/i)).toBeInTheDocument();
      expect(screen.queryByTestId('flying-arrow')).not.toBeInTheDocument();
      expect(screen.queryByTestId('embedded-arrow')).not.toBeInTheDocument();

      // 2. Child chooses Fire arrow (value 15)
      const fireChoice = screen.getByTestId('choice-fire');
      fireEvent.click(fireChoice);

      // Archer releases with tactile feedback
      expect(screen.getByTestId('archer-character')).toHaveAttribute('data-state', 'released');
      expect(screen.getByTestId('archer-arrow-nock')).toHaveTextContent('🔥');

      // Procedural audio plays bow release and arrow flight
      expect(playBowSpy).toHaveBeenCalledWith('fire');
      expect(playFlightSpy).toHaveBeenCalled();

      // Flying projectile streaks across range
      const flyingArrow = screen.getByTestId('flying-arrow');
      expect(flyingArrow).toBeInTheDocument();
      expect(flyingArrow).toHaveAttribute('data-element', 'fire');

      // 3. Arrow reaches target after flight delay (180ms)
      act(() => {
        vi.advanceTimersByTime(180);
      });

      // Target impact: Arrow is lodged and quivers in the bullseye!
      expect(screen.getByTestId('target-card')).toHaveAttribute('data-hit-state', 'hit');
      expect(screen.getByTestId('embedded-arrow')).toBeInTheDocument();
      expect(playHitSpy).toHaveBeenCalledWith('hit');

      // Feedback banner confirms hit
      expect(screen.getByTestId('feedback-banner')).toHaveTextContent('🎯 Hit!');

      // 4. Clean transition to next question after auto-advance
      act(() => {
        vi.advanceTimersByTime(420);
      });

      expect(screen.getByTestId('archer-character')).toHaveAttribute('data-state', 'idle');
      expect(screen.queryByTestId('flying-arrow')).not.toBeInTheDocument();

      playBowSpy.mockRestore();
      playFlightSpy.mockRestore();
      playHitSpy.mockRestore();
    });

    it('plays deflection audio and displays miss reaction when wrong arrow is shot', () => {
      const playHitSpy = vi.spyOn(audioFx, 'playTargetHit');

      render(
        <GameScreen
          initialQuestion={mockQuestion}
          autoAdvanceDelayMs={500}
          shotFlightDurationMs={150}
        />
      );

      // Child shoots Ice arrow (value 14, wrong)
      const iceChoice = screen.getByTestId('choice-ice');
      fireEvent.click(iceChoice);

      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(screen.getByTestId('target-card')).toHaveAttribute('data-hit-state', 'miss');
      expect(screen.queryByTestId('embedded-arrow')).not.toBeInTheDocument();
      expect(playHitSpy).toHaveBeenCalledWith('miss');
      expect(screen.getByTestId('target-miss-effect')).toBeInTheDocument();

      playHitSpy.mockRestore();
    });

    it('supports audio mute toggle in AudioFx', () => {
      expect(audioFx.getIsMuted()).toBe(false);
      audioFx.setMuted(true);
      expect(audioFx.getIsMuted()).toBe(true);

      // No crash or error when muted
      expect(() => {
        audioFx.playBowRelease('fire');
        audioFx.playArrowFlight();
        audioFx.playTargetHit('hit');
      }).not.toThrow();

      audioFx.setMuted(false);
      expect(audioFx.getIsMuted()).toBe(false);
    });
  });
});
