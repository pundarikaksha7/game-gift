import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const baseURL = process.env.GAMEGIFT_PREVIEW_URL || 'http://127.0.0.1:4173';
const outputDir = new URL('../public/screenshots/', import.meta.url);
await mkdir(outputDir, { recursive: true });

const previews = [
  { name: 'world-explorer', template: null },
  { name: 'story-journey', template: 'Story journey' },
  { name: 'arcade-challenge', template: 'Arcade challenge' },
];

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 1100 },
  deviceScaleFactor: 1,
});

await page.goto(`${baseURL}/studio`, { waitUntil: 'networkidle' });

for (const preview of previews) {
  if (preview.template) {
    await page.getByRole('button', { name: 'New experience', exact: true }).click();
    await page.getByRole('button', { name: new RegExp(preview.template) }).click();
    const continueButton = page.getByRole('button', { name: 'Continue without saving' });
    if (await continueButton.isVisible()) await continueButton.click();
  }

  const frame = page.locator('.preview-column iframe');
  await frame.waitFor({ state: 'visible' });
  await page.waitForTimeout(500);

  const png = await frame.screenshot({ type: 'png' });
  await sharp(png)
    .resize({ width: 1280, withoutEnlargement: true })
    .webp({ quality: 88 })
    .toFile(fileURLToPath(new URL(`${preview.name}.webp`, outputDir)));

  if (preview.name === 'world-explorer') {
    await page.getByRole('button', { name: 'Playtest your game', exact: true }).click();
    const playtestFrame = page.locator('dialog iframe');
    const playtest = page.locator('dialog').frameLocator('iframe');
    await playtest.getByRole('button', { name: 'Begin chapter' }).click();
    const canvas = playtest.locator('canvas');
    const gameBody = playtest.locator('body');
    const frames = [];

    await canvas.click();
    await gameBody.evaluate(() =>
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', code: 'ArrowRight', bubbles: true }),
      ),
    );
    for (let index = 0; index < 14; index++) {
      if (index === 5) {
        await gameBody.evaluate(() => {
          window.dispatchEvent(
            new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }),
          );
          window.dispatchEvent(
            new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true }),
          );
        });
      }
      await page.waitForTimeout(90);
      frames.push(await playtestFrame.screenshot({ type: 'png' }));
    }
    await gameBody.evaluate(() =>
      window.dispatchEvent(
        new KeyboardEvent('keyup', { key: 'ArrowRight', code: 'ArrowRight', bubbles: true }),
      ),
    );

    const loopFrames = [...frames, ...frames.slice(1, -1).reverse()];
    const gifFrames = await Promise.all(
      loopFrames.map((input) =>
        sharp(input)
          .resize({ width: 520 })
          .removeAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true }),
      ),
    );
    const { width, height, channels } = gifFrames[0].info;
    await sharp(Buffer.concat(gifFrames.map((frame) => frame.data)), {
      raw: { width, height: height * gifFrames.length, channels, pageHeight: height },
    })
      .gif({
        delay: Array(gifFrames.length).fill(90),
        loop: 0,
        colours: 96,
        effort: 7,
        dither: 0.7,
      })
      .toFile(fileURLToPath(new URL('gameplay-preview.gif', outputDir)));

    await page.getByRole('button', { name: 'Close dialog' }).click();
  }
}

await browser.close();
