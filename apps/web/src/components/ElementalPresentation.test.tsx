import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ElementalArrowGraphic, ELEMENTAL_PROFILES } from './ElementalArrowGraphic';
import { ArcherGraphic } from './ArcherGraphic';
import { ArcheryTarget } from './ArcheryTarget';
import { GameScreen } from './GameScreen';
import { audioFx } from '../audio/AudioFx';
import type { Question, ElementType } from '@math-archer/learning-engine';

const mockElementalQuestion: Question = {
  id: 'q-task-9-2',
  operation: 'add',
  left: 7,
  right: 6,
  answer: 13,
  skill: 'make_10',
  choices: [
    { element: 'fire', value: 13, category: 'correct' },
    { element: 'ice', value: 12, category: 'too_low' },
    { element: 'wind', value: 14, category: 'too_high' },
    { element: 'earth', value: 15, category: 'common_mistake' },
  ],
};

const ALL_ELEMENTS: ElementType[] = ['fire', 'ice', 'wind', 'earth'];

describe('Task 9.2 — Elemental presentation', () => {
  describe('Done When: The four choices are immediately distinguishable without relying only on color', () => {
    it('provides distinct, unique arrowhead and fletching geometry profiles for every element', () => {
      const arrowheadShapes = new Set(
        ALL_ELEMENTS.map((el) => ELEMENTAL_PROFILES[el].arrowheadShape)
      );
      const fletchingShapes = new Set(
        ALL_ELEMENTS.map((el) => ELEMENTAL_PROFILES[el].fletchingShape)
      );
      const glyphs = new Set(ALL_ELEMENTS.map((el) => ELEMENTAL_PROFILES[el].glyph));
      const names = new Set(ALL_ELEMENTS.map((el) => ELEMENTAL_PROFILES[el].name));

      // Each of the 4 elements has a 100% unique geometric arrowhead shape
      expect(arrowheadShapes.size).toBe(4);
      expect(ELEMENTAL_PROFILES.fire.arrowheadShape).toBe('serrated-flame-blade');
      expect(ELEMENTAL_PROFILES.ice.arrowheadShape).toBe('diamond-crystal-prism');
      expect(ELEMENTAL_PROFILES.wind.arrowheadShape).toBe('aerodynamic-winged-crescent');
      expect(ELEMENTAL_PROFILES.earth.arrowheadShape).toBe('chiseled-stone-broadhead');

      // Each of the 4 elements has a 100% unique fletching profile
      expect(fletchingShapes.size).toBe(4);
      expect(ELEMENTAL_PROFILES.fire.fletchingShape).toBe('flame-plume-vanes');
      expect(ELEMENTAL_PROFILES.ice.fletchingShape).toBe('crystal-shard-vanes');
      expect(ELEMENTAL_PROFILES.wind.fletchingShape).toBe('swept-falcon-feathers');
      expect(ELEMENTAL_PROFILES.earth.fletchingShape).toBe('square-notched-hide-vanes');

      // Each has a unique glyph and full text name
      expect(glyphs.size).toBe(4);
      expect(names.size).toBe(4);
    });

    it('renders all four choice buttons with distinct non-color identifiers in the Quiver', () => {
      render(<GameScreen initialQuestion={mockElementalQuestion} autoAdvanceDelayMs={0} />);

      for (const element of ALL_ELEMENTS) {
        const choiceBtn = screen.getByTestId(`choice-${element}`);
        expect(choiceBtn).toBeInTheDocument();

        // 1. Distinct DOM geometric attributes
        expect(choiceBtn).toHaveAttribute('data-element', element);
        expect(choiceBtn).toHaveAttribute(
          'data-arrowhead-shape',
          ELEMENTAL_PROFILES[element].arrowheadShape
        );
        expect(choiceBtn).toHaveAttribute(
          'data-fletching-shape',
          ELEMENTAL_PROFILES[element].fletchingShape
        );

        // 2. Vector arrow model graphic rendered inside
        const arrowSvg = choiceBtn.querySelector('.arrow-vector-svg');
        expect(arrowSvg).toBeInTheDocument();

        // 3. Clear text label and full name
        expect(choiceBtn).toHaveTextContent(ELEMENTAL_PROFILES[element].name);

        // 4. Controller mapping badge (A, B, X, Y)
        const expectedController =
          element === 'fire'
            ? '(A)'
            : element === 'ice'
              ? '(B)'
              : element === 'wind'
                ? '(X)'
                : '(Y)';
        expect(choiceBtn).toHaveTextContent(expectedController);
      }
    });

    it('renders the number prominently centered right in the middle of the arrow', () => {
      render(<GameScreen initialQuestion={mockElementalQuestion} autoAdvanceDelayMs={0} />);

      for (const element of ALL_ELEMENTS) {
        const choiceBtn = screen.getByTestId(`choice-${element}`);
        const centerpiece = choiceBtn.querySelector('.arrow-centerpiece');
        expect(centerpiece).toBeInTheDocument();

        // The arrow underlay is rendered inside the centerpiece
        const arrowUnderlay = centerpiece?.querySelector('.arrow-graphic-underlay');
        expect(arrowUnderlay).toBeInTheDocument();
        expect(arrowUnderlay?.querySelector('.arrow-vector-svg')).toBeInTheDocument();

        // The number sits right in the centerpiece at the center of the arrow
        const valueSpan = centerpiece?.querySelector('.arrow-value');
        expect(valueSpan).toBeInTheDocument();
        expect(valueSpan).toHaveTextContent(/^\d+$/);
      }
    });

    it('renders distinct vector arrowheads and fletchings in ElementalArrowGraphic for all 4 elements', () => {
      const { rerender } = render(<ElementalArrowGraphic element="fire" variant="quiver" />);
      expect(screen.getByTestId('elemental-arrow-fire')).toHaveAttribute(
        'data-arrowhead-shape',
        'serrated-flame-blade'
      );
      expect(document.querySelector('.arrowhead-fire')).toBeInTheDocument();
      expect(document.querySelector('.fletching-fire')).toBeInTheDocument();

      rerender(<ElementalArrowGraphic element="ice" variant="quiver" />);
      expect(screen.getByTestId('elemental-arrow-ice')).toHaveAttribute(
        'data-arrowhead-shape',
        'diamond-crystal-prism'
      );
      expect(document.querySelector('.arrowhead-ice')).toBeInTheDocument();
      expect(document.querySelector('.fletching-ice')).toBeInTheDocument();

      rerender(<ElementalArrowGraphic element="wind" variant="quiver" />);
      expect(screen.getByTestId('elemental-arrow-wind')).toHaveAttribute(
        'data-arrowhead-shape',
        'aerodynamic-winged-crescent'
      );
      expect(document.querySelector('.arrowhead-wind')).toBeInTheDocument();
      expect(document.querySelector('.fletching-wind')).toBeInTheDocument();

      rerender(<ElementalArrowGraphic element="earth" variant="quiver" />);
      expect(screen.getByTestId('elemental-arrow-earth')).toHaveAttribute(
        'data-arrowhead-shape',
        'chiseled-stone-broadhead'
      );
      expect(document.querySelector('.arrowhead-earth')).toBeInTheDocument();
      expect(document.querySelector('.fletching-earth')).toBeInTheDocument();
    });
  });

  describe('Elemental Bow, Nocked Arrow & Arrowhead Shapes', () => {
    it('renders distinct nocked arrow shapes on the recurve bow for each element', () => {
      const { rerender } = render(<ArcherGraphic state="drawing" element="fire" />);
      expect(document.querySelector('.nocked-arrowhead-fire')).toBeInTheDocument();
      expect(document.querySelector('.nocked-fletching-fire')).toBeInTheDocument();

      rerender(<ArcherGraphic state="drawing" element="ice" />);
      expect(document.querySelector('.nocked-arrowhead-ice')).toBeInTheDocument();
      expect(document.querySelector('.nocked-fletching-ice')).toBeInTheDocument();

      rerender(<ArcherGraphic state="drawing" element="wind" />);
      expect(document.querySelector('.nocked-arrowhead-wind')).toBeInTheDocument();
      expect(document.querySelector('.nocked-fletching-wind')).toBeInTheDocument();

      rerender(<ArcherGraphic state="drawing" element="earth" />);
      expect(document.querySelector('.nocked-arrowhead-earth')).toBeInTheDocument();
      expect(document.querySelector('.nocked-fletching-earth')).toBeInTheDocument();
    });
  });

  describe('Target Impact & Embedded Elemental Arrow', () => {
    it('renders distinct embedded arrow geometry and distinct hit feedback for each element', () => {
      const { rerender } = render(
        <ArcheryTarget expression="7 + 6" hitState="hit" activeElement="fire" />
      );
      expect(screen.getByTestId('embedded-arrow')).toHaveAttribute('data-element', 'fire');
      expect(screen.getByTestId('embedded-arrow-fire')).toBeInTheDocument();
      expect(screen.getByTestId('hit-element-badge')).toHaveTextContent('🔥 Flame Combustion!');

      rerender(<ArcheryTarget expression="7 + 6" hitState="hit" activeElement="ice" />);
      expect(screen.getByTestId('embedded-arrow')).toHaveAttribute('data-element', 'ice');
      expect(screen.getByTestId('embedded-arrow-ice')).toBeInTheDocument();
      expect(screen.getByTestId('hit-element-badge')).toHaveTextContent('❄️ Frost Shatter!');

      rerender(<ArcheryTarget expression="7 + 6" hitState="hit" activeElement="wind" />);
      expect(screen.getByTestId('embedded-arrow')).toHaveAttribute('data-element', 'wind');
      expect(screen.getByTestId('embedded-arrow-wind')).toBeInTheDocument();
      expect(screen.getByTestId('hit-element-badge')).toHaveTextContent('💨 Zephyr Tempest!');

      rerender(<ArcheryTarget expression="7 + 6" hitState="hit" activeElement="earth" />);
      expect(screen.getByTestId('embedded-arrow')).toHaveAttribute('data-element', 'earth');
      expect(screen.getByTestId('embedded-arrow-earth')).toBeInTheDocument();
      expect(screen.getByTestId('hit-element-badge')).toHaveTextContent('🪨 Seismic Impact!');
    });

    it('renders distinct miss deflection feedback for each element', () => {
      const { rerender } = render(
        <ArcheryTarget expression="7 + 6" hitState="miss" activeElement="fire" />
      );
      expect(screen.getByTestId('miss-element-detail')).toHaveTextContent('🔥 (Fizzled)');

      rerender(<ArcheryTarget expression="7 + 6" hitState="miss" activeElement="ice" />);
      expect(screen.getByTestId('miss-element-detail')).toHaveTextContent('❄️ (Chipped)');

      rerender(<ArcheryTarget expression="7 + 6" hitState="miss" activeElement="wind" />);
      expect(screen.getByTestId('miss-element-detail')).toHaveTextContent('💨 (Whisked)');

      rerender(<ArcheryTarget expression="7 + 6" hitState="miss" activeElement="earth" />);
      expect(screen.getByTestId('miss-element-detail')).toHaveTextContent('🪨 (Clattered)');
    });
  });

  describe('Procedural Audio Identity for all 4 Elements', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('triggers distinct elemental audio for bow release, flight, and impact across all 4 elements', () => {
      const playBowSpy = vi.spyOn(audioFx, 'playBowRelease');
      const playFlightSpy = vi.spyOn(audioFx, 'playArrowFlight');
      const playHitSpy = vi.spyOn(audioFx, 'playTargetHit');

      for (const element of ALL_ELEMENTS) {
        playBowSpy.mockClear();
        playFlightSpy.mockClear();
        playHitSpy.mockClear();

        const testQ: Question = {
          ...mockElementalQuestion,
          choices: [
            { element, value: 13, category: 'correct' },
            { element: element === 'fire' ? 'ice' : 'fire', value: 10, category: 'too_low' },
          ],
        };

        const { unmount } = render(
          <GameScreen initialQuestion={testQ} autoAdvanceDelayMs={500} shotFlightDurationMs={150} />
        );

        // Click the element choice
        const btn = screen.getByTestId(`choice-${element}`);
        fireEvent.click(btn);

        // Bow release and arrow flight called with specific element
        expect(playBowSpy).toHaveBeenCalledWith(element);
        expect(playFlightSpy).toHaveBeenCalledWith(element);

        // Advance to impact
        act(() => {
          vi.advanceTimersByTime(150);
        });

        // Target hit called with outcome and specific element
        expect(playHitSpy).toHaveBeenCalledWith('hit', element);

        unmount();
      }

      playBowSpy.mockRestore();
      playFlightSpy.mockRestore();
      playHitSpy.mockRestore();
    });

    it('synthesizes distinct acoustic signatures for all elements in AudioFx without errors', () => {
      for (const element of ALL_ELEMENTS) {
        expect(() => {
          audioFx.playBowRelease(element);
          audioFx.playArrowFlight(element);
          audioFx.playTargetHit('hit', element);
          audioFx.playTargetHit('miss', element);
        }).not.toThrow();
      }
    });
  });
});
