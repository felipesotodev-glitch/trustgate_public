import { expect, test } from '@playwright/test';

test.describe('Docs pública', () => {
  // US-6201 técnica: valida que la página de documentación principal siga operativa tras tokenización de warnings y badges HTTP.
  test('renderiza cabecera, bloque de autenticación y tabla de endpoints', async ({ page }) => {
    await page.goto('/docs');

    await expect(page.getByRole('heading', { name: /TrustGate Public API/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Autenticación/i })).toBeVisible();
    await expect(page.getByText(/No expongas tu/i)).toBeVisible();

    await expect(page.getByRole('heading', { name: /Endpoints/i })).toBeVisible();
    await expect(page.getByText('GET', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('POST', { exact: true }).first()).toBeVisible();
  });
});
