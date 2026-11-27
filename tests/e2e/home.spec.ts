import { test, expect } from '@playwright/test';

test('homepage loads and the game mounts', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('Math Archer');
  await expect(page.locator('#root > *')).toHaveCount(1);
  await expect(page.getByText('Math Archer').first()).toBeVisible();
});

test('main navigation is visible', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Play').first()).toBeVisible();
  await expect(page.getByText('World Map').first()).toBeVisible();
  await expect(page.getByText('Royal Armory').first()).toBeVisible();
});
