import { readFile } from 'node:fs/promises';

import { expect, test } from './fixtures';

test.describe('backup', () => {
  test('exports everything to a file and restores it after erasing the device', async ({
    page,
  }) => {
    // Make some data worth backing up.
    await page.goto('/#/settings');
    await page.getByLabel('Age').fill('44');
    await page.getByLabel('Age').press('Enter');
    await page.goto('/#/body');
    await page.getByRole('button', { name: 'Log' }).click();
    await page.getByLabel('Weight, kg').fill('81.2');
    await page.getByLabel('Waist, cm').fill('86');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('region', { name: 'Weight' })).toContainText('81.2');

    // Export.
    await page.goto('/#/settings');
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save a backup file' }).click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe('homebody-backup-2026-10-14.json');
    const path = await download.path();
    const backup = JSON.parse(await readFile(path, 'utf8')) as {
      app: string;
      state: { profile: { age: number } };
    };
    expect(backup.app).toBe('homebody');
    expect(backup.state.profile.age).toBe(44);

    // Erase everything.
    await page.getByRole('button', { name: 'Erase all data' }).click();
    await page.getByRole('button', { name: 'Yes, erase everything' }).click();
    await expect(page.getByLabel('Age')).toHaveValue('30');

    // Import, with a preview before anything is replaced.
    await page.getByLabel('Load from a file').setInputFiles(path);
    const preview = page.getByRole('alert').filter({ hasText: 'Restore the backup' });
    await expect(preview).toContainText('1 measurement');
    await preview.getByRole('button', { name: 'Yes, restore' }).click();
    await expect(page.getByText('Your data was restored.')).toBeVisible();
    await expect(page.getByLabel('Age')).toHaveValue('44');

    await page.goto('/#/body');
    await expect(page.getByRole('region', { name: 'Weight' })).toContainText('81.2');
  });

  test('refuses a file that is not a backup', async ({ page }) => {
    await page.goto('/#/settings');
    await page.getByLabel('Load from a file').setInputFiles({
      name: 'notes.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"hello":"world"}'),
    });
    await expect(page.getByRole('alert')).toContainText('This is not a Homebody backup file.');
  });
});
