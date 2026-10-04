import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameScreen } from './GameScreen';
import { RewardsScreen } from './RewardsScreen';
import { TargetGraphic } from './TargetGraphic';
import {
  createDefaultRewardsState,
  loadPlayerRewards,
  savePlayerRewards,
  type Question,
} from '@math-archer/learning-engine';
const question: Question = {
  id: 'new-hero-q',
  operation: 'add',
  left: 6,
  right: 7,
  answer: 13,
  skill: 'make_10',
  choices: [
    { element: 'fire', value: 13, category: 'correct' },
    { element: 'ice', value: 12, category: 'too_low' },
    { element: 'wind', value: 14, category: 'too_high' },
    { element: 'earth', value: 15, category: 'common_mistake' },
  ],
};
beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
describe('Gunner and Warrior presentation', () => {
  it.each(['gunner', 'warrior'] as const)(
    'plays %s attacks and retains selection through advance and reload',
    (character) => {
      vi.useFakeTimers();
      const { unmount } = render(
        <GameScreen
          initialQuestion={question}
          maxArrows={10}
          autoAdvanceDelayMs={400}
          shotFlightDurationMs={100}
        />
      );
      fireEvent.click(screen.getByTestId(`btn-switch-${character}`));
      fireEvent.click(screen.getByTestId('btn-switch-dummy'));
      fireEvent.click(screen.getByTestId('choice-fire'));
      expect(screen.getByTestId('flying-arrow')).toHaveAttribute('data-character', character);
      expect(
        screen.getByTestId(
          character === 'gunner' ? 'gunner-muzzle-flash' : 'warrior-release-swoosh'
        )
      ).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(100));
      expect(screen.getByTestId('target-card')).toHaveAttribute('data-hit-state', 'hit');
      expect(screen.getByTestId('embedded-arrow-fire')).toHaveAttribute(
        'data-projectile',
        character === 'gunner' ? 'bullet' : 'axe'
      );
      act(() => vi.advanceTimersByTime(400));
      expect(screen.getByTestId(`${character}-graphic`)).toBeInTheDocument();
      expect(
        screen.getByRole('group', {
          name: `Elemental ${character === 'gunner' ? 'bullet' : 'axe'} choices`,
        })
      ).toBeInTheDocument();
      unmount();
      render(<GameScreen initialQuestion={question} maxArrows={10} />);
      expect(screen.getByTestId(`btn-switch-${character}`)).toHaveClass('active');
      expect(screen.getByTestId('target-card')).toHaveAttribute('data-target-type', 'dummy');
    }
  );
  it.each(['gunner', 'warrior'] as const)(
    'equips %s weapons and effects in the armory and previews the attack',
    (character) => {
      const state = createDefaultRewardsState('player-local');
      state.unlockedCosmeticIds.push('bow_ember_blaze', 'arrow_effect_thunder_strike');
      savePlayerRewards(state);
      render(<RewardsScreen />);
      fireEvent.click(screen.getByTestId(`rewards-switch-${character}`));
      fireEvent.click(screen.getByTestId('tab-cat-bow'));
      expect(
        screen.getAllByText(`Oak Scout ${character === 'gunner' ? 'Gun' : 'Axe'}`).length
      ).toBeGreaterThan(0);
      fireEvent.click(screen.getByTestId('equip-bow_ember_blaze'));
      expect(screen.getByTestId('badge-equipped-bow')).toHaveTextContent(
        `Ember Blaze ${character === 'gunner' ? 'Gun' : 'Axe'}`
      );
      fireEvent.click(screen.getByTestId('tab-cat-effects'));
      fireEvent.click(screen.getByTestId('equip-arrow_effect_thunder_strike'));
      fireEvent.click(screen.getByTestId('btn-test-shot'));
      expect(screen.getByTestId('embedded-arrow-fire')).toHaveAttribute(
        'data-effect',
        'arrow_effect_thunder_strike'
      );
      expect(loadPlayerRewards().equippedCosmetics).toMatchObject({
        character,
        bow: 'bow_ember_blaze',
        arrowEffect: 'arrow_effect_thunder_strike',
      });
    }
  );
  it.each(['gunner', 'warrior'] as const)('renders %s impacts on either target', (character) => {
    const { rerender } = render(
      <TargetGraphic
        character={character}
        expression="6 + 7"
        hitState="hit"
        activeElement="ice"
        equippedEffect="arrow_effect_flame_embers"
      />
    );
    for (const target of ['dummy', 'archery_target'] as const) {
      rerender(
        <TargetGraphic
          target={target}
          character={character}
          expression="6 + 7"
          hitState="hit"
          activeElement="ice"
          equippedEffect="arrow_effect_flame_embers"
        />
      );
      expect(screen.getByTestId('embedded-arrow-ice')).toHaveAttribute('data-character', character);
      expect(screen.getByTestId('hit-stars')).toHaveTextContent('🔥💥🔥');
    }
  });
});
