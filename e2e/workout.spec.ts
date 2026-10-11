import { expect, reloadLater, test } from './fixtures';

test.describe('workout', () => {
  test('tracks sets with a rest timer, rates an exercise and finishes the session', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Start workout' }).click();
    await expect(page.getByText('Set 1 of 17')).toBeVisible();

    const squat = page.getByRole('article', { name: 'Dumbbell Goblet Squat' });
    await expect(squat).toContainText('3 × 12');
    await expect(squat).toContainText('24 kg');

    await squat.getByRole('button', { name: 'Set 1, current' }).click();
    const timer = page.getByRole('timer', { name: 'Rest timer' });
    await expect(timer).toContainText('Rest · set 2 of 3 next');
    await timer.getByRole('button', { name: '15 seconds more' }).click();
    await expect(timer).toContainText('2:00');
    await timer.getByRole('button', { name: 'Skip' }).click();
    await expect(timer).toBeHidden();
    await expect(page.getByText('Set 2 of 17')).toBeVisible();

    await squat.getByRole('button', { name: 'Easy' }).click();
    await expect(squat).toContainText('Next time, Mon, Oct 26');

    // Editing the load re-anchors the calculation.
    await squat.getByLabel('Weight, kg').selectOption('20');
    await expect(squat).toContainText('edited by you');

    await page.getByRole('button', { name: 'Mark as done' }).click();
    await expect(page.getByRole('button', { name: 'Marked as done' })).toBeVisible();

    await page.getByRole('link', { name: 'Back to the plan' }).click();
    await expect(page.getByRole('region', { name: /Block 1/ })).toContainText('1 / 12 done');
    await expect(page.getByRole('heading', { level: 1, name: 'Full body B' })).toBeVisible();

    // The result is in the history after a reload.
    await reloadLater(page);
    await page.getByRole('link', { name: 'Progress', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Dumbbell Goblet Squat' })).toContainText(
      'Sessions: 1',
    );
  });

  test('offers to move a missed session to today', async ({ page }) => {
    // The sample plan follows the calendar until the user makes it their own.
    await page.goto('/#/settings');
    await page.getByLabel('Age').fill('35');
    await page.getByLabel('Age').press('Enter');
    await page.getByRole('link', { name: 'Plan', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Full body A' })).toBeVisible();

    // Come back three days after the first session was due.
    await page.clock.setFixedTime(new Date('2026-10-22T10:00:00'));
    await reloadLater(page);
    const banner = page.getByRole('status').filter({ hasText: 'You missed' });
    await expect(banner).toContainText('Full body A');
    await banner.getByRole('button', { name: 'Do it today' }).click();

    await expect(page.getByText('Set 1 of 17')).toBeVisible();
    await page.getByRole('link', { name: 'Back to the plan' }).click();
    await expect(page.getByRole('region', { name: 'Full body A' })).toContainText('Today');
  });
});
