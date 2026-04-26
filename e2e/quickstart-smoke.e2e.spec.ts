// US-16601 — Historia técnica: quickstart palette tokenization focal E2E
import { test, expect } from '@playwright/test';

test('quickstart page loads', async ({ page }) => {
  await page.goto('/quickstart');
  await expect(page.locator('h1, h2').first()).toBeVisible();
});
