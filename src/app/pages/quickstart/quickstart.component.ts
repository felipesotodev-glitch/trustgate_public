import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'tp-quickstart',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="section">
      <div class="container qs-layout">

        <!-- Header -->
        <header class="qs-header">
          <span class="badge badge-primary">Guía de inicio rápido</span>
          <h1>Comienza en minutos</h1>
          <p class="qs-header__lead">
            Sigue estos seis pasos para integrar TrustGate en tu organización y comenzar a gestionar consentimientos de forma conforme a la Ley 21.719.
          </p>
        </header>

        <!-- Steps -->
        <ol class="qs-steps" aria-label="Pasos de integración">
          @for (step of steps; track step.number) {
            <li class="qs-step">
              <div class="qs-step__aside">
                <span class="qs-step__number" aria-hidden="true">{{ step.number }}</span>
                @if (!$last) {
                  <div class="qs-step__connector" aria-hidden="true"></div>
                }
              </div>
              <article class="qs-step__body card">
                <header class="qs-step__header">
                  <h2>{{ step.title }}</h2>
                  @if (step.badge) {
                    <span class="badge badge-primary">{{ step.badge }}</span>
                  }
                </header>
                <p>{{ step.description }}</p>
                @if (step.code) {
                  <pre>{{ step.code }}</pre>
                }
                @if (step.note) {
                  <div class="qs-note">
                    <strong>💡 Nota:</strong> {{ step.note }}
                  </div>
                }
              </article>
            </li>
          }
        </ol>

        <!-- Next steps -->
        <aside class="qs-next card" aria-label="Próximos pasos">
          <h2>¿Qué sigue?</h2>
          <ul class="qs-next__list" role="list">
            <li>
              <a routerLink="/docs">📖 Lee la documentación completa de la API</a>
            </li>
            <li>
              <a routerLink="/widget-demo">🧪 Prueba el widget en la demo interactiva</a>
            </li>
            <li>
              <a routerLink="/api-demo">⚡ Explora todos los endpoints en la Demo API</a>
            </li>
            <li>
              <a routerLink="/contacto">📬 Solicita soporte técnico o acceso a producción</a>
            </li>
          </ul>
        </aside>

      </div>
    </section>
  `,
  styles: [`
    .qs-layout {
      display: flex;
      flex-direction: column;
      gap: 40px;
      max-width: 800px;
    }

    .qs-header {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .qs-header__lead {
      font-size: var(--font-size-lg);
      max-width: 600px;
    }

    /* Steps list */
    .qs-steps {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .qs-step {
      display: flex;
      gap: 20px;
    }

    .qs-step__aside {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex-shrink: 0;
    }

    .qs-step__number {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--color-primary);
      color: var(--color-bg);
      font-weight: 800;
      font-size: var(--font-size-base);
      flex-shrink: 0;
    }

    .qs-step__connector {
      width: 2px;
      flex: 1;
      background: var(--color-border);
      margin-block: 8px;
      min-height: 24px;
    }

    .qs-step__body {
      flex: 1;
      margin-bottom: 24px;
    }

    .qs-step__header {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .qs-step__header h2 {
      font-size: var(--font-size-xl);
    }

    .qs-note {
      background: var(--color-primary-light);
      border: 1px solid rgba(11,95,255,0.15);
      border-left: 4px solid var(--color-primary);
      padding: 12px 16px;
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
      color: var(--color-text);
      margin-top: 12px;
    }

    /* Next steps */
    .qs-next {
      background: var(--color-bg-alt);
    }

    .qs-next h2 {
      font-size: var(--font-size-xl);
      margin-bottom: 20px;
    }

    .qs-next__list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .qs-next__list a {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: var(--font-size-base);
      color: var(--color-primary);
      font-weight: 500;
      text-decoration: none;
      padding: 10px 14px;
      border-radius: var(--radius-md);
      transition: background var(--transition);
    }

    .qs-next__list a:hover {
      background: var(--color-primary-light);
    }
  `]
})
export class QuickstartComponent {
  steps = [
    {
      number: '1',
      title: 'Regístrate en TrustGate',
      badge: 'Obligatorio',
      description: 'Accede al portal de TrustGate y crea una cuenta de organización. Necesitarás un correo corporativo y los datos de tu empresa para completar el registro.',
      code: undefined,
      note: 'El acceso al portal requiere aprobación manual del equipo de TrustGate para garantizar el cumplimiento regulatorio.'
    },
    {
      number: '2',
      title: 'Crea un cliente de integración',
      badge: undefined,
      description: 'En el portal, ve a la sección "Integraciones" y crea un nuevo cliente. Se generará automáticamente tu x-client-key. Guárdala de forma segura.',
      code: undefined,
      note: 'Crea claves separadas para desarrollo (dev) y producción (prod). Nunca uses la clave de producción en entornos de prueba.'
    },
    {
      number: '3',
      title: 'Configura dominios permitidos',
      badge: undefined,
      description: 'En la configuración del cliente de integración, agrega todos los dominios desde donde el widget o la API serán invocados. Solo las solicitudes desde estos dominios serán aceptadas.',
      code: `Dominios permitidos (ejemplo):
  - https://www.miempresa.cl
  - https://app.miempresa.cl
  - http://localhost:4200  (solo dev)`,
      note: undefined
    },
    {
      number: '4',
      title: 'Integra el widget',
      badge: 'Opción A',
      description: 'Agrega el widget a tu página y proporciona `clientKey` e `identifier`. El widget consulta automáticamente finalidades y estado actual del titular al cargarse.',
      code: `<div id="trustgate-consent"></div>
<script>
  window.TrustGateConfig = {
    clientKey: 'tgpub_xxxxxxxxxxxxxxxx', // desde tu servidor
    identifier: usuario.email,           // identificador del titular
    mode: 'modal',                       // 'banner' | 'modal' | 'inline'
    purposeIds: [1, 2],                  // opcional: limita finalidades visibles
    channelCodes: ['email', 'sms'],      // opcional: limita canales visibles
    onGranted: (data) => console.log('Consentimiento otorgado', data),
    onRevoked: (data) => console.log('Consentimiento revocado', data),
    onError: (err) => console.error('Error del widget', err)
  };
</script>
<script src="https://cdn.trustgate.cl/widget/latest/trustgate-widget.js" defer></script>`,
      note: 'Pasa el clientKey desde tu backend, nunca lo hardcodees en el frontend. Si usas modo inline, agrega además `targetId` con el id del contenedor. Si tu integración no necesita todo el catálogo, usa `purposeIds` y/o `channelCodes` para limitar lo que el widget muestra.'
    },
    {
      number: '5',
      title: 'O usa la REST API',
      badge: 'Opción B',
      description: 'Si prefieres control total, usa la REST API desde tu backend. Ejemplo con curl para otorgar consentimiento:',
      code: `# Otorgar consentimiento
curl -X POST https://api.trustgate.cl/api/v1/public/consent/grant \\
  -H "Content-Type: application/json" \\
  -H "x-client-key: tgpub_xxxxxxxxxxxxxxxx" \\
  -d '{
    "identifier": "usuario@empresa.cl",
    "purposes": [
      {
        "idFinalidad": 1,
        "idCanales": [1, 2]
      }
    ],
    "acceptanceAction": "CHECKBOX_ACCEPTED",
    "clientMetadata": {
      "ip": "203.0.113.1",
      "userAgent": "Mozilla/5.0 ...",
      "pageUrl": "https://www.miempresa.cl/preferencias"
    }
  }'

# Revocar consentimiento
curl -X POST https://api.trustgate.cl/api/v1/public/consent/revoke \\
  -H "Content-Type: application/json" \\
  -H "x-client-key: tgpub_xxxxxxxxxxxxxxxx" \\
  -d '{
    "identifier": "usuario@empresa.cl",
    "purposes": [
      {
        "idFinalidad": 1,
        "idCanales": [2]
      }
    ],
    "reason": "Solicitud del titular",
    "clientMetadata": {
      "ip": "203.0.113.1",
      "userAgent": "Mozilla/5.0 ...",
      "pageUrl": "https://www.miempresa.cl/preferencias"
    }
  }'`,
      note: 'Primero consulta `GET /consent/purposes` para obtener los ids reales de finalidad y canal habilitados para tu cliente.'
    },
    {
      number: '6',
      title: 'Verifica antes de enviar',
      badge: 'Recomendado',
      description: 'Antes de enviar cualquier comunicación de marketing, consulta el estado de consentimiento del titular para asegurarte de que tienes autorización vigente.',
      code: `# Verificar estado antes de campaña
curl -H "x-client-key: tgpub_xxxxxxxxxxxxxxxx" \\
  "https://api.trustgate.cl/api/v1/public/consent/status?identifier=usuario@empresa.cl"

# Respuesta esperada:
{
  "identifier": "usuario@empresa.cl",
  "consents": [
    {
      "purposeId": 1,
      "purposeName": "Marketing digital",
      "channel": "email",
      "status": "vigente",
      "grantedAt": "2026-01-15T10:30:00Z",
      "expiresAt": "2027-01-15T10:30:00Z"
    }
  ]
}`,
      note: 'Solo envía comunicaciones si el status es "vigente". Guarda un registro de la verificación como evidencia de cumplimiento.'
    }
  ];
}
