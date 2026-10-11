import { type Page, test as base } from '@playwright/test';

/**
 * Wednesday 14 October 2026. On a first launch the sample plan then starts on
 * Monday 19 October, which keeps dates in the tests stable.
 */
export const TODAY = new Date('2026-10-14T10:00:00');

/** Every test starts on a fixed date with empty storage (each test has its own context). */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.clock.setFixedTime(TODAY);
    await use(page);
  },
});

/**
 * Reloads the page the way a person would: not within the same instant as
 * their last tap. Writes to IndexedDB are asynchronous and take a moment to
 * commit, so a reload fired by a script right after a click can outrun them.
 */
export async function reloadLater(page: Page): Promise<void> {
  await page.waitForTimeout(600);
  await page.reload();
}

export { expect } from '@playwright/test';
