import { test, expect } from '@playwright/test';

test('adding a ball works with a save that has no magnets field', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/main.html');
  await page.waitForFunction(() => typeof loading !== 'undefined' && !loading);

  await page.evaluate(() => new Promise((resolve, reject) => {
    const transaction = db.transaction('saves', 'readwrite');
    transaction.objectStore('saves').put({
      lines: [],
      fans: [],
      valves: [],
      tcans: [],
      polys: [],
    }, 1);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  }));

  await page.reload();
  await page.waitForFunction(() => typeof loading !== 'undefined' && !loading);
  pageErrors.length = 0;
  await page.locator('#addballbtn').evaluate((button) => button.click());
  await page.waitForTimeout(200);

  expect(pageErrors).toEqual([]);
});