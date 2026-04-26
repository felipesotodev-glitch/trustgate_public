import { expect, test } from '@playwright/test';

test.describe('Home pública', () => {
  // US-6102 técnica: valida que el hero y el CTA final sigan visibles tras la tokenización de paleta.
  test('renderiza hero y CTA principal con acciones visibles', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /Cumplimiento Ley 21.719/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Ver documentación/i })).toBeVisible();

    await expect(page.getByRole('heading', { name: /¿Listo para integrar\?/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Solicitar acceso/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Ver Quickstart/i })).toBeVisible();
  });
});
