import { test, expect } from '@playwright/test';
test('create, edit, save, reopen, publish, play, unpublish and delete account', async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByLabel('Your name').fill('Browser Creator');
  await page.getByLabel('Email address').fill(`browser-${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: false }).fill('browser-long-password');
  await page.getByLabel('Invitation code').fill('browser-test-invitation-code-only');
  await page.getByRole('button', { name: 'Create your account' }).click();
  await expect(page.locator('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Game settings', exact: true }).click();
  await page.getByLabel('Game title').fill('A browser-tested adventure');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('All changes saved')).toHaveCount(1);
  await page.reload();
  await expect(page.getByText('All changes saved')).toHaveCount(1);
  await page.getByRole('button', { name: 'Publish game', exact: true }).click();
  await page.getByRole('button', { name: 'Publish this adventure' }).click();
  const publicUrl = await page
    .getByRole('link', { name: 'Open published game' })
    .getAttribute('href');
  const visitor = await browser.newContext();
  const publicPage = await visitor.newPage();
  await publicPage.goto(`http://127.0.0.1:4173${publicUrl}`);
  await publicPage.getByRole('button', { name: 'Let’s go' }).click();
  await expect(publicPage.frameLocator('iframe').locator('canvas')).toBeVisible();
  await publicPage.keyboard.press('ArrowRight');
  await page.getByRole('button', { name: 'Unpublish game' }).click();
  await publicPage.reload();
  await expect(publicPage.getByText('This game is not published')).toBeVisible();
  await visitor.close();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'My games', exact: true }).click();
  await page.getByRole('button', { name: 'Account settings' }).click();
  await page.getByLabel('Current password', { exact: true }).fill('browser-long-password');
  await page.getByLabel('New password', { exact: true }).fill('changed-browser-password');
  await page.getByRole('button', { name: 'Change password', exact: true }).click();
  await expect(page.getByLabel('New password', { exact: true })).toHaveValue('');
  await page.getByLabel('Confirm password to delete account').fill('changed-browser-password');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete account permanently' }).click();
  await expect(page.locator('dialog')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('guided builder preserves movement settings and walks through each step', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('STEP 1 OF 7')).toBeVisible();
  await page.getByLabel('Game title').fill('My new world');
  await page.getByRole('button', { name: 'Fast', exact: true }).click();
  await page.getByLabel('Extra jumps in the air').selectOption('1');
  for (let step = 2; step <= 7; step++) {
    await page.getByRole('button', { name: 'Next step', exact: false }).click();
    await expect(page.getByText(`STEP ${step} OF 7`)).toBeVisible();
  }
  await expect(page.getByText('Ready for your first player?')).toBeVisible();
  await page.getByRole('button', { name: 'Game settings', exact: true }).click();
  await expect(page.getByLabel('Movement speed')).toHaveValue('380');
  await expect(page.getByLabel('Extra jumps in the air')).toHaveValue('1');
  await page.reload();
  await expect(page.getByLabel('Game title')).toHaveValue('My new world');
});

test('templates create independent projects and viewport updates keep runtime alive', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'New experience', exact: true }).click();
  await page.getByRole('button', { name: /Story journey/ }).click();
  await expect(page.getByLabel('Game title')).toHaveValue('Story journey');
  await expect(page.frameLocator('iframe').locator('canvas')).toBeVisible();
  const runtime = page.frames().find((f) => f.url().endsWith('/engine/index.html'))!;
  const marker = await runtime.evaluate(() => performance.timeOrigin);
  await page.getByRole('button', { name: 'Toggle grid' }).click();
  await expect.poll(() => runtime.evaluate(() => (window as any).gameConfig.grid)).toBe(true);
  expect(await runtime.evaluate(() => performance.timeOrigin)).toBe(marker);
  await page.getByLabel('Game title').fill('Independent world');
  await page.getByRole('button', { name: 'New experience', exact: true }).click();
  await page.getByRole('button', { name: /Arcade challenge/ }).click();
  await page.getByRole('button', { name: 'Continue without saving' }).click();
  await expect(page.getByLabel('Game title')).toHaveValue('Arcade challenge');
  await page
    .getByRole('button', { name: 'Undo', exact: true })
    .isDisabled()
    .then((v) => expect(v).toBe(true));
  await page.getByRole('button', { name: 'Playtest your game' }).click();
  await page.getByRole('button', { name: 'Let’s go' }).click();
  const playable = page.locator('dialog').frameLocator('iframe');
  await expect(playable.locator('canvas')).toBeVisible();
  await expect(playable.locator('.hud-label')).toHaveText('Arcade challenge');
  await page.screenshot({ path: 'test-results/game-gift-playtest.png' });
  expect(errors).toEqual([]);
});

test('workspace fits the screen and retains a visible live preview', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.frameLocator('iframe').locator('canvas')).toBeVisible();
  await page.screenshot({
    path: `test-results/game-gift-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  if (testInfo.project.name === 'desktop') {
    const editor = await page.locator('.editor-panel').boundingBox();
    const preview = await page.locator('.preview-column').boundingBox();
    expect(preview!.x).toBeGreaterThan(editor!.x + editor!.width);
  }
});

test('a creator-authored story can be completed using real game controls', async ({ page }) => {
  const { createStarter } = await import('../../shared/template');
  const game = createStarter('story');
  game.levels = [{ ...game.levels[0], width: 1200, platforms: [] }];
  game.physics.speed = 500;
  await page.addInitScript(
    (value) => localStorage.setItem('game-gift-draft-v2', JSON.stringify(value)),
    game,
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Playtest your game' }).click();
  await page.getByRole('button', { name: 'Let’s go' }).click();
  const right = page.locator('dialog').getByRole('button', { name: 'ArrowRight', exact: true });
  await right.dispatchEvent('pointerdown', { pointerId: 1 });
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible({
    timeout: 10000,
  });
  await right.dispatchEvent('pointerup', { pointerId: 1 });
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByText(game.story.ending, { exact: true })).toBeVisible();
});
