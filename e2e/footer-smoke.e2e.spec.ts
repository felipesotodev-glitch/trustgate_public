import { expect, test } from '@playwright/test';

test.describe('Footer público', () => {
  // US-6002 técnica: valida que el footer siga visible y navegable tras la tokenización dark del componente.
  test('muestra bloques legales y enlaces clave en home', async ({ page }) => {
    await page.goto('/');

    const footer = page.getByRole('contentinfo');
    await expect(footer).toBeVisible();

    await expect(footer.getByText('Ley 21.719 (Chile)', { exact: true })).toBeVisible();
    await expect(footer.getByText('Normativa CMF', { exact: true })).toBeVisible();
    await expect(footer.getByText('Derechos ARCO-P', { exact: true })).toBeVisible();

    await expect(footer.getByRole('link', { name: /Documentación/i })).toBeVisible();
    await expect(footer.getByRole('link', { name: /Contacto/i })).toBeVisible();
  });
});
