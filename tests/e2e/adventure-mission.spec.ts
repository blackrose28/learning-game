import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

const REASONING_SETTINGS = {
  schemaVersion: 1,
  enabledFamilies: ['instruction_chain'],
  adventureEnabled: true,
};

/**
 * The app logs the child in on load and takes the child's reasoning settings
 * from the server record, so localStorage alone cannot enable the mission:
 * the server's demo child defaults to no families. Enable the mission on the
 * server first, the way a parent would (demo parent: parent123).
 */
async function enableAdventureMissionOnServer(request: APIRequestContext) {
  const login = await request.post('/api/auth/parent/login', {
    data: { email: 'parent@math-archer.local', password: 'parent123' },
  });
  expect(login.ok()).toBe(true);
  const { token } = (await login.json()) as { token: string };
  const update = await request.put('/api/parent/children/player-local', {
    headers: { Authorization: `Bearer ${token}` },
    data: { reasoningSettings: REASONING_SETTINGS },
  });
  expect(update.ok()).toBe(true);
}

/**
 * Seeds the local player with five Adventure arrows spent, so a reasoning
 * mission is due at the next question boundary. Mirrors the unit-test setup
 * in App.test.tsx, but through the real browser's localStorage.
 */
async function seedAdventureMissionDue(page: Page) {
  await page.addInitScript(() => {
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
    localStorage.setItem(
      'math_archer_reasoning_settings_player-local',
      JSON.stringify({
        schemaVersion: 1,
        enabledFamilies: ['instruction_chain'],
        adventureEnabled: true,
      })
    );
    localStorage.setItem(
      `math_archer_session_player-local_${date}`,
      JSON.stringify({
        id: `session_${date}_e2e`,
        playerId: 'player-local',
        date,
        arrowsAllowed: 50,
        arrowsUsed: 5,
        hits: 0,
        status: 'in_progress',
        startedAt: new Date().toISOString(),
      })
    );
    localStorage.setItem('math_archer_sessions_index_player-local', JSON.stringify([date]));
  });
}

test('an offered Adventure reasoning mission cannot be skipped', async ({ page, request }) => {
  // The API starts with the web server; retry the login briefly if it is not up yet.
  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await enableAdventureMissionOnServer(request);
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(1000);
    }
  }
  if (lastError) throw lastError;

  await seedAdventureMissionDue(page);
  await page.goto('/');

  const missionHeading = page.getByRole('heading', { name: /Nhiệm vụ suy luận/ });
  await expect(missionHeading).toBeVisible();

  // No Later button and no back button before the mission starts.
  await expect(page.getByRole('button', { name: 'Để sau' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Về trò chơi/ })).toHaveCount(0);

  // Escape does not dismiss the offer either.
  await page.keyboard.press('Escape');
  await expect(missionHeading).toBeVisible();

  // Starting the mission is the only way forward.
  await page.getByRole('button', { name: 'Bắt đầu nhiệm vụ' }).click();
  await expect(page.getByRole('button', { name: /Tạm dừng/ })).toBeVisible();
  await expect(missionHeading).toBeVisible();
});
