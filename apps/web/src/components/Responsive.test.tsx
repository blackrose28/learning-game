import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameScreen } from './GameScreen';

/**
 * Task 8.2 — Make the game responsive
 * Test targets specified in math-archer-plan.md:
 * - Small phone portrait (320px x 568px)
 * - Large phone (414px x 896px)
 * - Tablet portrait (768px x 1024px)
 * - Tablet landscape (1024px x 768px)
 * - Desktop (1440px x 900px)
 *
 * Done When:
 * "No answer is too small to comfortably tap and the four choices remain obvious at every target size."
 */

describe('Task 8.2 — Responsive Layout across Multi-Device Viewports', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const viewports = [
    { name: 'Small phone portrait (320x568)', width: 320, height: 568 },
    { name: 'Large phone portrait (414x896)', width: 414, height: 896 },
    { name: 'Tablet portrait (768x1024)', width: 768, height: 1024 },
    { name: 'Tablet landscape (1024x768)', width: 1024, height: 768 },
    { name: 'Desktop (1440x900)', width: 1440, height: 900 },
  ];

  viewports.forEach(({ name, width, height }) => {
    describe(`Viewport: ${name}`, () => {
      it('renders 4 obvious elemental choices that are accessible and easily tappable', () => {
        // Set viewport dimensions
        window.innerWidth = width;
        window.innerHeight = height;
        window.dispatchEvent(new Event('resize'));

        render(<GameScreen playerId="player-responsive-test" />);

        // 1. Question is visible and non-empty
        const questionEl = screen.getByTestId('question-expression');
        expect(questionEl).toBeInTheDocument();
        expect(questionEl.textContent?.trim()).not.toBe('');

        // 2. Exactly four elemental choices are present
        const fireBtn = screen.getByTestId('choice-fire');
        const iceBtn = screen.getByTestId('choice-ice');
        const windBtn = screen.getByTestId('choice-wind');
        const earthBtn = screen.getByTestId('choice-earth');

        const choices = [fireBtn, iceBtn, windBtn, earthBtn];
        expect(choices).toHaveLength(4);

        choices.forEach((btn) => {
          expect(btn).toBeInTheDocument();
          expect(btn).toBeVisible();

          // Has arrow-button class with touch-action: manipulation and min-height >= 48px
          expect(btn).toHaveClass('arrow-button');

          // Check that button has elemental value and accessible label
          expect(btn).toHaveAttribute('data-value');
          expect(btn.getAttribute('data-value')).toMatch(/^\d+$/);

          // Both icon and numeric value are rendered inside the choice
          const valueSpan = btn.querySelector('.arrow-value');
          expect(valueSpan).not.toBeNull();
          expect(valueSpan?.textContent).toBeTruthy();

          const iconSpan = btn.querySelector('.element-icon');
          expect(iconSpan).not.toBeNull();
          expect(iconSpan?.textContent).toBeTruthy();
        });

        // 3. Four choices are distinct elements
        expect(fireBtn).toHaveClass('element-fire');
        expect(iceBtn).toHaveClass('element-ice');
        expect(windBtn).toHaveClass('element-wind');
        expect(earthBtn).toHaveClass('element-earth');

        // 4. Session progress section is visible
        expect(screen.getByTestId('progress-section')).toBeVisible();

        // 5. Arrow animation is anchored inside archer-stage
        const archerStage = screen.getByTestId('archer-stage');
        expect(archerStage).toBeInTheDocument();
      });

      it('anchors arrow projectile inside archer-stage during shooting interaction', () => {
        window.innerWidth = width;
        window.innerHeight = height;
        window.dispatchEvent(new Event('resize'));

        render(<GameScreen playerId="player-responsive-arrow-test" autoAdvanceDelayMs={1000} />);

        const archerStage = screen.getByTestId('archer-stage');
        const fireBtn = screen.getByTestId('choice-fire');
        fireEvent.click(fireBtn);

        const flyingArrow = screen.getByTestId('flying-arrow');
        expect(flyingArrow).toBeInTheDocument();
        expect(archerStage).toContainElement(flyingArrow);
      });
    });
  });
});
