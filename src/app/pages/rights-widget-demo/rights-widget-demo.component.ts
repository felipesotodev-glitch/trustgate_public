import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface RightsWidgetConfig {
  token: string;
  authorizationUrl: string;
  mode: 'inline' | 'modal';
  targetId: string;
  title: string;
  description: string;
  previewHeight: number;
}

const DEFAULT_RIGHTS_TOKEN = 'demo-autorizacion-derechos';
const DEFAULT_RIGHTS_TARGET = 'trustgate-rights-demo';

// US-6202 funcional: demo dedicado del widget de derechos ARCO-P para validar el flujo embebido, el enlace seguro y el modo inline/modal.
@Component({
  selector: 'tp-rights-widget-demo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="section">
      <div class="container">
        <header class="page-header">
          <span class="badge badge-primary">Demo interactiva</span>
          <h1>Widget de derechos ARCO-P</h1>
          <p class="page-header__lead">
            Configura y prueba el widget de derechos en un entorno controlado. La vista previa usa el enlace seguro de autorización y reproduce el montaje que integrarán los portales de clientes.
          </p>
        </header>

        <div class="demo-layout">
          <aside class="demo-config card" aria-label="Configuración del widget de derechos">
            <h2>Configuración</h2>

            <form class="demo-form" (ngSubmit)="openPreview()" #rightsForm="ngForm">
              <div class="form-group">
                <label class="form-label" for="authorizationUrl">
                  URL de autorización segura
                  <span class="form-hint">Opcional. Si se deja vacía, se construye desde el token de demo.</span>
                </label>
                <input
                  id="authorizationUrl"
                  type="url"
                  class="form-control"
                  [(ngModel)]="config.authorizationUrl"
                  name="authorizationUrl"
                  placeholder="https://trustgatepublic-production.up.railway.app/autorizacion/..."
                  autocomplete="off"
                />
              </div>

              <div class="form-group">
                <label class="form-label" for="token">
                  Token de autorización
                  <span class="form-hint">Se usa solo si no entregas una URL completa.</span>
                </label>
                <input
                  id="token"
                  type="text"
                  class="form-control"
                  [(ngModel)]="config.token"
                  name="token"
                  placeholder="demo-autorizacion-derechos"
                  autocomplete="off"
                />
              </div>

              <div class="form-group">
                <label class="form-label" for="mode">Modo de presentación</label>
                <select
                  id="mode"
                  class="form-control"
                  [(ngModel)]="config.mode"
                  name="mode"
                >
                  <option value="inline">Inline</option>
                  <option value="modal">Modal</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label" for="targetId">
                  Contenedor objetivo
                  <span class="form-hint">Necesario para el modo inline en portales de clientes.</span>
                </label>
                <input
                  id="targetId"
                  type="text"
                  class="form-control"
                  [(ngModel)]="config.targetId"
                  name="targetId"
                  placeholder="trustgate-rights-demo"
                />
              </div>

              <div class="form-group">
                <label class="form-label" for="title">Título del widget</label>
                <input
                  id="title"
                  type="text"
                  class="form-control"
                  [(ngModel)]="config.title"
                  name="title"
                  placeholder="Centro de derechos ARCO-P"
                />
              </div>

              <div class="form-group">
                <label class="form-label" for="description">Descripción visible</label>
                <textarea
                  id="description"
                  class="form-control"
                  rows="4"
                  [(ngModel)]="config.description"
                  name="description"
                  placeholder="Gestiona solicitudes, seguimiento y evidencia desde tu portal."
                ></textarea>
              </div>

              <div class="form-group">
                <label class="form-label" for="previewHeight">
                  Altura de vista previa
                  <span class="form-hint">Ajusta la altura del iframe embebido.</span>
                </label>
                <input
                  id="previewHeight"
                  type="number"
                  class="form-control"
                  [(ngModel)]="config.previewHeight"
                  name="previewHeight"
                  min="480"
                  step="20"
                />
              </div>

              <div class="demo-actions">
                <button type="submit" class="btn btn-primary">
                  {{ config.mode === 'modal' ? 'Abrir vista previa' : 'Refrescar vista previa' }}
                </button>
                <button type="button" class="btn btn-outline" (click)="closePreview()">Cerrar vista previa</button>
              </div>
            </form>
          </aside>

          <div class="demo-preview">
            <div class="integration-code card" aria-label="Código de integración generado">
              <div class="integration-code__header">
                <div>
                  <p class="integration-code__eyebrow">Código generado</p>
                  <h3>Snippet listo para integrar</h3>
                </div>
              </div>
              <p class="integration-code__hint">
                Este bloque refleja el contrato mínimo del widget de derechos. Ajusta token, URL y contenedor antes de copiarlo al portal del cliente.
              </p>
              <pre class="integration-code__pre"><code>{{ buildIntegrationSnippet() }}</code></pre>
            </div>

            @if (showPreview()) {
              <section class="preview-card card" aria-label="Vista previa del widget de derechos">
                <div class="preview-card__header">
                  <div>
                    <p class="preview-card__eyebrow">Vista previa en vivo</p>
                    <h2>{{ config.title }}</h2>
                    <p>{{ config.description }}</p>
                  </div>
                  <span class="badge badge-primary">{{ config.mode }}</span>
                </div>
                <div class="preview-frame" [style.min-height.px]="config.previewHeight">
                  <iframe
                    class="preview-frame__iframe"
                    [src]="buildPreviewUrl()"
                    [style.height.px]="config.previewHeight"
                    [title]="config.title"
                    loading="lazy"
                  ></iframe>
                </div>
              </section>
            } @else {
              <section class="preview-empty card" aria-label="Vista previa del widget de derechos">
                <h2>Vista previa cerrada</h2>
                <p>Usa el botón <strong>Abrir vista previa</strong> para cargar el flujo de autorización por token o URL segura.</p>
              </section>
            }
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    /* US-6202 funcional: dispone una demo independiente para el widget de derechos con panel de configuración y vista previa embebida. */
    .page-header {
      margin-bottom: 40px;
    }

    .page-header h1 {
      margin-top: 12px;
    }

    .page-header__lead {
      margin-top: 12px;
      font-size: var(--font-size-lg);
      max-width: 680px;
    }

    .demo-layout {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
    }

    @media (min-width: 1024px) {
      .demo-layout {
        grid-template-columns: 340px 1fr;
        align-items: start;
      }

      .demo-config {
        position: sticky;
        top: 80px;
      }
    }

    .demo-config h2 {
      font-size: var(--font-size-xl);
      margin-bottom: 20px;
    }

    .demo-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-label {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-weight: 600;
      color: var(--color-text);
    }

    .form-hint {
      font-size: var(--font-size-xs);
      color: var(--color-muted);
      font-weight: 400;
    }

    .demo-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 8px;
    }

    .demo-preview {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .integration-code__header,
    .preview-card__header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      gap: 12px;
      margin-bottom: 8px;
    }

    .integration-code__eyebrow,
    .preview-card__eyebrow {
      font-size: var(--font-size-xs);
      color: var(--color-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 700;
      margin-bottom: 6px;
    }

    .integration-code__header h3,
    .preview-card__header h2 {
      font-size: var(--font-size-lg);
    }

    .integration-code__hint,
    .preview-card__header p {
      font-size: var(--font-size-sm);
      color: var(--color-muted);
      margin-top: 8px;
    }

    .integration-code__pre {
      margin: 0;
      max-height: 420px;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-word;
      font-size: var(--font-size-xs);
    }

    .preview-empty {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-height: 220px;
      justify-content: center;
    }

    .preview-frame {
      width: 100%;
      border-radius: var(--radius-lg);
      overflow: hidden;
      border: 1px solid var(--color-border);
      background: var(--color-bg-alt);
    }

    .preview-frame__iframe {
      width: 100%;
      border: 0;
      display: block;
      background: var(--color-bg);
    }
  `]
})
export class RightsWidgetDemoComponent {
  config: RightsWidgetConfig = {
    token: DEFAULT_RIGHTS_TOKEN,
    authorizationUrl: '',
    mode: 'inline',
    targetId: DEFAULT_RIGHTS_TARGET,
    title: 'Centro de derechos ARCO-P',
    description: 'Gestiona solicitudes, seguimiento y evidencia desde tu portal.',
    previewHeight: 760
  };

  previewVisible = signal(true);

  openPreview(): void {
    this.previewVisible.set(true);
  }

  closePreview(): void {
    this.previewVisible.set(false);
  }

  showPreview(): boolean {
    return this.config.mode === 'inline' || this.previewVisible();
  }

  buildIntegrationSnippet(): string {
    const configLines = [
      'window.TrustGateRightsConfig = {',
      this.config.authorizationUrl.trim()
        ? `  authorizationUrl: '${this.escapeSnippetValue(this.config.authorizationUrl.trim())}',`
        : `  token: '${this.escapeSnippetValue(this.config.token.trim() || DEFAULT_RIGHTS_TOKEN)}',`,
      `  mode: '${this.config.mode}',`,
      `  targetId: '${this.escapeSnippetValue(this.config.targetId.trim() || DEFAULT_RIGHTS_TARGET)}',`,
      `  title: '${this.escapeSnippetValue(this.config.title.trim())}',`,
      `  description: '${this.escapeSnippetValue(this.config.description.trim())}'`,
      '};',
      '',
      '<script src="https://cdn.trustgate.cl/widget/latest/trustgate-widget-sdk.js" defer></script>',
      '<script src="https://cdn.trustgate.cl/widget/latest/trustgate-rights-widget.js" defer></script>'
    ];

    return configLines.join('\n');
  }

  buildPreviewUrl(): string {
    const customUrl = this.config.authorizationUrl.trim();

    if (customUrl) {
      return customUrl;
    }

    const token = this.config.token.trim() || DEFAULT_RIGHTS_TOKEN;
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

    return `${baseUrl}/autorizacion/${encodeURIComponent(token)}`;
  }

  private escapeSnippetValue(value: string): string {
    return value.replaceAll('\\', '\\\\').replaceAll("'", "\\'");
  }
}