import { test, expect } from '@playwright/test';

// The flying projectile must fade out the moment it hits the target. The
// flight animation ends with the arrow pinned on the target at full opacity,
// so without an impact fade it lingers there until the next question
// advances (about 0.9s on Normal speed). Only a real browser can catch this:
// jsdom cannot evaluate CSS animations, so the unit tests pin the classes
// the fade is keyed off and this spec checks the computed result.
test('flying projectile fades out on impact instead of lingering on the target', async ({
  page,
}) => {
  // Fresh session so no Adventure reasoning mission is offered on load
  // (the mission cadence is every 5 arrows).
  await page.addInitScript(() => {
    const date = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    const session = {
      id: `session_${date}_projectile`,
      playerId: 'player-local',
      date,
      arrowsAllowed: 50,
      arrowsUsed: 0,
      hits: 0,
      status: 'in_progress',
      startedAt: new Date().toISOString(),
    };
    localStorage.setItem(`math_archer_session_player-local_${date}`, JSON.stringify(session));
    localStorage.setItem('math_archer_sessions_index_player-local', JSON.stringify([date]));
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Play Game' }).click();

  // An Adventure reasoning mission may be offered on load instead of the
  // game (a resumable one left by an earlier run, or the 5-arrow cadence).
  // It cannot be skipped, but starting it and pausing it right away defers
  // the offer and returns to the game.
  await page.waitForTimeout(1500);
  const missionHeading = page.getByRole('heading', { name: /Nhiệm vụ suy luận/ });
  if (await missionHeading.isVisible().catch(() => false)) {
    // Either the offer (start it first) or a mission already in progress
    // (pause it directly); both paths land back on the game.
    const startButton = page.getByRole('button', { name: 'Bắt đầu nhiệm vụ' });
    if (await startButton.isVisible().catch(() => false)) {
      await startButton.click();
    }
    await page.getByRole('button', { name: /Tạm dừng, làm tiếp sau/ }).click();
  }

  const targetCard = page.getByTestId('target-card');
  await expect(targetCard).toBeVisible();

  // Read the problem off the target and answer it.
  const targetText = (await page.getByTestId('question-expression').innerText()) ?? '';
  const match = targetText.match(/(\d+)\s*([+\-×÷])\s*(\d+)/);
  expect(match).not.toBeNull();
  const [, left, operator, right] = match as unknown as [string, string, string, string];
  const answer =
    operator === '+'
      ? Number(left) + Number(right)
      : operator === '-'
        ? Number(left) - Number(right)
        : operator === '×'
          ? Number(left) * Number(right)
          : Number(left) / Number(right);
  await page.locator(`[data-testid^="choice-"][data-value="${answer}"]`).first().click();

  // Capture the impact state by polling in the page, not by a fixed
  // wall-clock wait: on a slow machine a fixed wait can land after the
  // next question has already advanced and unmounted the arrow. The fade
  // (0.1s) finishes well before the advance on every speed, so the moment
  // the flying arrow's computed opacity hits 0 is the moment to check.
  type ImpactState = {
    flyingPresent: boolean;
    flyingOpacity: string;
    flyingAnimation: string;
    embeddedPresent: boolean;
    hitState: string | null;
  };
  const state = (await page
    .waitForFunction(
      () => {
        const flying = document.querySelector('[data-testid="flying-arrow"]');
        if (!flying) return null;
        const style = getComputedStyle(flying);
        if (style.opacity !== '0') return null;
        return {
          flyingPresent: true,
          flyingOpacity: style.opacity,
          flyingAnimation: style.animationName,
          embeddedPresent: document.querySelector('[data-testid="embedded-arrow"]') !== null,
          hitState: document
            .querySelector('[data-testid="target-card"]')
            ?.getAttribute('data-hit-state'),
        };
      },
      { timeout: 3000 }
    )
    .then((handle) => handle.jsonValue())) as ImpactState;

  // The flying projectile is gone; the stuck-in-target visual belongs to the
  // target itself and must still be showing.
  expect(state.flyingPresent).toBe(true);
  expect(state.flyingOpacity).toBe('0');
  expect(state.flyingAnimation).toBe('arrow-impact-fade');
  expect(state.embeddedPresent).toBe(true);
  expect(state.hitState).toBe('hit');
});
