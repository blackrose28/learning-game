import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { ArcheryTarget } from './ArcheryTarget';
import { ElementalArrowGraphic } from './ElementalArrowGraphic';
import { RewardsScreen } from './RewardsScreen';
import {
  ARROW_EFFECT_VISUALS,
  getArrowEffectVisual,
  DEFAULT_ARROW_EFFECT,
} from './arrowEffects';
import {
  createDefaultRewardsState,
  savePlayerRewards,
  type SessionStorageAdapter,
} from '@math-archer/learning-engine';

class MemoryStorage implements SessionStorageAdapter {
  private data: Record<string, string> = {};
  getItem(key: string): string | null {
    return this.data[key] ?? null;
  }
  setItem(key: string, value: string): void {
    this.data[key] = value;
  }
  removeItem(key: string): void {
    delete this.data[key];
  }
  clear(): void {
    this.data = {};
  }
}

describe('Arrow Effects Visual System', () => {
  it('defines 14 distinct arrow effects with unique icons and glyphs', () => {
    const ids = Object.keys(ARROW_EFFECT_VISUALS);
    expect(ids.length).toBe(14);

    const glyphs = new Set(ids.map((id) => ARROW_EFFECT_VISUALS[id].impactGlyphs));
    // Each effect has distinct impact glyphs
    expect(glyphs.size).toBe(14);

    // Check specific iconic effects
    expect(ARROW_EFFECT_VISUALS.arrow_effect_classic.impactGlyphs).toBe('✨🎯✨');
    expect(ARROW_EFFECT_VISUALS.arrow_effect_stardust.impactGlyphs).toBe('✨💎✨');
    expect(ARROW_EFFECT_VISUALS.arrow_effect_flame_embers.impactGlyphs).toBe('🔥💥🔥');
    expect(ARROW_EFFECT_VISUALS.arrow_effect_thunder_strike.impactGlyphs).toBe('⚡⚡⚡');
    expect(ARROW_EFFECT_VISUALS.arrow_effect_rainbow.impactGlyphs).toBe('🌈✨🌈');
    expect(ARROW_EFFECT_VISUALS.arrow_effect_sakura_petals.impactGlyphs).toBe('🌸🍃🌸');
  });

  it('falls back to default classic effect for unknown or missing effect IDs', () => {
    expect(getArrowEffectVisual(null)).toEqual(DEFAULT_ARROW_EFFECT);
    expect(getArrowEffectVisual(undefined)).toEqual(DEFAULT_ARROW_EFFECT);
    expect(getArrowEffectVisual('unknown_effect')).toEqual(DEFAULT_ARROW_EFFECT);
  });

  describe('ArcheryTarget Impact Feedback', () => {
    it('displays distinct glyphs and effect badge for Twinkling Stardust', () => {
      render(
        <ArcheryTarget
          expression="5 + 3"
          hitState="hit"
          activeElement="ice"
          equippedEffect="arrow_effect_stardust"
        />
      );

      const targetCard = screen.getByTestId('target-card');
      expect(targetCard).toHaveAttribute('data-effect', 'arrow_effect_stardust');
      expect(targetCard).toHaveClass('effect-arrow_effect_stardust');

      const hitStars = screen.getByTestId('hit-stars');
      expect(hitStars).toHaveTextContent('✨💎✨');

      const effectBadge = screen.getByTestId('hit-effect-badge');
      expect(effectBadge).toHaveTextContent('✨ Twinkling Stardust');
    });

    it('displays distinct glyphs and effect badge for Blazing Embers Trail', () => {
      render(
        <ArcheryTarget
          expression="9 + 9"
          hitState="hit"
          activeElement="fire"
          equippedEffect="arrow_effect_flame_embers"
        />
      );

      const targetCard = screen.getByTestId('target-card');
      expect(targetCard).toHaveAttribute('data-effect', 'arrow_effect_flame_embers');

      const hitStars = screen.getByTestId('hit-stars');
      expect(hitStars).toHaveTextContent('🔥💥🔥');

      const effectBadge = screen.getByTestId('hit-effect-badge');
      expect(effectBadge).toHaveTextContent('🔥 Blazing Embers Trail');
    });

    it('displays distinct glyphs and effect badge for Thunderbolt Flash', () => {
      render(
        <ArcheryTarget
          expression="4 + 6"
          hitState="hit"
          activeElement="wind"
          equippedEffect="arrow_effect_thunder_strike"
        />
      );

      const hitStars = screen.getByTestId('hit-stars');
      expect(hitStars).toHaveTextContent('⚡⚡⚡');

      const effectBadge = screen.getByTestId('hit-effect-badge');
      expect(effectBadge).toHaveTextContent('⚡ Thunderbolt Flash');
    });

    it('passes equippedEffect to embedded ElementalArrowGraphic on hit', () => {
      render(
        <ArcheryTarget
          expression="7 + 3"
          hitState="hit"
          activeElement="earth"
          equippedEffect="arrow_effect_rainbow"
        />
      );

      const embeddedContainer = screen.getByTestId('embedded-arrow');
      expect(embeddedContainer).toHaveAttribute('data-effect', 'arrow_effect_rainbow');

      const embeddedArrow = screen.getByTestId('embedded-arrow-earth');
      expect(embeddedArrow).toHaveAttribute('data-effect', 'arrow_effect_rainbow');
      expect(embeddedArrow).toHaveClass('effect-arrow_effect_rainbow');
    });
  });

  describe('ElementalArrowGraphic Visual Overlays', () => {
    it('renders effect overlay in projectile variant', () => {
      render(
        <ElementalArrowGraphic
          element="fire"
          variant="projectile"
          equippedEffect="arrow_effect_dragon_fire"
        />
      );

      const arrow = screen.getByTestId('elemental-arrow-fire');
      expect(arrow).toHaveAttribute('data-effect', 'arrow_effect_dragon_fire');
      expect(arrow).toHaveClass('effect-arrow_effect_dragon_fire');

      const overlay = screen.getByTestId('arrow-effect-overlay');
      expect(overlay).toBeInTheDocument();
      expect(overlay).toHaveClass('arrow-effect-overlay-projectile');
    });

    it('renders effect overlay in embedded variant', () => {
      render(
        <ElementalArrowGraphic
          element="ice"
          variant="embedded"
          equippedEffect="arrow_effect_ice_shards"
        />
      );

      const embedded = screen.getByTestId('embedded-arrow-ice');
      expect(embedded).toHaveAttribute('data-effect', 'arrow_effect_ice_shards');
      expect(embedded).toHaveClass('effect-arrow_effect_ice_shards');

      const overlay = screen.getByTestId('arrow-effect-overlay');
      expect(overlay).toBeInTheDocument();
      expect(overlay).toHaveClass('arrow-effect-overlay-embedded');
    });
  });

  describe('RewardsScreen Showcase & Cosmetic Cards', () => {
    let storage: MemoryStorage;

    beforeEach(() => {
      storage = new MemoryStorage();
    });

    it('displays equipped effect icon on badge chip rather than hardcoded sparkle', () => {
      const state = createDefaultRewardsState('player-1');
      state.unlockedCosmeticIds.push('arrow_effect_flame_embers');
      state.equippedCosmetics.arrowEffect = 'arrow_effect_flame_embers';
      savePlayerRewards(state, storage);

      render(<RewardsScreen playerId="player-1" storage={storage} />);

      const effectBadge = screen.getByTestId('badge-equipped-effect');
      expect(effectBadge).toBeInTheDocument();
      // Should show the flame icon 🔥 instead of hardcoded ✨
      expect(effectBadge).toHaveTextContent('🔥');
      expect(effectBadge).toHaveTextContent('Blazing Embers Trail');
    });

    it('renders visual preview in cosmetic cards for arrow effects', () => {
      const state = createDefaultRewardsState('player-1');
      savePlayerRewards(state, storage);

      render(<RewardsScreen playerId="player-1" storage={storage} />);

      // Switch to arrow effects tab
      fireEvent.click(screen.getByTestId('tab-cat-effects'));

      // Verify preview banner exists for arrow effects
      expect(screen.getByTestId('arrow-preview-arrow_effect_classic')).toBeInTheDocument();
      expect(screen.getByTestId('arrow-preview-arrow_effect_stardust')).toBeInTheDocument();
    });

    it('updating equipped arrow effect immediately updates showcase target effect', () => {
      const state = createDefaultRewardsState('player-1');
      state.unlockedCosmeticIds.push('arrow_effect_thunder_strike');
      savePlayerRewards(state, storage);

      render(<RewardsScreen playerId="player-1" storage={storage} />);

      fireEvent.click(screen.getByTestId('tab-cat-effects'));
      fireEvent.click(screen.getByTestId('equip-arrow_effect_thunder_strike'));

      // Showcase target should have data-effect updated to thunder strike
      const target = screen.getByTestId('stage-target-preview').querySelector('[data-testid="target-card"]');
      expect(target).toHaveAttribute('data-effect', 'arrow_effect_thunder_strike');

      // Equipped badge chip should show thunderbolt icon ⚡
      const effectBadge = screen.getByTestId('badge-equipped-effect');
      expect(effectBadge).toHaveTextContent('⚡');
      expect(effectBadge).toHaveTextContent('Thunderbolt Flash');
    });
  });
});
