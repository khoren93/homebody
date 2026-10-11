import { expect, test } from './fixtures';

test.describe('replacing exercises', () => {
  test('a manual replacement applies to every session of the template', async ({ page }) => {
    await page.goto('/#/session/2026-10-19');
    const squat = page.getByRole('article', { name: 'Dumbbell Goblet Squat' });
    await squat.getByText('Technique and replacement').click();
    await squat
      .getByRole('group', { name: 'Replace in this template' })
      .getByRole('button', { name: 'Dumbbell Squat', exact: true })
      .click();
    await expect(page.getByRole('article', { name: 'Dumbbell Squat', exact: true })).toBeVisible();

    // The same template a week later uses the replacement too.
    await page.goto('/#/session/2026-10-26');
    await expect(page.getByRole('article', { name: 'Dumbbell Squat', exact: true })).toBeVisible();
    await expect(page.getByRole('article', { name: 'Dumbbell Goblet Squat' })).toHaveCount(0);
  });

  test('a random swap can be undone', async ({ page }) => {
    await page.goto('/#/session/2026-10-19');
    const first = page.getByRole('article').first();
    await expect(first).toContainText('Dumbbell Goblet Squat');
    await first.getByRole('button', { name: /Swap for another exercise/ }).click();

    await expect(first).not.toContainText('Dumbbell Goblet Squat · ');
    const note = first.getByRole('status');
    await expect(note).toContainText('Replaced “Dumbbell Goblet Squat”');
    await note.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByRole('article', { name: 'Dumbbell Goblet Squat' })).toBeVisible();
  });

  test('an excluded exercise leaves the plan and can be restored', async ({ page }) => {
    await page.goto('/#/session/2026-10-19');
    const plank = page.getByRole('article', { name: 'Plank', exact: true });
    await plank.getByText('Technique and replacement').click();
    await plank.getByRole('button', { name: 'Remove from all workouts' }).click();
    await expect(plank).toHaveCount(0);

    await page.goto('/#/settings');
    await page.getByRole('button', { name: 'Restore Plank' }).click();
    await page.goto('/#/session/2026-10-19');
    await expect(page.getByRole('article', { name: 'Plank', exact: true })).toBeVisible();
  });
});
