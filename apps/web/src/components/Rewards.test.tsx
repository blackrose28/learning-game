import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { RewardsScreen } from './RewardsScreen';
import { GameScreen } from './GameScreen';
import { App } from '../App';
import type { MathArcherApiClient } from '../api/client';
import {
  type SessionStorageAdapter,
  savePlayerRewards,
  createDefaultRewardsState,
} from '@math-archer/learning-engine';

class MemoryStorage implements SessionStorageAdapter {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

describe('Task 9.4 — Rewards Integration Tests', () => {
  let storage: SessionStorageAdapter;

  beforeEach(() => {
    storage = new MemoryStorage();
    localStorage.clear();
  });

  describe('RewardsScreen component', () => {
    it('renders archer rank, XP progress, daily streak, and tomorrow bounty card', () => {
      const state = createDefaultRewardsState('player-1');
      state.totalXp = 150;
      state.level = 2;
      state.levelTitle = 'Apprentice Bowman';
      state.currentStreak = 2;
      savePlayerRewards(state, storage);

      render(<RewardsScreen playerId="player-1" storage={storage} />);

      expect(screen.getByTestId('rewards-screen')).toBeInTheDocument();
      expect(screen.getByTestId('player-level-badge')).toHaveTextContent(/Level 2/i);
      expect(screen.getByTestId('player-level-badge')).toHaveTextContent(/Apprentice Bowman/i);
      expect(screen.getByTestId('streak-badge')).toHaveTextContent(/2 Days/i);
      expect(screen.getByTestId('tomorrow-bounty-card')).toBeInTheDocument();
      expect(screen.getByTestId('tomorrow-bounty-card')).toHaveTextContent(
        /Tomorrow's Daily Bounty/i
      );
    });

    it('renders hero showcase stage with archer graphic and castle backdrop', () => {
      render(<RewardsScreen playerId="player-1" storage={storage} />);

      const showcase = screen.getByTestId('rewards-showcase');
      expect(showcase).toBeInTheDocument();
      expect(showcase.querySelector('[data-testid="archer-graphic"]')).toBeInTheDocument();
      expect(showcase.querySelector('[data-testid="range-backdrop"]')).toBeInTheDocument();
    });

    it('allows navigating between Outfits, Bow Skins, Arrow Effects, Castle Decorations, and Trophy Wall', () => {
      render(<RewardsScreen playerId="player-1" storage={storage} />);

      // Default is outfit
      expect(screen.getByTestId('tab-cat-outfit')).toHaveClass('active');
      expect(screen.getByTestId('cosmetic-card-outfit_classic_green')).toBeInTheDocument();

      // Switch to Bows
      fireEvent.click(screen.getByTestId('tab-cat-bow'));
      expect(screen.getByTestId('tab-cat-bow')).toHaveClass('active');
      expect(screen.getByTestId('cosmetic-card-bow_recurve_oak')).toBeInTheDocument();

      // Switch to Arrow Effects
      fireEvent.click(screen.getByTestId('tab-cat-effects'));
      expect(screen.getByTestId('tab-cat-effects')).toHaveClass('active');
      expect(screen.getByTestId('cosmetic-card-arrow_effect_classic')).toBeInTheDocument();

      // Switch to Castle Decorations
      fireEvent.click(screen.getByTestId('tab-cat-castle'));
      expect(screen.getByTestId('tab-cat-castle')).toHaveClass('active');
      expect(screen.getByTestId('cosmetic-card-castle_banner_royal_lion')).toBeInTheDocument();

      // Switch to Trophy Wall
      fireEvent.click(screen.getByTestId('tab-cat-achievements'));
      expect(screen.getByTestId('tab-cat-achievements')).toHaveClass('active');
      expect(screen.getByTestId('achievements-wall')).toBeInTheDocument();
      expect(screen.getByTestId('ach-card-ach_first_arrow')).toBeInTheDocument();
    });

    it('allows equipping unlocked cosmetics and updates showcase inspection', () => {
      const state = createDefaultRewardsState('player-1');
      // Unlock ember bow
      state.unlockedCosmeticIds.push('bow_ember_blaze');
      savePlayerRewards(state, storage);

      render(<RewardsScreen playerId="player-1" storage={storage} />);

      // Go to Bow tab
      fireEvent.click(screen.getByTestId('tab-cat-bow'));

      // Click equip on ember bow
      const equipBtn = screen.getByTestId('equip-bow_ember_blaze');
      expect(equipBtn).toBeInTheDocument();
      fireEvent.click(equipBtn);

      // Status should now be equipped
      expect(screen.getByTestId('status-equipped-bow_ember_blaze')).toBeInTheDocument();

      // Showcase archer graphic should now have data-bow="bow_ember_blaze"
      const archer = screen.getByTestId('rewards-showcase').querySelector('[data-testid="archer-graphic"]');
      expect(archer).toHaveAttribute('data-bow', 'bow_ember_blaze');
    });

    it('pushes real-time updates to apiClient when equipping items', () => {
      const state = createDefaultRewardsState('player-1');
      state.unlockedCosmeticIds.push('outfit_ember_crimson');
      savePlayerRewards(state, storage);

      const mockApiClient = {
        updatePlayerRewards: vi.fn().mockResolvedValue({ success: true }),
      } as unknown as MathArcherApiClient;

      render(
        <RewardsScreen
          playerId="player-1"
          storage={storage}
          apiClient={mockApiClient}
        />
      );

      // Equip Ember Hearth Robe
      const equipBtn = screen.getByTestId('equip-outfit_ember_crimson');
      fireEvent.click(equipBtn);

      expect(mockApiClient.updatePlayerRewards).toHaveBeenCalledWith(
        expect.objectContaining({
          equippedCosmetics: expect.objectContaining({
            outfit: 'outfit_ember_crimson',
          }),
        }),
        'player-1'
      );
    });
  });

  describe('GameScreen Rewards Integration', () => {
    it('displays player level and streak badges in the game header', () => {
      const state = createDefaultRewardsState('player-1');
      state.totalXp = 350;
      state.level = 3;
      state.levelTitle = 'Ranger Scout';
      state.currentStreak = 1;
      savePlayerRewards(state, storage);

      render(
        <GameScreen
          playerId="player-1"
          storage={storage}
          autoAdvanceDelayMs={0}
        />
      );

      const levelBadge = screen.getByTestId('player-level-badge');
      expect(levelBadge).toBeInTheDocument();
      expect(levelBadge).toHaveTextContent(/Lvl 3/i);

      const streakBadge = screen.getByTestId('streak-badge');
      expect(streakBadge).toBeInTheDocument();
      expect(streakBadge).toHaveTextContent(/1d/i);
    });

    it('passes equipped cosmetics to ArcherGraphic, RangeBackdrop, and ArcheryTarget', () => {
      const state = createDefaultRewardsState('player-1');
      state.unlockedCosmeticIds.push(
        'outfit_ember_crimson',
        'bow_ember_blaze',
        'arrow_effect_stardust',
        'castle_banner_dragon_fire'
      );
      state.equippedCosmetics.outfit = 'outfit_ember_crimson';
      state.equippedCosmetics.bow = 'bow_ember_blaze';
      state.equippedCosmetics.arrowEffect = 'arrow_effect_stardust';
      state.equippedCosmetics.castleBanner = 'castle_banner_dragon_fire';
      savePlayerRewards(state, storage);

      render(
        <GameScreen
          playerId="player-1"
          storage={storage}
          autoAdvanceDelayMs={0}
        />
      );

      // Archer graphic reflects equipped outfit & bow
      const archer = screen.getByTestId('archer-graphic');
      expect(archer).toHaveAttribute('data-outfit', 'outfit_ember_crimson');
      expect(archer).toHaveAttribute('data-bow', 'bow_ember_blaze');

      // Range backdrop reflects equipped castle banner
      const backdrop = screen.getByTestId('range-backdrop');
      expect(backdrop).toHaveAttribute('data-banner', 'castle_banner_dragon_fire');

      // Archery target reflects equipped arrow effect
      const target = screen.getByTestId('target-card');
      expect(target).toHaveAttribute('data-effect', 'arrow_effect_stardust');
    });

    it('submitting an answer awards XP and displays floating XP pill', async () => {
      render(
        <GameScreen
          playerId="player-1"
          storage={storage}
          autoAdvanceDelayMs={100}
        />
      );

      const buttons = screen.getAllByRole('button');
      const answerChoice = buttons.find((btn) => btn.getAttribute('data-value'));
      expect(answerChoice).toBeDefined();

      await act(async () => {
        fireEvent.click(answerChoice!);
      });

      // Floating XP pill should appear
      const floatingPill = screen.getByTestId('floating-xp-pill');
      expect(floatingPill).toBeInTheDocument();
      expect(floatingPill).toHaveTextContent(/XP/i);
    });

    it('completing daily session displays Tomorrow Bounty Card motivating return tomorrow', async () => {
      render(
        <GameScreen
          playerId="player-1"
          storage={storage}
          maxArrows={1}
          autoAdvanceDelayMs={0}
        />
      );

      const buttons = screen.getAllByRole('button');
      const answerChoice = buttons.find((btn) => btn.getAttribute('data-value'));

      await act(async () => {
        fireEvent.click(answerChoice!);
      });

      // Session complete card should render
      expect(screen.getByTestId('session-complete')).toBeInTheDocument();

      // Rewards summary
      expect(screen.getByTestId('session-rewards-summary')).toBeInTheDocument();
      expect(screen.getByTestId('session-rewards-summary')).toHaveTextContent(
        /\+100 XP Earned/i
      );

      // Tomorrow's Bounty Card
      const bountyCard = screen.getByTestId('tomorrow-bounty-card');
      expect(bountyCard).toBeInTheDocument();
      expect(bountyCard).toHaveTextContent(/TOMORROW'S BOUNTY/i);
    });
  });

  describe('App.tsx Navigation Integration', () => {
    it('has Royal Armory tab and navigates to RewardsScreen', () => {
      render(<App />);

      const rewardsTab = screen.getByTestId('tab-rewards');
      expect(rewardsTab).toBeInTheDocument();
      expect(rewardsTab).toHaveTextContent(/Royal Armory/i);

      fireEvent.click(rewardsTab);
      expect(screen.getByTestId('rewards-screen')).toBeInTheDocument();
    });
  });
});
