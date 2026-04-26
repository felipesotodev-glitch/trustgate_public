import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'tp-docs',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="docs-layout">
      <!-- Sidebar -->
      <aside class="docs-sidebar" aria-label="Índice de documentación">
        <nav>
          <ul role="list">
            @for (section of sections; track section.id) {
              <li>
                <a [href]="'#' + section.id" class="docs-sidebar__link">{{ section.title }}</a>
              </li>
            }
          </ul>
        </nav>
      </aside>

      <!-- Content -->
      <main class="docs-content container" id="main-content" aria-label="Documentación TrustGate">

        <header class="docs-header section">
          <span class="badge badge-primary">API Reference</span>
          <h1>TrustGate Public API</h1>
          <p class="docs-header__lead">
            Documentación completa de la API REST pública para integrar gestión de consentimiento en tus sistemas.
          </p>
        </header>

        <!-- Introducción -->
        <section id="introduccion" class="docs-section" aria-labelledby="intro-title">
          <h2 id="intro-title">Introducción</h2>
          <p>
            TrustGate Public API es una REST API que permite a clientes registrados gestionar el consentimiento de sus titulares de datos conforme a la <strong>Ley 21.719</strong> de Chile y la normativa de la <strong>CMF</strong> (Comisión para el Mercado Financiero).
          </p>
          <p>
            A través de esta API puedes otorgar, revocar y consultar el estado de consentimientos con trazabilidad completa, cadena de evidencia SHA-256 y soporte para derechos ARCO-P.
          </p>
          <div class="docs-info-box">
            <strong>Base URL</strong>
            <code>/api/v1/public/</code>
          </div>
        </section>

        <hr class="divider" />

        <!-- Autenticación -->
        <section id="autenticacion" class="docs-section" aria-labelledby="auth-title">
          <h2 id="auth-title">Autenticación</h2>
          <p>
            Todas las rutas bajo <code>/api/v1/public/</code> requieren el header <code>x-client-key</code> con una clave válida emitida por TrustGate.
          </p>
          <pre><code>x-client-key: tgpub_xxxxxxxxxxxxxxxx</code></pre>
          <p>
            Puedes obtener tu <code>x-client-key</code> en el portal de TrustGate, sección "Integraciones". Cada clave está asociada a un cliente, un entorno (dev/prod) y dominios permitidos.
          </p>
          <div class="docs-warning-box">
            <strong>⚠ Importante:</strong> No expongas tu <code>x-client-key</code> en código fuente público. Usa variables de entorno y el servidor como proxy.
          </div>
        </section>

        <hr class="divider" />

        <!-- Endpoints -->
        <section id="endpoints" class="docs-section" aria-labelledby="endpoints-title">
          <h2 id="endpoints-title">Endpoints</h2>

          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Método</th>
                  <th>Ruta</th>
                  <th>Descripción</th>
                </tr>
              </thead>
              <tbody>
                @for (endpoint of endpoints; track endpoint.path) {
                  <tr>
                    <td><span class="method-badge" [class]="'method-' + endpoint.method.toLowerCase()">{{ endpoint.method }}</span></td>
                    <td><code>{{ endpoint.path }}</code></td>
                    <td>{{ endpoint.description }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>

        <hr class="divider" />

        <!-- Modelos de datos -->
        <section id="modelos" class="docs-section" aria-labelledby="models-title">
          <h2 id="models-title">Modelos de datos</h2>

          <h3>GET /consent/purposes — Respuesta</h3>
          <pre>{{ purposesResponse }}</pre>

          <h3>GET /consent/status?identifier=... — Respuesta</h3>
          <pre>{{ statusResponse }}</pre>

          <h3>POST /consent/grant — Body</h3>
          <pre>{{ grantBody }}</pre>

          <h3>POST /consent/revoke — Body</h3>
          <pre>{{ revokeBody }}</pre>
        </section>

        <hr class="divider" />

        <!-- SDK Widget -->
        <section id="sdk-widget" class="docs-section" aria-labelledby="sdk-title">
          <h2 id="sdk-title">SDK Widget</h2>
          <p>
            Embebe el widget de consentimiento en cualquier página HTML con tres líneas de código.
          </p>
          <pre>{{ widgetSnippet }}</pre>
          <p>
            El widget consulta automáticamente <code>/consent/purposes</code> y <code>/consent/status</code> al inicializarse. Para lanzar el widget, <code>identifier</code> y <code>clientKey</code> son obligatorios.
          </p>
          <p>
            La instancia expone <code>window.TrustGateWidget.open()</code>, <code>close()</code>, <code>destroy()</code> y <code>reload()</code> para control programático.
          </p>
          <p>Opciones de configuración disponibles en <code>window.TrustGateConfig</code>:</p>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr><th>Propiedad</th><th>Tipo</th><th>Descripción</th></tr>
              </thead>
              <tbody>
                <tr><td><code>clientKey</code></td><td>string</td><td>Tu x-client-key de integración</td></tr>
                <tr><td><code>identifier</code></td><td>string</td><td>Identificador único del titular</td></tr>
                <tr><td><code>mode</code></td><td>banner | modal | inline</td><td>Modo de presentación del widget</td></tr>
                <tr><td><code>targetId</code></td><td>string</td><td>ID del contenedor para modo inline</td></tr>
                <tr><td><code>purposeIds</code></td><td>number[]</td><td>Opcional. Limita las finalidades visibles del widget</td></tr>
                <tr><td><code>channelIds</code></td><td>number[]</td><td>Opcional. Limita los canales visibles por ID</td></tr>
                <tr><td><code>channelCodes</code></td><td>string[]</td><td>Opcional. Limita los canales visibles por código, por ejemplo <code>email</code> o <code>sms</code></td></tr>
                <tr><td><code>onGranted</code></td><td>function</td><td>Callback al otorgar consentimiento</td></tr>
                <tr><td><code>onRevoked</code></td><td>function</td><td>Callback al revocar consentimiento</td></tr>
                <tr><td><code>onError</code></td><td>function</td><td>Callback en caso de error</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            Si tu sitio o integración no necesita exponer todo el catálogo, puedes limitar lo que se renderiza enviando <code>purposeIds</code>, <code>channelIds</code> o <code>channelCodes</code> en <code>window.TrustGateConfig</code>.
          </p>
        </section>

        <hr class="divider" />

        <!-- Errores -->
        <section id="errores" class="docs-section" aria-labelledby="errors-title">
          <h2 id="errors-title">Errores comunes</h2>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Código HTTP</th>
                  <th>Error</th>
                  <th>Causa</th>
                  <th>Solución</th>
                </tr>
              </thead>
              <tbody>
                @for (err of errors; track err.code) {
                  <tr>
                    <td><strong>{{ err.code }}</strong></td>
                    <td><code>{{ err.error }}</code></td>
                    <td>{{ err.cause }}</td>
                    <td>{{ err.solution }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>

        <div class="docs-footer-nav">
          <a routerLink="/quickstart" class="btn btn-primary">Continuar → Quickstart</a>
        </div>

      </main>
    </div>
  `,
  styles: [`
    /* US-6202 técnica: estandariza los estados visuales de documentación (warning y métodos HTTP) con tokens institucionales. */
    .docs-layout {
      display: flex;
      min-height: 100vh;
    }

    .docs-sidebar {
      display: none;
      width: 240px;
      flex-shrink: 0;
      position: sticky;
      top: 64px;
      height: calc(100vh - 64px);
      overflow-y: auto;
      padding: 32px 20px;
      border-right: 1px solid var(--color-border);
      background: var(--color-bg-alt);
    }

    @media (min-width: 1024px) {
      .docs-sidebar {
        display: block;
      }
    }

    .docs-sidebar__link {
      display: block;
      padding: 8px 12px;
      font-size: var(--font-size-sm);
      color: var(--color-muted);
      border-radius: var(--radius-md);
      text-decoration: none;
      transition: all var(--transition);
    }

    .docs-sidebar__link:hover {
      color: var(--color-primary);
      background: var(--color-primary-light);
    }

    .docs-content {
      flex: 1;
      min-width: 0;
    }

    .docs-header {
      padding-bottom: 32px;
      border-bottom: 1px solid var(--color-border);
    }

    .docs-header__lead {
      font-size: var(--font-size-lg);
      margin-top: 12px;
      max-width: 640px;
    }

    .docs-section {
      padding-block: 40px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .docs-section h2 {
      font-size: var(--font-size-2xl);
    }

    .docs-section h3 {
      font-size: var(--font-size-lg);
      margin-top: 16px;
    }

    .docs-info-box {
      display: flex;
      flex-direction: column;
      gap: 6px;
      background: var(--color-primary-light);
      border: 1px solid rgba(11,95,255,0.15);
      border-left: 4px solid var(--color-primary);
      padding: 16px 20px;
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
    }

    .docs-warning-box {
      background: var(--color-warning-bg);
      border: 1px solid var(--color-warning-border);
      border-left: 4px solid var(--color-warning);
      padding: 16px 20px;
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
      color: var(--color-warning);
    }

    .method-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      font-size: var(--font-size-xs);
      font-weight: 700;
      letter-spacing: 0.05em;
    }

    .method-get { background: var(--color-success-bg); color: var(--color-success); }
    .method-post { background: var(--color-primary-light); color: var(--color-primary-dark); }
    .method-delete { background: var(--color-error-bg); color: var(--color-error); }
    .method-put { background: var(--color-warning-bg); color: var(--color-warning); }
    .method-patch { background: var(--color-primary-light); color: var(--color-primary-dark); }

    .docs-footer-nav {
      padding-block: 40px;
    }
  `]
})
export class DocsComponent {
  sections = [
    { id: 'introduccion', title: 'Introducción' },
    { id: 'autenticacion', title: 'Autenticación' },
    { id: 'endpoints', title: 'Endpoints' },
    { id: 'modelos', title: 'Modelos de datos' },
    { id: 'sdk-widget', title: 'SDK Widget' },
    { id: 'errores', title: 'Errores comunes' }
  ];

  endpoints = [
    {
      method: 'GET',
      path: '/api/v1/public/consent/purposes',
      description: 'Lista las finalidades de consentimiento activas para el cliente.'
    },
    {
      method: 'GET',
      path: '/api/v1/public/consent/status?identifier={identifier}',
      description: 'Consulta el estado de consentimientos del titular.'
    },
    {
      method: 'POST',
      path: '/api/v1/public/consent/grant',
      description: 'Otorga consentimiento para una o más finalidades y canales.'
    },
    {
      method: 'POST',
      path: '/api/v1/public/consent/revoke',
      description: 'Revoca consentimiento para una o más finalidades y canales.'
    }
  ];

  purposesResponse = JSON.stringify([
    {
      id: 1,
      nombre: 'Marketing digital',
      descripcion: 'Autorizacion para comunicaciones promocionales y novedades comerciales.',
      baseLegal: 'Consentimiento expreso',
      canales: [
        { id: 1, nombre: 'Email', codigo: 'email' },
        { id: 2, nombre: 'WhatsApp', codigo: 'whatsapp' }
      ]
    },
    {
      id: 2,
      nombre: 'Analitica comercial',
      descripcion: 'Uso de datos para medir campañas y mejorar la experiencia.',
      baseLegal: 'Consentimiento expreso',
      canales: [
        { id: 1, nombre: 'Email', codigo: 'email' }
      ]
    }
  ], null, 2);

  statusResponse = JSON.stringify({
    identifier: 'usuario@empresa.cl',
    consents: [
      {
        purposeId: 1,
        purposeName: 'Marketing digital',
        channel: 'email',
        status: 'vigente',
        grantedAt: '2026-01-15T10:30:00Z',
        expiresAt: '2027-01-15T10:30:00Z'
      },
      {
        purposeId: 1,
        purposeName: 'Marketing digital',
        channel: 'whatsapp',
        status: 'revocado_total',
        grantedAt: '2026-01-15T10:30:00Z',
        expiresAt: '2027-01-15T10:30:00Z'
      }
    ]
  }, null, 2);

  grantBody = JSON.stringify({
    identifier: 'usuario@empresa.cl',
    purposes: [
      {
        idFinalidad: 1,
        idCanales: [1, 2]
      },
      {
        idFinalidad: 2,
        idCanales: [1]
      }
    ],
    acceptanceAction: 'CHECKBOX_ACCEPTED',
    clientMetadata: {
      ip: '203.0.113.1',
      userAgent: 'Mozilla/5.0 ...',
      pageUrl: 'https://www.miempresa.cl/preferencias'
    }
  }, null, 2);

  revokeBody = JSON.stringify({
    identifier: 'usuario@empresa.cl',
    purposes: [
      {
        idFinalidad: 1,
        idCanales: [2]
      }
    ],
    reason: 'Solicitud del titular (Art. 16 Ley 21.719)',
    clientMetadata: {
      ip: '203.0.113.1',
      userAgent: 'Mozilla/5.0 ...',
      pageUrl: 'https://www.miempresa.cl/preferencias'
    }
  }, null, 2);

  widgetSnippet = `<div id="trustgate-consent"></div>
<script>
  window.TrustGateConfig = {
    clientKey: 'tgpub_xxxxxxxxxxxxxxxx',
    identifier: 'usuario@empresa.cl',
    mode: 'inline',
    targetId: 'trustgate-consent',
    onGranted: (data) => console.log('Otorgado', data),
    onRevoked: (data) => console.log('Revocado', data),
    onError:   (err)  => console.error('Error', err)
  };
</script>
<script src="/assets/trustgate-widget.js" defer></script>`;

  errors = [
    {
      code: '401',
      error: 'unauthorized',
      cause: 'x-client-key ausente o inválida',
      solution: 'Verifica que el header x-client-key sea correcto y esté activo'
    },
    {
      code: '404',
      error: 'subject_not_found',
      cause: 'El titular no existe en el sistema',
      solution: 'Registra al titular antes de consultar su estado'
    },
    {
      code: '409',
      error: 'consent_conflict',
      cause: 'Conflicto de estado (ya revocado o ya otorgado)',
      solution: 'Consulta el estado actual antes de otorgar o revocar'
    },
    {
      code: '422',
      error: 'validation_error',
      cause: 'Body inválido o campos requeridos faltantes',
      solution: 'Revisa la estructura del body según el modelo de datos'
    },
    {
      code: '429',
      error: 'rate_limit_exceeded',
      cause: 'Demasiadas solicitudes en poco tiempo',
      solution: 'Implementa backoff exponencial entre reintentos'
    }
  ];
}
