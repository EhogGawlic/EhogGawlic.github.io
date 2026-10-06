const { test, expect } = require('@playwright/test');

test('should run canvas app without browser errors', async ({ page }) => {
  const errors = [];

  // 1. Listen for unhandled runtime exceptions
  page.on('pageerror', (exception) => {
    errors.push(exception.message);
  });

  // 2. (Optional) Listen for regular console.error calls
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`Console Error: ${msg.text()}`);
    }
  });

  // Navigate and perform your test steps
  await page.goto('/index.html');

  const canvas = page.locator('canvas');
  await canvas.click({ position: { x: 100, y: 100 } });

  // 3. Assert that no errors were thrown during the entire sequence
  expect(errors).toEqual([]);
});

