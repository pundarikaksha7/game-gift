import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

test('landing page enters the live studio', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /Build a game from your memories/ }),
  ).toBeVisible();
  const mediaStyles = await page
    .locator('.preview-media img, .feature-media img')
    .evaluateAll((images) =>
      images.map((image) => ({
        fit: getComputedStyle(image).objectFit,
        position: getComputedStyle(image).position,
      })),
    );
  expect(
    mediaStyles.every(({ fit, position }) => fit === 'contain' && position === 'absolute'),
  ).toBe(true);
  await page.getByRole('link', { name: /Make a game gift/ }).click();
  await expect(page).toHaveURL(/\/studio$/);
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
});

test('create, edit, save, reopen, publish, play, unpublish and delete account', async ({
  page,
  browser,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const token = `browser-${testInfo.project.name}-token`;
  await page.route('**/api/**', (route) =>
    route.continue({
      headers: { ...route.request().headers(), authorization: `Bearer ${token}` },
    }),
  );
  const sessionReady = page.waitForResponse((response) => response.url().endsWith('/api/auth/me'));
  await page.goto('/studio');
  expect((await sessionReady).ok()).toBe(true);
  await expect(page.locator('.save-status')).toContainText('Not saved yet');
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
  const publicGame = publicPage.frameLocator('iframe');
  await expect(publicGame.locator('canvas')).toBeVisible();
  await publicGame.getByRole('button', { name: 'Begin chapter' }).click();
  await publicPage.keyboard.press('ArrowRight');
  const unpublished = page.waitForResponse(
    (response) => response.request().method() === 'DELETE' && response.url().includes('/publish'),
  );
  await page.getByRole('button', { name: 'Unpublish game' }).click();
  expect((await unpublished).ok()).toBe(true);
  await publicPage.reload();
  await expect(publicPage.getByText('This game is not published')).toBeVisible();
  await visitor.close();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'My games', exact: true }).click();
  await page.getByRole('button', { name: 'Account settings' }).click();
  await expect(
    page.getByText('Authentication is managed securely by your Google account.'),
  ).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete account permanently' }).click();
  await expect(page.locator('dialog')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('guided builder preserves movement settings and walks through each step', async ({ page }) => {
  await page.goto('/studio');
  await expect(page.getByText('STEP 1 OF 7')).toBeVisible();
  await page.getByLabel('Game title').fill('My new world');
  await page.getByRole('button', { name: /^Fast/ }).click();
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

test('custom UI assets save and export inside a portable game bundle', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop',
    'The upload/export pipeline only needs one browser',
  );
  // The desktop lifecycle test intentionally deletes its own fixture account earlier in the file.
  const token = 'browser-mobile-token';
  await page.route('**/api/**', (route) =>
    route.continue({
      headers: { ...route.request().headers(), authorization: `Bearer ${token}` },
    }),
  );
  await page.goto('/studio');
  await page.getByRole('button', { name: /^Levels/ }).click();
  await page.getByLabel('Upload background').setInputFiles({
    name: 'custom-background.png',
    mimeType: 'image/png',
    buffer: await sharp({
      create: { width: 16, height: 9, channels: 4, background: '#779966' },
    })
      .png()
      .toBuffer(),
  });
  await expect(page.getByRole('button', { name: 'Use atmosphere background' })).toBeVisible();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('All changes saved')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export game data' }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).not.toBeNull();
  const bundle = JSON.parse(await readFile(path!, 'utf8'));
  expect(bundle.format).toBe('gamegift-bundle-v1');
  const background = bundle.game.levels[0].background;
  expect(background).toMatch(/^\/api\/assets\//);
  expect(bundle.assets[background].mime).toBe('image/webp');
  expect(Buffer.from(bundle.assets[background].data, 'base64').length).toBeGreaterThan(0);
});

test('templates create independent projects and viewport updates keep runtime alive', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/studio');
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
  const playable = page.locator('dialog').frameLocator('iframe');
  await expect(playable.locator('canvas')).toBeVisible();
  await playable.getByRole('button', { name: 'Begin chapter' }).click();
  await expect(playable.locator('.hud-label')).toHaveText('Arcade challenge');
  await page.screenshot({ path: 'test-results/game-gift-playtest.png' });
  expect(errors).toEqual([]);
});

test('workspace fits the screen and retains a visible live preview', async ({ page }, testInfo) => {
  await page.goto('/studio');
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
  await page.goto('/studio');
  await page.getByRole('button', { name: 'Playtest your game' }).click();
  const playable = page.locator('dialog').frameLocator('iframe');
  await playable.getByRole('button', { name: 'Begin chapter' }).click();
  const right = page.locator('dialog').getByRole('button', { name: 'ArrowRight', exact: true });
  await right.dispatchEvent('pointerdown', { pointerId: 1 });
  await expect(playable.getByRole('button', { name: 'Finish adventure' })).toBeVisible({
    timeout: 10000,
  });
  await right.dispatchEvent('pointerup', { pointerId: 1 });
  await expect(playable.locator('.story-scene-copy')).toContainText(game.story.ending);
  await playable.getByRole('button', { name: 'Finish adventure' }).click();
  await expect(playable.getByRole('dialog', { name: 'Experience complete' })).toBeVisible();
});
