/**
 * E2E — Captura de networkContext y deviceFingerprint en verificaciones de identidad
 *
 * Verifica que el backend resuelva correctamente GeoIP (MaxMind GeoLite2) y
 * capture el contexto de red y dispositivo del cliente al crear una verificación.
 *
 * Cubre:
 * 1. Captura básica: ipAddress + userAgent desde petición directa
 * 2. Resolución GeoIP real: país, región, ciudad, ISP y ASN via X-Forwarded-For con IP chilena
 * 3. Captura de deviceFingerprint: os, screenResolution, language via headers estándar
 * 4. IP privada (Docker bridge): el sistema captura la IP aunque GeoIP no la resuelva
 *
 * Prerrequisitos:
 *   - Backend corriendo en E2E_API_BASE_URL (default http://127.0.0.1:8180/api/v1)
 *   - Archivos GeoLite2-City.mmdb y GeoLite2-ASN.mmdb montados en ./geoip/
 */
import { expect, request as playwrightRequest, test } from '@playwright/test';

const API_BASE = process.env['E2E_API_BASE_URL'] ?? 'http://127.0.0.1:8180/api/v1';
const API_KEY   = process.env['E2E_API_KEY'] ?? 'poc-dev-key-change-in-production';

const BASE_HEADERS = {
  'x-api-key':   API_KEY,
  'x-user-role': 'operations_analyst',
  'Content-Type': 'application/json'
};

/** Crea un titular de prueba y retorna su idTitular */
async function crearTitular(apiContext: Awaited<ReturnType<typeof playwrightRequest.newContext>>): Promise<string> {
  const ts = Date.now();
  const res = await apiContext.post(`${API_BASE}/titulares`, {
    headers: BASE_HEADERS,
    data: {
      nombreCompleto: `E2E GeoIP ${ts}`,
      email: `e2e.geoip.${ts}@trustgate-test.cl`,
      telefono: '+56999000099',
      rut: `E2E-GEO-${ts}`,
      industria: 'financiera',
      region: 'Metropolitana'
    }
  });
  expect(res.status(), 'Debe crear titular').toBe(201);
  const body = await res.json();
  return body.idTitular;
}

/** Payload estándar de verificación biométrica */
const BIOMETRIC_PAYLOAD = {
  method: 'biometric',
  documentType: 'cedula',
  documentData: {
    documentScore: 0.93,
    biometricScore: 0.91,
    livenessScore:  0.95,
    origen: 'e2e-test'
  }
};

// ─────────────────────────────────────────────────────────────────────────────

test.describe('Captura de networkContext y deviceFingerprint', () => {

  test('captura ipAddress y userAgent en petición directa', async () => {
    const apiContext = await playwrightRequest.newContext();
    const idTitular  = await crearTitular(apiContext);

    const verifyRes = await apiContext.post(
      `${API_BASE}/identity/titulares/${idTitular}/verify`,
      {
        headers: {
          ...BASE_HEADERS,
          'User-Agent': 'E2E-Test-Agent/1.0 (TrustGate)'
        },
        data: BIOMETRIC_PAYLOAD
      }
    );

    expect(verifyRes.status()).toBe(201);
    const body = await verifyRes.json();
    const nc   = body.rawEvidence?.networkContext;

    expect(nc, 'networkContext debe existir en rawEvidence').toBeTruthy();
    expect(nc.ipAddress, 'ipAddress debe estar presente').toBeTruthy();
    expect(nc.ipAddress, 'ipAddress no debe ser "No evidenciado"').not.toBe('No evidenciado');
    expect(nc.userAgent).toContain('E2E-Test-Agent/1.0');
    expect(nc.geoSource).toBeTruthy();

    await apiContext.dispose();
  });

  test('resuelve GeoIP real para IP chilena via X-Forwarded-For', async () => {
    // IP pública de Chile (Villa Alemana, Región de Valparaíso — AS27901)
    const CHILE_IP = '179.60.68.136';

    const apiContext = await playwrightRequest.newContext();
    const idTitular  = await crearTitular(apiContext);

    const verifyRes = await apiContext.post(
      `${API_BASE}/identity/titulares/${idTitular}/verify`,
      {
        headers: {
          ...BASE_HEADERS,
          'X-Forwarded-For': CHILE_IP,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124'
        },
        data: BIOMETRIC_PAYLOAD
      }
    );

    expect(verifyRes.status()).toBe(201);
    const body = await verifyRes.json();
    const nc   = body.rawEvidence?.networkContext;

    expect(nc, 'networkContext debe existir').toBeTruthy();
    expect(nc.ipAddress).toBe(CHILE_IP);
    // GeoLite2 puede resolver región/ciudad con ligera variación respecto a fuentes comerciales
    expect(nc.geoCountry, 'País debe ser CL').toBe('CL');
    expect(nc.geoRegion,  'Región ISO debe ser código CL-XX').toMatch(/^CL-/);
    expect(nc.geoCity,    'Ciudad debe estar presente').toBeTruthy();
    expect(nc.isp,        'ISP debe estar presente').toBeTruthy();
    expect(nc.asn,        'ASN debe ser numérico').toMatch(/^\d+$/);
    expect(nc.geoSource,  'Fuente debe ser maxmind_geolite2').toBe('maxmind_geolite2');

    await apiContext.dispose();
  });

  test('captura deviceFingerprint con headers estándar del navegador', async () => {
    const apiContext = await playwrightRequest.newContext();
    const idTitular  = await crearTitular(apiContext);

    const verifyRes = await apiContext.post(
      `${API_BASE}/identity/titulares/${idTitular}/verify`,
      {
        headers: {
          ...BASE_HEADERS,
          'User-Agent':          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124',
          'Accept-Language':     'es-CL,es;q=0.9',
          'Sec-CH-UA-Platform':  '"Windows"',
          'Sec-CH-UA-Mobile':    '?0',
          'X-Screen-Resolution': '1920x1080'
        },
        data: BIOMETRIC_PAYLOAD
      }
    );

    expect(verifyRes.status()).toBe(201);
    const body = await verifyRes.json();
    const df   = body.rawEvidence?.deviceFingerprint;

    expect(df, 'deviceFingerprint debe existir').toBeTruthy();
    expect(df.os,               'OS debe capturarse de Sec-CH-UA-Platform').toContain('Windows');
    expect(df.browser,          'browser debe contener User-Agent').toContain('Chrome');
    expect(df.language,         'language debe capturarse de Accept-Language').toContain('es-CL');
    expect(df.screenResolution, 'screenResolution debe capturarse de X-Screen-Resolution').toBe('1920x1080');

    await apiContext.dispose();
  });

  test('IP privada queda registrada aunque GeoIP no la resuelva', async () => {
    // Sin X-Forwarded-For → el backend captura la IP del socket (Docker bridge: 172.x.x.x)
    const apiContext = await playwrightRequest.newContext();
    const idTitular  = await crearTitular(apiContext);

    const verifyRes = await apiContext.post(
      `${API_BASE}/identity/titulares/${idTitular}/verify`,
      {
        headers: BASE_HEADERS,
        data: BIOMETRIC_PAYLOAD
      }
    );

    expect(verifyRes.status()).toBe(201);
    const body = await verifyRes.json();
    const nc   = body.rawEvidence?.networkContext;

    expect(nc.ipAddress, 'ipAddress siempre debe estar presente').toBeTruthy();
    expect(nc.ipAddress, 'ipAddress no debe ser null ni vacío').not.toBe('');
    // GeoIP puede retornar "geoip_unavailable" para IPs privadas — esto es correcto
    expect(['maxmind_geolite2', 'geoip_unavailable']).toContain(nc.geoSource);

    await apiContext.dispose();
  });
});
