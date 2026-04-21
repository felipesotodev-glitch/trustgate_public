/**
 * E2E — Flujo completo de autorización pública de consentimiento
 *
 * Flujo cubierto:
 * 1. Crea un titular via API interna
 * 2. Obtiene authorizationUrl via endpoint de prueba
 * 3. Navega al sitio público /autorizacion/{token}
 * 4. Selecciona canales disponibles, acepta texto legal y confirma
 * 5. Verifica que el backend registró la autorización
 *
 * Test 1 (flujo completo): usa authorizationUrl del API response.
 *   - Si E2E_MAILHOG_URL está configurado y el backend apunta a MailHog,
 *     se puede habilitar la verificación de email.
 *
 * Prerrequisitos:
 *   - Backend corriendo en E2E_API_BASE_URL (default http://127.0.0.1:8180/api/v1)
 *   - Portal público corriendo en PLAYWRIGHT_BASE_URL (default http://localhost:4300)
 */
import { expect, request as playwrightRequest, test } from '@playwright/test';

const API_BASE = process.env['E2E_API_BASE_URL'] ?? 'http://127.0.0.1:8180/api/v1';
const API_HEADERS = {
  'x-api-key': process.env['E2E_API_KEY'] ?? 'poc-dev-key-change-in-production',
  'x-user-role': 'operations_analyst',
  'Content-Type': 'application/json'
};

/**
 * Extrae el path /autorizacion/{token} del cuerpo del email.
 * El token puede ser un hex hash de 64 chars o un UUID de 36 chars.
 */
function extractAuthorizationPath(emailBody: string): string {
  const match = emailBody.match(/\/autorizacion\/([a-f0-9-]{32,})/i);
  if (!match) {
    throw new Error(
      `No se encontró enlace /autorizacion/{token} en el email.\nBody:\n${emailBody.slice(0, 500)}`
    );
  }
  return `/autorizacion/${match[1]}`;
}

/** Extrae el path /autorizacion/{token} de una URL completa. */
function pathFromUrl(authorizationUrl: string): string {
  const url = new URL(authorizationUrl);
  return url.pathname;
}

test.describe('Autorización pública de consentimiento', () => {
  let idTitular: string;
  let testEmail: string;

  test.beforeEach(async () => {
    const timestamp = Date.now();
    testEmail = `e2e.public.${timestamp}@trustgate-test.cl`;

    const apiContext = await playwrightRequest.newContext();

    const res = await apiContext.post(`${API_BASE}/titulares`, {
      headers: API_HEADERS,
      data: {
        nombreCompleto: `E2E Titular Público ${timestamp}`,
        email: testEmail,
        telefono: '+56999000001',
        rut: `E2E-PUB-${timestamp}`,
        industria: 'financiera',
        region: 'Metropolitana'
      }
    });

    expect(res.status(), 'Debería crear el titular').toBe(201);
    const titular = await res.json();
    idTitular = titular.idTitular;

    // Crear verificación de identidad aprobada para cumplir requisito de finalidades sensibles.
    // Método "biometric" con scores por defecto da consolidatedScore ~0.92 > threshold 0.85 → "approved".
    const verifyRes = await apiContext.post(
      `${API_BASE}/identity/titulares/${idTitular}/verify`,
      {
        headers: API_HEADERS,
        data: { method: 'biometric' }
      }
    );
    expect(verifyRes.status(), 'La verificación de identidad debe quedar aprobada').toBe(201);

    await apiContext.dispose();
  });

  test('flujo completo de autorización desde enlace privado', async ({
    page,
    request
  }) => {
    // 1 — Disparar envío de prueba (no requiere consentimiento previo)
    const sendRes = await request.post(
      `${API_BASE}/sending/titulares/${idTitular}/consent-authorization/test`,
      {
        headers: API_HEADERS,
        data: {
          testEmail,
          channel: 'email',
          requestedArtifact: 'consent',
          reviewAction: 'grant'
        }
      }
    );
    expect(sendRes.status(), 'El endpoint de envío debería responder 200').toBe(200);

    const sendData = await sendRes.json();
    expect(sendData, 'La respuesta debe incluir authorizationUrl').toHaveProperty('authorizationUrl');

    // 2 — Navegar directamente usando authorizationUrl del API response
    const authPath = pathFromUrl(sendData.authorizationUrl as string);
    await page.goto(authPath);

    // 4 — Verificar que cargó la vista de autorización
    await expect(
      page.getByRole('heading', { name: /Autoriza tus canales de contacto/i })
    ).toBeVisible();

    // Esperar a que desaparezca el estado de carga
    await expect(page.getByText(/Cargando solicitud privada/i)).not.toBeVisible({
      timeout: 15_000
    });

    // 5 — Seleccionar todos los canales disponibles (no activos)
    const checkboxes = page.locator('input[type="checkbox"]:not([disabled])').filter({
      hasNot: page.locator('[name="acceptedNotice"]')
    });
    const count = await checkboxes.count();
    // Si hay canales disponibles, seleccionarlos todos
    for (let i = 0; i < count; i++) {
      const cb = checkboxes.nth(i);
      if (!(await cb.isChecked())) {
        await cb.check();
      }
    }

    // 6 — Aceptar el aviso legal
    await page.getByRole('checkbox', { name: /Confirmo que revisé/i }).check();

    // 7 — Confirmar autorización
    await page.getByRole('button', { name: /Autorizar canales seleccionados/i }).click();

    // 8 — Verificar resultado exitoso
    await expect(
      page.getByRole('heading', { name: /Autorización registrada/i })
    ).toBeVisible({ timeout: 20_000 });

    await expect(
      page.getByText(/La aceptación quedó almacenada/i)
    ).toBeVisible();
  });

  test('token inválido muestra mensaje de error controlado', async ({ page }) => {
    await page.goto('/autorizacion/00000000-0000-0000-0000-000000000000');

    await expect(
      page.getByRole('heading', { name: /No fue posible abrir la solicitud/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test('token expirado o ya usado muestra estado de error controlado', async ({
    page,
    request
  }) => {
    // Permite hasta 3 minutos: el backend envía emails via SendGrid síncronamente
    // (uno por canal autorizado) y puede hacer rate-limit en la tercera llamada consecutiva.
    test.setTimeout(180_000);

    // 1 — Obtener authorizationUrl
    const sendRes = await request.post(
      `${API_BASE}/sending/titulares/${idTitular}/consent-authorization/test`,
      {
        headers: API_HEADERS,
        data: {
          testEmail,
          channel: 'email',
          requestedArtifact: 'consent',
          reviewAction: 'grant'
        }
      }
    );
    expect(sendRes.status()).toBe(200);
    const sendData = await sendRes.json();
    const tokenUrl = new URL(sendData.authorizationUrl as string);
    const token = tokenUrl.pathname.split('/').pop()!;

    // 2 — Consultar los purposes disponibles para construir el cuerpo de complete
    const infoRes = await request.get(
      `http://127.0.0.1:8180/api/v1/public/consent/authorization/${token}`
    );
    expect(infoRes.status()).toBe(200);
    const info = await infoRes.json();
    const purposes = (info.purposes as Array<{ id: number; canales: Array<{ id: number; active: boolean }> }>)
      .map((p) => ({
        idFinalidad: p.id,
        idCanales: p.canales.filter((c) => !c.active).map((c) => c.id)
      }))
      .filter((p) => p.idCanales.length > 0);

    // Requiere al menos un canal para autorizar; si todos están activos, el test no aplica.
    expect(purposes.length, 'Debe haber al menos un canal disponible para autorizar').toBeGreaterThan(0);

    // 3 — Completar la autorización via API directa (evita la espera del browser durante el envío de emails)
    const now = new Date().toISOString();
    const completeRes = await request.post(
      `http://127.0.0.1:8180/api/v1/public/consent/authorization/${token}/complete`,
      {
        timeout: 90_000,
        data: {
          purposes,
          acceptedNotice: true,
          acceptanceAction: 'secure_link_explicit_acceptance',
          noticeDisplayedAt: now,
          noticeAcceptedAt: now,
          integrityCheck: 'E2E_Test_Direct_Completion',
          deviceFingerprint: {
            type: 'Desktop',
            os: 'Windows',
            osVersion: '10',
            browser: 'Playwright',
            browserVersion: '1.0',
            screenResolution: '1280x720',
            language: 'es-CL',
            viewport: '1280x720',
            touchPoints: 0,
            platform: 'Win32',
            timezone: 'America/Santiago',
            userAgent: 'Playwright E2E Test',
            hardwareConcurrency: 4,
            deviceMemoryGb: null,
            collectedAt: now
          },
          networkContext: {
            ipAddress: null,
            geoRegion: 'CL',
            geoRegionSource: 'locale_timezone_inference',
            isp: 'browser_unavailable',
            ispSource: 'browser_restricted',
            pageUrl: `http://localhost:4300/autorizacion/${token}`,
            referrer: null,
            timezone: 'America/Santiago',
            connectionType: 'unknown',
            downlinkMbps: null,
            roundTripMs: null
          }
        }
      }
    );
    expect(completeRes.status(), 'La primera autorización debe completarse con éxito').toBe(200);

    // 4 — Segunda visita con el mismo token en el browser: debe mostrar estado de error
    await page.goto(`/autorizacion/${token}`);
    await expect(
      page.getByRole('heading', { name: /No fue posible abrir la solicitud/i })
    ).toBeVisible({ timeout: 15_000 });
  });
});
