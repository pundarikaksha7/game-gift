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
  await expect(publicPage.locator('canvas')).toBeVisible();
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
