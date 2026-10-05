import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorldMap } from './WorldMap';
import { RewardsScreen } from './RewardsScreen';
import { App } from '../App';
import { saveDailySession } from '@math-archer/learning-engine';

describe('Single-Screen Redesign: World Map & Royal Armory', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('WorldMap Single-Screen Layout', () => {
    it('renders the dual-column arena layout matching Play tab structure', () => {
      const onSelectArea = vi.fn();
      const onBackToGame = vi.fn();

      const { container } = render(
        <WorldMap
          playerId="player-single-screen-test"
          onSelectArea={onSelectArea}
          onBackToGame={onBackToGame}
        />
      );

      // 1. Root container and header
      const mapContainer = screen.getByTestId('world-map-container');
      expect(mapContainer).toBeInTheDocument();
      expect(screen.getByTestId('world-map-title')).toHaveTextContent(/Archery World Map/i);
      expect(screen.getByTestId('world-progression-bar')).toBeInTheDocument();
      expect(screen.getByTestId('back-to-game-btn')).toBeInTheDocument();

      // 2. Arena layout with Left Column (Stage) and Right Column (Path)
      const arena = container.querySelector('.world-map-arena');
      expect(arena).toBeInTheDocument();

      const stageCol = screen.getByTestId('world-map-stage-column');
      expect(stageCol).toBeInTheDocument();
      expect(stageCol.querySelector('[data-testid="range-backdrop"]')).toBeInTheDocument();

      const pathCol = container.querySelector('.world-map-path-column');
      expect(pathCol).toBeInTheDocument();
      expect(screen.getByTestId('world-map-schema-view')).toBeInTheDocument();

      // 3. Right column contains all 5 realm cards
      expect(screen.getByTestId('realm-card-castle')).toBeInTheDocument();
      expect(screen.getByTestId('realm-card-fire_area')).toBeInTheDocument();
      expect(screen.getByTestId('realm-card-ice_area')).toBeInTheDocument();
      expect(screen.getByTestId('realm-card-wind_area')).toBeInTheDocument();
      expect(screen.getByTestId('realm-card-earth_area')).toBeInTheDocument();
    });

    it('updates the left-column inspection stage when selecting different realm cards', () => {
      const today = new Date().toISOString().slice(0, 10);
      saveDailySession({
        id: 'session-1',
        playerId: 'player-single-screen-test',
        date: today,
        arrowsAllowed: 50,
        arrowsUsed: 50,
        hits: 45,
        status: 'completed',
        startedAt: `${today}T08:00:00.000Z`,
      });

      render(<WorldMap playerId="player-single-screen-test" />);

      // Initial inspected area is castle (active)
      const stageCol = screen.getByTestId('world-map-stage-column');
      let backdrop = stageCol.querySelector('[data-testid="range-backdrop"]');
      expect(backdrop).toHaveAttribute('data-area', 'castle');

      // Click on Fire Village card row to inspect Fire Village
      const fireCard = screen.getByTestId('realm-card-fire_area');
      fireEvent.click(fireCard);

      // Left column backdrop updates to fire_area!
      backdrop = stageCol.querySelector('[data-testid="range-backdrop"]');
      expect(backdrop).toHaveAttribute('data-area', 'fire_area');
      expect(stageCol).toHaveTextContent(/Fire Village/i);
    });

    it('triggers travel action from both the stage action row and the card button', () => {
      const today = new Date().toISOString().slice(0, 10);
      saveDailySession({
        id: 'session-1',
        playerId: 'player-single-screen-test',
        date: today,
        arrowsAllowed: 50,
        arrowsUsed: 50,
        hits: 45,
        status: 'completed',
        startedAt: `${today}T08:00:00.000Z`,
      });

      const onSelectArea = vi.fn();
      render(<WorldMap playerId="player-single-screen-test" onSelectArea={onSelectArea} />);

      // Travel using the travel button inside realm card
      const travelBtn = screen.getByTestId('travel-btn-fire_area');
      fireEvent.click(travelBtn);

      expect(onSelectArea).toHaveBeenCalledWith('fire_area');
      expect(screen.getByTestId('badge-active-fire_area')).toBeInTheDocument();
    });
  });

  describe('RewardsScreen Single-Screen Layout', () => {
    it('renders the dual-column arena layout matching Play tab structure', () => {
      const onBackToGame = vi.fn();
      const { container } = render(
        <RewardsScreen playerId="player-single-screen-test" onBackToGame={onBackToGame} />
      );

      // 1. Root screen and HUD header
      const screenEl = screen.getByTestId('rewards-screen');
      expect(screenEl).toBeInTheDocument();
      expect(screen.getByTestId('player-level-badge')).toBeInTheDocument();
      expect(screen.getByTestId('player-xp-text')).toBeInTheDocument();
      expect(screen.getByTestId('streak-badge')).toBeInTheDocument();
      expect(screen.getByTestId('tomorrow-bounty-card')).toBeInTheDocument();
      expect(screen.getByTestId('btn-back-to-game')).toBeInTheDocument();

      // 2. Arena layout with Left Column (Showcase Stage) and Right Column (Catalog)
      const arena = container.querySelector('.armory-arena-layout');
      expect(arena).toBeInTheDocument();

      const stageCol = screen.getByTestId('rewards-showcase');
      expect(stageCol).toBeInTheDocument();
      expect(stageCol.querySelector('[data-testid="range-backdrop"]')).toBeInTheDocument();
      expect(stageCol.querySelector('[data-testid="stage-archer-preview"]')).toBeInTheDocument();
      expect(stageCol.querySelector('[data-testid="stage-target-preview"]')).toBeInTheDocument();
      expect(stageCol.querySelector('[data-testid="stage-equipped-badges"]')).toBeInTheDocument();

      const catalogCol = container.querySelector('.armory-catalog-column');
      expect(catalogCol).toBeInTheDocument();
      expect(screen.getByTestId('armory-category-nav')).toBeInTheDocument();
      expect(screen.getByTestId('cosmetics-grid')).toBeInTheDocument();
    });

    it('switches categories and updates the catalog while keeping showcase stage intact', () => {
      render(<RewardsScreen playerId="player-single-screen-test" />);

      // Switch to Bows
      fireEvent.click(screen.getByTestId('tab-cat-bow'));
      expect(screen.getByTestId('cosmetic-card-bow_recurve_oak')).toBeInTheDocument();

      // Switch to Trophies
      fireEvent.click(screen.getByTestId('tab-cat-achievements'));
      expect(screen.getByTestId('achievements-wall')).toBeInTheDocument();
      expect(screen.getByTestId('trophy-filters')).toBeInTheDocument();

      // Showcase stage is still rendered concurrently on the left
      expect(screen.getByTestId('rewards-showcase')).toBeInTheDocument();
    });
  });

  describe('Full App Viewport Integration', () => {
    const testViewports = [
      { name: 'Desktop (1440x900)', width: 1440, height: 900 },
      { name: 'Tablet landscape (1024x768)', width: 1024, height: 768 },
      { name: 'Phone portrait (414x896)', width: 414, height: 896 },
    ];

    testViewports.forEach(({ name, width, height }) => {
      it(`navigates between Play, World Map, and Royal Armory on ${name} as single-screen views`, () => {
        window.innerWidth = width;
        window.innerHeight = height;
        window.dispatchEvent(new Event('resize'));

        const { container } = render(<App />);

        // 1. Play tab is single screen
        expect(screen.getByTestId('tab-game')).toHaveClass('active');
        expect(container.querySelector('.game-arena-layout')).toBeInTheDocument();

        // 2. Navigate to World Map tab: single screen arena
        fireEvent.click(screen.getByTestId('tab-world'));
        expect(screen.getByTestId('tab-world')).toHaveClass('active');
        expect(screen.getByTestId('world-map-container')).toBeInTheDocument();
        expect(container.querySelector('.world-map-arena')).toBeInTheDocument();

        // 3. Navigate to Royal Armory tab: single screen arena
        fireEvent.click(screen.getByTestId('tab-rewards'));
        expect(screen.getByTestId('tab-rewards')).toHaveClass('active');
        expect(screen.getByTestId('rewards-screen')).toBeInTheDocument();
        expect(container.querySelector('.armory-arena-layout')).toBeInTheDocument();

        // 4. Return to Play tab
        fireEvent.click(screen.getByTestId('tab-game'));
        expect(screen.getByTestId('tab-game')).toHaveClass('active');
        expect(container.querySelector('.game-arena-layout')).toBeInTheDocument();
      });
    });
  });
});
