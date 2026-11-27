import { test, expect, type Page } from '@playwright/test';

/** Unlocks the Parent Dashboard with the demo parent PIN (1234). */
async function unlockParentDashboard(page: Page) {
  await page.goto('/');
  // The dashboard tab lives in the slide-out menu drawer.
  await page.getByTestId('app-menu-toggle').click();
  await expect(page.getByTestId('tab-dashboard')).toBeVisible();
  await page.getByTestId('tab-dashboard').click();
  await expect(page.getByTestId('parent-gate')).toBeVisible();
  for (const digit of ['1', '2', '3', '4']) {
    await page.getByTestId(`keypad-${digit}`).click();
  }
  await expect(page.getByTestId('parent-dashboard-view')).toBeVisible();
}

test('parent dashboard opens on Today with one verdict and three numbers', async ({ page }) => {
  await unlockParentDashboard(page);

  await expect(page.getByTestId('today-verdict')).toBeVisible();
  // The count itself depends on shared dev-server state (other E2E tests
  // sync the demo child's session), so only assert the "N / 50" shape.
  await expect(page.getByTestId('today-arrows-metric')).toContainText(' / 50');
  await expect(page.getByTestId('today-attention-metric')).toBeVisible();
  // Detail sections stay hidden until their tab is opened.
  await expect(page.getByTestId('skills-breakdown-section')).toHaveCount(0);
  await expect(page.getByTestId('reasoning-performance-section')).toHaveCount(0);
});

test('dashboard tabs switch between Today, Progress, Reasoning and Settings', async ({ page }) => {
  await unlockParentDashboard(page);

  await page.getByTestId('dashboard-tab-progress').click();
  await expect(page.getByTestId('skills-breakdown-section')).toBeVisible();
  await expect(page.getByTestId('today-verdict')).toHaveCount(0);

  await page.getByTestId('dashboard-tab-reasoning').click();
  await expect(page.getByTestId('reasoning-performance-section')).toBeVisible();
  await expect(page.getByTestId('skills-breakdown-section')).toHaveCount(0);

  await page.getByTestId('dashboard-tab-settings').click();
  await expect(page.getByTestId('profiles-section')).toBeVisible();
  await expect(page.getByTestId('reasoning-performance-section')).toHaveCount(0);

  await page.getByTestId('dashboard-tab-today').click();
  await expect(page.getByTestId('today-verdict')).toBeVisible();
  await expect(page.getByTestId('profiles-section')).toHaveCount(0);
});
