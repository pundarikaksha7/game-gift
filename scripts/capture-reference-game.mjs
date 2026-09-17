import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const referenceURL =
  process.env.GAMEGIFT_REFERENCE_URL || 'https://pundarikaksha7.github.io/gf-game/';
const outputDir = new URL('../public/screenshots/', import.meta.url);
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
});

await page.goto(referenceURL, { waitUntil: 'networkidle' });
const game = page.locator('#game-world');
await game.waitFor({ state: 'visible' });
await game.click({ position: { x: 640, y: 360 } });

const still = await game.screenshot({ type: 'png' });
await sharp(still)
  .resize({ width: 1280, withoutEnlargement: true })
  .webp({ quality: 88 })
  .toFile(fileURLToPath(new URL('gameplay-preview.webp', outputDir)));

const frames = [];
await page.keyboard.down('ArrowRight');
for (let index = 0; index < 20; index++) {
  if (index === 6 || index === 15) await page.keyboard.press('Space');
  if (index === 12) await page.keyboard.press('KeyJ');
  await page.waitForTimeout(100);
  frames.push(await game.screenshot({ type: 'png' }));
}
await page.keyboard.up('ArrowRight');

const gifFrames = await Promise.all(
  frames.map((input) =>
    sharp(input).resize({ width: 480 }).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
  ),
);
const { width, height, channels } = gifFrames[0].info;
await sharp(Buffer.concat(gifFrames.map((frame) => frame.data)), {
  raw: { width, height: height * gifFrames.length, channels, pageHeight: height },
})
  .gif({
    delay: Array(gifFrames.length).fill(100),
    loop: 0,
    colours: 80,
    effort: 10,
    dither: 0.5,
    interFrameMaxError: 8,
  })
  .toFile(fileURLToPath(new URL('gameplay-preview.gif', outputDir)));

await browser.close();
