import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WizardGraphic } from './WizardGraphic';
import { TrainingDummy } from './TrainingDummy';
import { CharacterGraphic } from './CharacterGraphic';
import { TargetGraphic } from './TargetGraphic';
import { GameScreen } from './GameScreen';
import { audioFx } from '../audio/AudioFx';
import type { Question } from '@math-archer/learning-engine';

const mockQuestion: Question = {
  id: 'q-wizard-test-1',
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

describe('Wizard & Training Dummy Presentation', () => {
  describe('WizardGraphic Component (Character & Spell Staff)', () => {
    it('renders wizard character with cloak, robe body, head, hat, and staff arm in idle state', () => {
      const { container } = render(<WizardGraphic state="idle" />);

      const wizardGraphic = screen.getByTestId('wizard-graphic');
      expect(wizardGraphic).toHaveClass('state-idle');

      // Vector elements exist
      expect(container.querySelector('.wizard-svg')).toBeInTheDocument();
      expect(container.querySelector('.wizard-cloak')).toBeInTheDocument();
      expect(container.querySelector('.wizard-body')).toBeInTheDocument();
      expect(container.querySelector('.wizard-head')).toBeInTheDocument();
      expect(container.querySelector('.wizard-hat')).toBeInTheDocument();
      expect(container.querySelector('.wizard-staff-arm')).toBeInTheDocument();
    });

    it('displays charging runic ring when drawing', () => {
      const { container } = render(<WizardGraphic state="drawing" element="fire" />);

      const wizardGraphic = screen.getByTestId('wizard-graphic');
      expect(wizardGraphic).toHaveClass('state-drawing');

      // Arcane rune circle appears during drawing
      expect(container.querySelector('.charging-rune-circle')).toBeInTheDocument();
      expect(container.querySelector('.staff-charging')).toBeInTheDocument();
    });

    it('displays spellburst radiance on spell release', () => {
      const { container } = render(<WizardGraphic state="released" element="ice" />);

      const wizardGraphic = screen.getByTestId('wizard-graphic');
      expect(wizardGraphic).toHaveClass('state-released');

      expect(container.querySelector('.casting-burst')).toBeInTheDocument();
      expect(container.querySelector('.staff-cast')).toBeInTheDocument();
    });

    it('applies custom outfit and staff skins cleanly', () => {
      render(
        <WizardGraphic
          state="idle"
          equippedOutfit="outfit_ember_crimson"
          equippedBow="bow_ember_blaze"
        />
      );

      const wizardGraphic = screen.getByTestId('wizard-graphic');
      expect(wizardGraphic).toHaveAttribute('data-outfit', 'outfit_ember_crimson');
      expect(wizardGraphic).toHaveAttribute('data-bow', 'bow_ember_blaze');
    });
  });

  describe('TrainingDummy Component (Burlap Mannequin & Spring Pivot)', () => {
    it('renders wooden cross base, straw post, head, and expression crest', () => {
      const { container } = render(<TrainingDummy expression="6 + 7" hitState="idle" />);

      const dummyCard = screen.getByTestId('target-card');
      expect(dummyCard).toHaveAttribute('data-target-type', 'dummy');
      expect(dummyCard).toHaveAttribute('data-hit-state', 'idle');

      // Wood stand & spring elements
      expect(container.querySelector('.dummy-stand')).toBeInTheDocument();
      expect(container.querySelector('.dummy-base-timber.base-h')).toBeInTheDocument();
      expect(container.querySelector('.dummy-base-timber.base-v')).toBeInTheDocument();
      expect(container.querySelector('.dummy-post')).toBeInTheDocument();
      expect(container.querySelector('.dummy-spring')).toBeInTheDocument();

      // SVG dummy elements
      expect(container.querySelector('.dummy-svg')).toBeInTheDocument();
      expect(container.querySelector('.dummy-head')).toBeInTheDocument();
      expect(container.querySelector('.dummy-target-crest')).toBeInTheDocument();

      // Math expression crest
      expect(screen.getByText('6 + 7')).toBeInTheDocument();
      expect(screen.getByText('TRAINING DUMMY')).toBeInTheDocument();
    });

    it('wobbles on coiled spring and renders embedded projectile on hit', () => {
      render(<TrainingDummy expression="6 + 7" hitState="hit" activeElement="fire" />);

      const dummyCard = screen.getByTestId('target-card');
      expect(dummyCard).toHaveClass('target-impact-hit');
      expect(dummyCard).toHaveClass('dummy-hit-wobble');
      expect(dummyCard).toHaveAttribute('data-hit-state', 'hit');

      // Embedded projectile & hit effects
      expect(screen.getByTestId('embedded-arrow')).toBeInTheDocument();
      expect(screen.getByTestId('target-hit-effect')).toBeInTheDocument();
      expect(screen.getByText('✨🎯✨')).toBeInTheDocument();
    });

    it('renders deflection effect without embedded projectile on miss', () => {
      render(<TrainingDummy expression="6 + 7" hitState="miss" activeElement="ice" />);

      const dummyCard = screen.getByTestId('target-card');
      expect(dummyCard).toHaveClass('target-impact-miss');
      expect(dummyCard).toHaveAttribute('data-hit-state', 'miss');
      expect(screen.queryByTestId('embedded-arrow')).not.toBeInTheDocument();
    });
  });

  describe('CharacterGraphic Polymorphic Switching', () => {
    it('renders ArcherGraphic when character is archer', () => {
      render(<CharacterGraphic character="archer" state="idle" />);
      expect(screen.getByTestId('archer-graphic')).toBeInTheDocument();
      expect(screen.queryByTestId('wizard-graphic')).not.toBeInTheDocument();
    });

    it('renders WizardGraphic when character is wizard', () => {
      render(<CharacterGraphic character="wizard" state="idle" />);
      expect(screen.getByTestId('wizard-graphic')).toBeInTheDocument();
      expect(screen.queryByTestId('archer-graphic')).not.toBeInTheDocument();
    });
  });

  describe('TargetGraphic Polymorphic Switching', () => {
    it('renders ArcheryTarget when target is archery_target', () => {
      render(<TargetGraphic target="archery_target" expression="9 + 3" hitState="idle" />);
      const card = screen.getByTestId('target-card');
      expect(card).toHaveAttribute('data-target-type', 'archery_target');
      expect(screen.getByText('TARGET')).toBeInTheDocument();
    });

    it('renders TrainingDummy when target is dummy', () => {
      render(<TargetGraphic target="dummy" expression="9 + 3" hitState="idle" />);
      const card = screen.getByTestId('target-card');
      expect(card).toHaveAttribute('data-target-type', 'dummy');
      expect(screen.getByText('TRAINING DUMMY')).toBeInTheDocument();
    });
  });

  describe('In-Game Quick Switching Controls in GameScreen', () => {
    beforeEach(() => {
      vi.spyOn(audioFx, 'playMagicCast').mockImplementation(() => {});
      vi.spyOn(audioFx, 'playBowRelease').mockImplementation(() => {});
      vi.spyOn(audioFx, 'playDummyHit').mockImplementation(() => {});
      vi.spyOn(audioFx, 'playTargetHit').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('provides switcher bar and toggles between Archer and Wizard', () => {
      render(
        <GameScreen
          initialQuestion={mockQuestion}
          maxArrows={10}
          autoAdvanceDelayMs={0}
          shotFlightDurationMs={0}
        />
      );

      // Switcher bar is rendered
      expect(screen.getByTestId('range-switcher-bar')).toBeInTheDocument();
      const archerBtn = screen.getByTestId('btn-switch-archer');
      const wizardBtn = screen.getByTestId('btn-switch-wizard');

      // Default is archer
      expect(archerBtn).toHaveClass('active');
      expect(wizardBtn).not.toHaveClass('active');
      expect(screen.getByTestId('archer-graphic')).toBeInTheDocument();

      // Click wizard
      fireEvent.click(wizardBtn);

      expect(wizardBtn).toHaveClass('active');
      expect(archerBtn).not.toHaveClass('active');
      expect(screen.getByTestId('wizard-graphic')).toBeInTheDocument();
      expect(audioFx.playMagicCast).toHaveBeenCalled();

      // Switch back to archer
      fireEvent.click(archerBtn);
      expect(archerBtn).toHaveClass('active');
      expect(screen.getByTestId('archer-graphic')).toBeInTheDocument();
      expect(audioFx.playBowRelease).toHaveBeenCalled();
    });

    it('provides switcher bar and toggles between Archery Target and Training Dummy', () => {
      render(
        <GameScreen
          initialQuestion={mockQuestion}
          maxArrows={10}
          autoAdvanceDelayMs={0}
          shotFlightDurationMs={0}
        />
      );

      const targetBtn = screen.getByTestId('btn-switch-target');
      const dummyBtn = screen.getByTestId('btn-switch-dummy');

      // Default is archery target
      expect(targetBtn).toHaveClass('active');
      expect(dummyBtn).not.toHaveClass('active');
      expect(screen.getByTestId('target-card')).toHaveAttribute(
        'data-target-type',
        'archery_target'
      );

      // Click dummy
      fireEvent.click(dummyBtn);

      expect(dummyBtn).toHaveClass('active');
      expect(targetBtn).not.toHaveClass('active');
      expect(screen.getByTestId('target-card')).toHaveAttribute('data-target-type', 'dummy');
      expect(audioFx.playDummyHit).toHaveBeenCalled();

      // Switch back to target
      fireEvent.click(targetBtn);
      expect(targetBtn).toHaveClass('active');
      expect(screen.getByTestId('target-card')).toHaveAttribute(
        'data-target-type',
        'archery_target'
      );
      expect(audioFx.playTargetHit).toHaveBeenCalled();
    });
  });

  describe('Wizard Spell Panels & Projectile Presentation', () => {
    beforeEach(() => {
      vi.spyOn(audioFx, 'playMagicCast').mockImplementation(() => {});
      vi.spyOn(audioFx, 'playBowRelease').mockImplementation(() => {});
      vi.spyOn(audioFx, 'playTargetHit').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('displays Archer arrows by default, and transforms to Wizard spells when switched', () => {
      const { container } = render(
        <GameScreen
          initialQuestion={mockQuestion}
          maxArrows={10}
          autoAdvanceDelayMs={0}
          shotFlightDurationMs={0}
        />
      );

      // 1. Archer State verification
      expect(screen.getByText(/ARCHER'S QUIVER/i)).toBeInTheDocument();
      expect(screen.getByText(/Draw an arrow to loose at the target/i)).toBeInTheDocument();
      expect(screen.getByRole('group', { name: /Elemental arrow choices/i })).toBeInTheDocument();

      // Choice buttons have arrow-fletching-notch and archer profiles
      const fireChoice = screen.getByTestId('choice-fire');
      expect(fireChoice).toHaveClass('character-archer');
      expect(fireChoice.querySelector('.arrow-fletching-notch')).toBeInTheDocument();
      expect(fireChoice.querySelector('.wizard-spell-gem')).not.toBeInTheDocument();
      expect(container.querySelector('.wizard-spell-underlay')).not.toBeInTheDocument();
      expect(container.querySelector('.fletching-fire')).toBeInTheDocument();

      // 2. Switch to Wizard
      const wizardBtn = screen.getByTestId('btn-switch-wizard');
      fireEvent.click(wizardBtn);

      // 3. Wizard State verification
      expect(screen.getByText(/WIZARD'S SPELLBOOK/i)).toBeInTheDocument();
      expect(screen.getByText(/Channel a spell to cast at the target/i)).toBeInTheDocument();
      expect(screen.getByRole('group', { name: /Elemental spell choices/i })).toBeInTheDocument();

      // Choice buttons now have wizard-spell-gem and Spell badges
      const wizardFireChoice = screen.getByTestId('choice-fire');
      expect(wizardFireChoice).toHaveClass('character-wizard');
      expect(wizardFireChoice.querySelector('.wizard-spell-gem')).toBeInTheDocument();
      expect(wizardFireChoice.querySelector('.arrow-fletching-notch')).not.toBeInTheDocument();

      // Labels adapt to elemental spells
      expect(screen.getByText('Fire Spell')).toBeInTheDocument();
      expect(screen.getByText('Ice Spell')).toBeInTheDocument();
      expect(screen.getByText('Wind Spell')).toBeInTheDocument();
      expect(screen.getByText('Earth Spell')).toBeInTheDocument();

      // Choice buttons render the wizard-spell-underlay vector graphic
      const spellUnderlays = container.querySelectorAll('[data-testid="wizard-spell-underlay"]');
      expect(spellUnderlays.length).toBe(4);
    });

    it('launches wizard spell projectile and embeds arcane sigil on impact', async () => {
      vi.useFakeTimers();

      const { container } = render(
        <GameScreen
          initialQuestion={mockQuestion}
          maxArrows={10}
          autoAdvanceDelayMs={1000}
          shotFlightDurationMs={300}
        />
      );

      // Switch to Wizard
      act(() => {
        fireEvent.click(screen.getByTestId('btn-switch-wizard'));
      });

      // Click Fire spell choice
      act(() => {
        fireEvent.click(screen.getByTestId('choice-fire'));
      });

      // Charging nock renders wizard sparkle
      const nock = screen.getByTestId('archer-arrow-nock');
      expect(nock).toHaveAttribute('data-character', 'wizard');
      expect(nock).toHaveTextContent('✨');
      expect(nock).toHaveClass('wizard-spell-spark');

      // Advance timer to transition to in-flight
      act(() => {
        vi.advanceTimersByTime(120);
      });

      // Flying projectile is a wizard spell bolt
      const flyingArrow = screen.getByTestId('flying-arrow');
      expect(flyingArrow).toHaveClass('character-wizard');
      expect(flyingArrow).toHaveAttribute('data-character', 'wizard');
      expect(screen.getByTestId('wizard-spell-projectile')).toBeInTheDocument();

      // Advance timer to reach impact (total flight time is 300ms)
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Target receives impact with embedded wizard spell rune
      expect(container.querySelector('.embedded-wizard-spell')).toBeInTheDocument();

      vi.useRealTimers();
    });
  });
});
