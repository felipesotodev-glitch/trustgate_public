// US-16701 — Historia técnica: consent-authorization palette tokenization focal E2E
import { test, expect } from '@playwright/test';

test('consent-authorization page loads', async ({ page }) => {
  await page.goto('/consent-authorization');
  await expect(page.locator('h1, h2').first()).toBeVisible();
});
