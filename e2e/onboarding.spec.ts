import { expect, reloadLater, test } from './fixtures';

test.describe('first launch', () => {
  test('shows a labelled sample plan and switches to the user’s own data', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('This is a sample plan.')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Full body A' })).toBeVisible();

    await page.getByRole('link', { name: 'Enter my details' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();

    await page.getByLabel('Current weight, kg').fill('72.5');
    await page.getByLabel('Current weight, kg').press('Enter');
    await page.getByRole('radio', { name: /Beginner/ }).check({ force: true });
    await page.getByRole('checkbox', { name: 'Kettlebell' }).check({ force: true });
    await expect(page.getByText(/Added: kettlebell\./)).toBeVisible();

    await page.getByRole('link', { name: 'Plan', exact: true }).click();
    await expect(page.getByText('This is a sample plan.')).toBeHidden();

    // Everything is stored on the device and survives a reload.
    await reloadLater(page);
    await expect(page.getByText('This is a sample plan.')).toBeHidden();
    await page.getByRole('link', { name: 'Open settings' }).click();
    await expect(page.getByLabel('Current weight, kg')).toHaveValue('72.5');
    await expect(page.getByRole('checkbox', { name: 'Kettlebell' })).toBeChecked();
  });

  test('remembers the language and the theme', async ({ page }) => {
    await page.goto('/#/settings');
    await page.getByRole('radio', { name: 'Русский' }).check({ force: true });
    await expect(page.getByRole('heading', { level: 1, name: 'Настройки' })).toBeVisible();
    await page.getByRole('radio', { name: 'Тёмная' }).check({ force: true });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await reloadLater(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Настройки' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('every section is reachable from the navigation', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Sections' });
    for (const [link, heading] of [
      ['Progress', 'Progress'],
      ['Exercises', 'Exercises'],
      ['Body', 'Body'],
    ] as const) {
      await nav.getByRole('link', { name: link, exact: true }).click();
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    }
    await nav.getByRole('link', { name: 'Plan', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Full body A' })).toBeVisible();
  });
});
