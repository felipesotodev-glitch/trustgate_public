import { expect, test } from '@playwright/test';

test.describe('API Demo pública', () => {
  // US-6302 técnica: valida que la vista principal de API demo permanezca operativa tras tokenizar estados visuales.
  test('renderiza secciones clave de credenciales, snippet y respuesta', async ({ page }) => {
    await page.goto('/api-demo');

    await expect(page.getByRole('heading', { name: /Demo API REST pública/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Credenciales/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Snippet listo para integrar/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Respuesta/i })).toBeVisible();

    await expect(page.getByRole('button', { name: /Ejecutar solicitud/i })).toBeVisible();
  });
});
