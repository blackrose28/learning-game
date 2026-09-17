import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { WorldMap } from './WorldMap';
import { RangeBackdrop } from './RangeBackdrop';
import { GameScreen } from './GameScreen';
import { saveDailySession, type Question } from '@math-archer/learning-engine';

const MOCK_QUESTION: Question = {
  id: 'q_test_world',
  left: 8,
  right: 5,
  operation: 'add',
  answer: 13,
  choices: [
    { value: 13, element: 'fire', category: 'correct' },
    { value: 12, element: 'ice', category: 'too_low' },
    { value: 14, element: 'wind', category: 'too_high' },
    { value: 15, element: 'earth', category: 'common_mistake' },
  ],
  skill: 'make_10',
};

describe('Task 9.3 — World Progression', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('WorldMap component', () => {
    it('renders the 5 areas with Castle unlocked and elemental areas locked for a new player', () => {
      render(<WorldMap playerId="player-test" />);

      expect(screen.getByTestId('world-map-container')).toBeInTheDocument();
      expect(screen.getByTestId('world-map-title')).toHaveTextContent(/Archery World Map/i);

      // Total discovery count: 1 of 5
      expect(screen.getByTestId('unlocked-areas-count')).toHaveTextContent(
        '1 / 5 Realms Discovered'
      );
      expect(screen.getByTestId('next-unlock-info')).toHaveTextContent(/Fire Village/i);

      // Castle card: active and unlocked
      const castleCard = screen.getByTestId('realm-card-castle');
      expect(castleCard).toHaveAttribute('data-unlocked', 'true');
      expect(castleCard).toHaveAttribute('data-active', 'true');
      expect(screen.getByTestId('badge-active-castle')).toBeInTheDocument();

      // Fire, Ice, Wind, Earth: locked
      expect(screen.getByTestId('realm-card-fire_area')).toHaveAttribute('data-unlocked', 'false');
      expect(screen.getByTestId('badge-locked-fire_area')).toBeInTheDocument();
      expect(screen.getByTestId('unlock-req-fire_area')).toHaveTextContent(
        'Requires 1 completed session'
      );

      expect(screen.getByTestId('realm-card-ice_area')).toHaveAttribute('data-unlocked', 'false');
      expect(screen.getByTestId('badge-locked-ice_area')).toBeInTheDocument();

      expect(screen.getByTestId('realm-card-wind_area')).toHaveAttribute('data-unlocked', 'false');
      expect(screen.getByTestId('badge-locked-wind_area')).toBeInTheDocument();

      expect(screen.getByTestId('realm-card-earth_area')).toHaveAttribute('data-unlocked', 'false');
      expect(screen.getByTestId('badge-locked-earth_area')).toBeInTheDocument();
    });

    it('unlocks Fire Village when 1 session is completed, and allows travel', () => {
      // Seed 1 completed session in localStorage
      const today = new Date().toISOString().slice(0, 10);
      saveDailySession({
        id: 'session-1',
        playerId: 'player-test',
        date: today,
        arrowsAllowed: 50,
        arrowsUsed: 50,
        hits: 45,
        status: 'completed',
        startedAt: `${today}T08:00:00.000Z`,
        completedAt: `${today}T08:15:00.000Z`,
      });

      const onSelectArea = vi.fn();
      render(<WorldMap playerId="player-test" onSelectArea={onSelectArea} />);

      // Progress now 2 / 5
      expect(screen.getByTestId('unlocked-areas-count')).toHaveTextContent(
        '2 / 5 Realms Discovered'
      );
      expect(screen.getByTestId('next-unlock-info')).toHaveTextContent(/Ice Kingdom/i);

      // Fire Village is now unlocked
      const fireCard = screen.getByTestId('realm-card-fire_area');
      expect(fireCard).toHaveAttribute('data-unlocked', 'true');
      expect(screen.getByTestId('badge-unlocked-fire_area')).toBeInTheDocument();

      // Click "Travel to Realm" on Fire Village
      const travelBtn = screen.getByTestId('travel-btn-fire_area');
      fireEvent.click(travelBtn);

      expect(onSelectArea).toHaveBeenCalledWith('fire_area');
      expect(fireCard).toHaveAttribute('data-active', 'true');
      expect(screen.getByTestId('badge-active-fire_area')).toBeInTheDocument();
    });

    it('shows all realms unlocked when 4 sessions are completed', () => {
      const dates = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04'];
      dates.forEach((date, i) => {
        saveDailySession({
          id: `session-${i}`,
          playerId: 'player-test',
          date,
          arrowsAllowed: 50,
          arrowsUsed: 50,
          hits: 40,
          status: 'completed',
          startedAt: `${date}T10:00:00.000Z`,
        });
      });

      render(<WorldMap playerId="player-test" />);

      expect(screen.getByTestId('unlocked-areas-count')).toHaveTextContent(
        '5 / 5 Realms Discovered'
      );
      expect(screen.getByTestId('next-unlock-info')).toHaveTextContent(/All Realms Discovered/i);

      // All cards unlocked
      expect(screen.getByTestId('realm-card-castle')).toHaveAttribute('data-unlocked', 'true');
      expect(screen.getByTestId('realm-card-fire_area')).toHaveAttribute('data-unlocked', 'true');
      expect(screen.getByTestId('realm-card-ice_area')).toHaveAttribute('data-unlocked', 'true');
      expect(screen.getByTestId('realm-card-wind_area')).toHaveAttribute('data-unlocked', 'true');
      expect(screen.getByTestId('realm-card-earth_area')).toHaveAttribute('data-unlocked', 'true');
    });
  });

  describe('RangeBackdrop visual environment', () => {
    it('renders distinct environmental visuals for each world realm', () => {
      const { rerender } = render(<RangeBackdrop areaId="castle" />);
      let backdrop = screen.getByTestId('range-backdrop');
      expect(backdrop).toHaveAttribute('data-area', 'castle');
      expect(screen.getByTestId('realm-banner-overlay')).toHaveTextContent(/Castle Courtyard/i);

      rerender(<RangeBackdrop areaId="fire_area" />);
      backdrop = screen.getByTestId('range-backdrop');
      expect(backdrop).toHaveAttribute('data-area', 'fire_area');
      expect(screen.getByTestId('realm-banner-overlay')).toHaveTextContent(/Fire Village/i);

      rerender(<RangeBackdrop areaId="ice_area" />);
      backdrop = screen.getByTestId('range-backdrop');
      expect(backdrop).toHaveAttribute('data-area', 'ice_area');
      expect(screen.getByTestId('realm-banner-overlay')).toHaveTextContent(/Ice Kingdom/i);

      rerender(<RangeBackdrop areaId="wind_area" />);
      backdrop = screen.getByTestId('range-backdrop');
      expect(backdrop).toHaveAttribute('data-area', 'wind_area');
      expect(screen.getByTestId('realm-banner-overlay')).toHaveTextContent(/Wind Temple/i);

      rerender(<RangeBackdrop areaId="earth_area" />);
      backdrop = screen.getByTestId('range-backdrop');
      expect(backdrop).toHaveAttribute('data-area', 'earth_area');
      expect(screen.getByTestId('realm-banner-overlay')).toHaveTextContent(/Earth Mountain/i);
    });
  });

  describe('GameScreen integration with World Progression', () => {
    it('displays active realm badge and renders range backdrop', () => {
      render(
        <GameScreen initialQuestion={MOCK_QUESTION} initialAreaId="castle" autoAdvanceDelayMs={0} />
      );

      // Realm badge in toolbar
      const worldBadge = screen.getByTestId('world-area-badge');
      expect(worldBadge).toHaveTextContent(/Castle Courtyard/i);

      // Range backdrop reflecting active area
      const backdrop = screen.getByTestId('range-backdrop');
      expect(backdrop).toHaveAttribute('data-area', 'castle');
    });

    it('opens World Map when clicking world-area-badge and allows returning to practice', () => {
      render(
        <GameScreen initialQuestion={MOCK_QUESTION} initialAreaId="castle" autoAdvanceDelayMs={0} />
      );

      // Click world area badge in toolbar
      fireEvent.click(screen.getByTestId('world-area-badge'));

      // World map is now open
      expect(screen.getByTestId('world-map-container')).toBeInTheDocument();

      // Click "Back to Archery Range"
      fireEvent.click(screen.getByTestId('back-to-game-btn'));

      // Back to archery range
      expect(screen.queryByTestId('world-map-container')).not.toBeInTheDocument();
      expect(screen.getByTestId('range-backdrop')).toBeInTheDocument();
    });

    it('celebrates newly unlocked realm when daily session completes', () => {
      // 1-arrow session: completing arrow 1 will complete the session (0 -> 1 completed sessions)
      render(
        <GameScreen
          initialQuestion={MOCK_QUESTION}
          maxArrows={1}
          autoAdvanceDelayMs={0}
          shotFlightDurationMs={0}
        />
      );

      // Answer question correctly with Fire arrow (13)
      const fireChoice = screen.getByTestId('choice-fire');
      act(() => {
        fireEvent.click(fireChoice);
      });

      // Session complete screen appears
      expect(screen.getByTestId('session-complete')).toBeInTheDocument();

      // New realm unlocked celebration is displayed!
      const celebration = screen.getByTestId('world-unlock-celebration');
      expect(celebration).toBeInTheDocument();
      expect(celebration).toHaveTextContent(/NEW REALM UNLOCKED!/i);
      expect(celebration).toHaveTextContent(/Fire Village/i);

      // World progress is visible on completion card
      expect(screen.getByTestId('session-world-progress')).toHaveTextContent(
        /World Progression: 2 \/ 5 Realms Discovered/i
      );

      // Clicking "Travel to Fire Village" switches realm
      const travelBtn = screen.getByTestId('travel-new-realm-btn');
      fireEvent.click(travelBtn);

      // Active area is now Fire Village
      expect(screen.getByTestId('world-area-badge')).toHaveTextContent(/Fire Village/i);
    });
  });
});
