import { expect, test } from '@playwright/test';

test.describe('Navbar pública', () => {
  // US-5901 técnica: valida que la navegación pública principal siga operativa tras tokenizar la paleta.
  test('abre y cierra menú móvil y mantiene CTA visible', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await expect(page.getByRole('banner')).toBeVisible();
    const mainNav = page.getByRole('navigation', { name: /Navegación principal/i });
    await expect(mainNav).not.toHaveClass(/is-open/);

    const hamburger = page.getByRole('button', { name: /Abrir menú de navegación/i });
    await hamburger.click();

    await expect(mainNav).toHaveClass(/is-open/);
    await expect(mainNav.getByRole('link', { name: /Solicitar acceso/i })).toBeVisible();

    await hamburger.click();
    await expect(mainNav).not.toHaveClass(/is-open/);
  });
});
