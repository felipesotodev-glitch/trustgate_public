// US-16501 — Historia técnica: simple-widget-demo palette tokenization focal E2E
import { test, expect } from '@playwright/test';

test('simple-widget-demo page loads', async ({ page }) => {
  await page.goto('/simple-widget-demo');
  await expect(page.locator('h1, h2').first()).toBeVisible();
});
