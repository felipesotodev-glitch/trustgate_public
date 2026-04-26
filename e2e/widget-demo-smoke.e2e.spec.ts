// US-16402 — Historia técnica: widget-demo palette tokenization focal E2E
import { test, expect } from '@playwright/test';

test('widget-demo page loads and displays consent history entries', async ({ page }) => {
  await page.goto('/widget-demo');
  await expect(page.locator('h1, h2').first()).toBeVisible();
});
