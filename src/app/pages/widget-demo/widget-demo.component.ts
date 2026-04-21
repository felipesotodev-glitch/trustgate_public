import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface WidgetConfig {
  clientKey: string;
  identifier: string;
  mode: 'banner' | 'modal' | 'inline';
}

const DEFAULT_DEMO_IDENTIFIER = 'demo@trustgate.cl';
const WIDGET_ASSET_VERSION = '2026-04-20-01';

@Component({
  selector: 'tp-widget-demo',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="section">
      <div class="container">
        <header class="page-header">
          <span class="badge badge-primary">Demo interactiva</span>
          <h1>Demo interactiva del widget</h1>
          <p class="page-header__lead">
            Prueba el widget de consentimiento TrustGate en tiempo real. Configura los parámetros y lanza el widget para ver cómo se integra en tu sitio.
          </p>
        </header>

        <div class="demo-layout">
          <!-- Config panel -->
          <aside class="demo-config card" aria-label="Configuración del widget">
            <h2>Configuración</h2>

            <form class="demo-form" (ngSubmit)="launchWidget()" #demoForm="ngForm">
              <div class="form-group">
                <label class="form-label" for="clientKey">
                  Llave de integración (x-client-key)
                  <span class="form-hint">Se carga desde el servidor</span>
                </label>
                <input
                  id="clientKey"
                  type="text"
                  class="form-control"
                  [(ngModel)]="config.clientKey"
                  name="clientKey"
                  placeholder="tgpub_xxxxxxxxxxxxxxxx"
                  autocomplete="off"
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label" for="identifier">
                  Identificador del titular
                  <span class="form-hint">Se autocompleta con un identificador de prueba para la demo</span>
                </label>
                <input
                  id="identifier"
                  type="text"
                  class="form-control"
                  [(ngModel)]="config.identifier"
                  name="identifier"
                  placeholder="demo@trustgate.cl"
                  autocomplete="off"
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label" for="widgetMode">Modo de presentación</label>
                <select
                  id="widgetMode"
                  class="form-control"
                  [(ngModel)]="config.mode"
                  name="widgetMode"
                >
                  <option value="banner">Banner</option>
                  <option value="modal">Modal</option>
                  <option value="inline">Inline</option>
                </select>
              </div>

              <div class="demo-actions">
                <button type="submit" class="btn btn-primary">Lanzar widget</button>
                <button type="button" class="btn btn-outline" (click)="closeWidget()">Cerrar widget</button>
              </div>
            </form>
          </aside>

          <!-- Preview + log -->
          <div class="demo-preview">
            <!-- Inline target -->
            @if (config.mode === 'inline') {
              <div class="inline-target-wrapper card" aria-label="Área del widget inline">
                <p class="inline-target-label">Área de widget inline</p>
                <div id="inline-target" class="inline-target"></div>
              </div>
            }

            <!-- Event log -->
            <div class="event-log card" aria-label="Log de eventos del widget" aria-live="polite">
              <div class="event-log__header">
                <h3>Log de eventos</h3>
                <button class="btn btn-outline event-log__clear" (click)="clearLog()">Limpiar</button>
              </div>
              <div class="event-log__body" role="log" aria-label="Eventos del widget">
                @if (eventLog().length === 0) {
                  <p class="event-log__empty">Los eventos del widget aparecerán aquí al lanzarlo.</p>
                }
                @for (entry of eventLog(); track entry.timestamp) {
                  <div class="event-log__entry" [class]="'entry-' + entry.type">
                    <span class="entry-time">{{ entry.timestamp }}</span>
                    <span class="entry-badge" [class]="'entry-badge--' + entry.type">{{ entry.type }}</span>
                    <pre class="entry-data">{{ entry.data }}</pre>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .page-header {
      margin-bottom: 40px;
    }

    .page-header h1 {
      margin-top: 12px;
    }

    .page-header__lead {
      margin-top: 12px;
      font-size: var(--font-size-lg);
      max-width: 640px;
    }

    .demo-layout {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
    }

    @media (min-width: 1024px) {
      .demo-layout {
        grid-template-columns: 320px 1fr;
        align-items: start;
      }
    }

    .demo-config {
      position: sticky;
      top: 80px;
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

    .form-hint {
      font-size: var(--font-size-xs);
      color: var(--color-muted);
      font-weight: 400;
      display: block;
      margin-top: 2px;
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

    .inline-target-wrapper {
      min-height: 200px;
    }

    .inline-target-label {
      font-size: var(--font-size-xs);
      color: var(--color-muted);
      margin-bottom: 12px;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.05em;
    }

    .inline-target {
      min-height: 160px;
      border: 2px dashed var(--color-border);
      border-radius: var(--radius-md);
    }

    .event-log {
      min-height: 300px;
    }

    .event-log__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .event-log__header h3 {
      font-size: var(--font-size-base);
    }

    .event-log__clear {
      padding: 4px 12px;
      font-size: var(--font-size-xs);
    }

    .event-log__body {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 400px;
      overflow-y: auto;
    }

    .event-log__empty {
      font-size: var(--font-size-sm);
      color: var(--color-muted);
      text-align: center;
      padding: 40px 0;
    }

    .event-log__entry {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 10px 12px;
      background: var(--color-bg-alt);
      border-radius: var(--radius-md);
      border-left: 3px solid var(--color-border);
    }

    .entry-granted { border-left-color: var(--color-success); }
    .entry-revoked { border-left-color: var(--color-error); }
    .entry-error   { border-left-color: #f59e0b; }
    .entry-info    { border-left-color: var(--color-primary); }

    .entry-time {
      font-size: var(--font-size-xs);
      color: var(--color-muted);
    }

    .entry-badge {
      display: inline-block;
      padding: 1px 8px;
      border-radius: 999px;
      font-size: var(--font-size-xs);
      font-weight: 600;
      width: fit-content;
      background: var(--color-border);
      color: var(--color-text);
    }

    .entry-badge--granted { background: #dcfce7; color: #166534; }
    .entry-badge--revoked { background: #fee2e2; color: #991b1b; }
    .entry-badge--error   { background: #fef9c3; color: #713f12; }
    .entry-badge--info    { background: var(--color-primary-light); color: var(--color-primary-dark); }

    .entry-data {
      background: transparent;
      color: var(--color-text);
      font-size: var(--font-size-xs);
      margin: 0;
      padding: 4px 0 0;
      white-space: pre-wrap;
      word-break: break-all;
    }
  `]
})
export class WidgetDemoComponent implements OnInit, OnDestroy {
  config: WidgetConfig = {
    clientKey: '',
    identifier: DEFAULT_DEMO_IDENTIFIER,
    mode: 'banner'
  };

  eventLog = signal<Array<{ timestamp: string; type: string; data: string }>>([]);

  private scriptElement: HTMLScriptElement | null = null;

  ngOnInit(): void {
    this.loadDemoConfig();
  }

  ngOnDestroy(): void {
    this.removeWidgetScript();
  }

  private async loadDemoConfig(): Promise<void> {
    try {
      const response = await fetch('/api/public-config');
      if (response.ok) {
        const data = await response.json() as { demoClientKey?: string; demoIdentifier?: string };
        if (data.demoClientKey) {
          this.config.clientKey = data.demoClientKey;
        }
        this.config.identifier = data.demoIdentifier?.trim() || this.config.identifier || DEFAULT_DEMO_IDENTIFIER;
      }
    } catch {
      this.addLogEntry('info', 'No se pudo cargar la config del servidor (modo desarrollo)');
    }
  }

  launchWidget(): void {
    this.config.identifier = this.config.identifier.trim() || DEFAULT_DEMO_IDENTIFIER;

    if (!this.config.clientKey.trim()) {
      this.addLogEntry('error', 'Debes informar clientKey antes de lanzar el widget.');
      return;
    }

    this.removeWidgetScript();
    this.addLogEntry('info', `Lanzando widget en modo "${this.config.mode}" para "${this.config.identifier}"`);

    (window as unknown as Record<string, unknown>)['TrustGateConfig'] = {
      clientKey: this.config.clientKey,
      identifier: this.config.identifier,
      mode: this.config.mode,
      targetId: this.config.mode === 'inline' ? 'inline-target' : undefined,
      skipInitialStatusCheck: true,
      onGranted: (data: unknown) => {
        this.addLogEntry('granted', JSON.stringify(data, null, 2));
      },
      onRevoked: (data: unknown) => {
        this.addLogEntry('revoked', JSON.stringify(data, null, 2));
      },
      onError: (err: unknown) => {
        this.addLogEntry('error', JSON.stringify(err, null, 2));
      }
    };

    const script = document.createElement('script');
    script.src = `/assets/trustgate-widget.js?v=${WIDGET_ASSET_VERSION}`;
    script.defer = true;
    script.onload = () => {
      this.addLogEntry('info', 'Widget cargado correctamente');
    };
    script.onerror = () => {
      this.addLogEntry('error', 'No se pudo cargar trustgate-widget.js — asegúrate de que el archivo existe en /assets/');
    };
    document.body.appendChild(script);
    this.scriptElement = script;
  }

  closeWidget(): void {
    const widgetInstance = (window as unknown as Record<string, unknown>)['TrustGateWidget'];
    if (widgetInstance && typeof (widgetInstance as { close?: () => void }).close === 'function') {
      (widgetInstance as { close: () => void }).close();
    }
    this.removeWidgetScript();
    this.addLogEntry('info', 'Widget cerrado');
  }

  clearLog(): void {
    this.eventLog.set([]);
  }

  private removeWidgetScript(): void {
    const widgetInstance = (window as unknown as Record<string, unknown>)['TrustGateWidget'];
    if (widgetInstance && typeof (widgetInstance as { destroy?: () => void }).destroy === 'function') {
      (widgetInstance as { destroy: () => void }).destroy();
    }

    if (this.scriptElement && this.scriptElement.parentNode) {
      this.scriptElement.parentNode.removeChild(this.scriptElement);
      this.scriptElement = null;
    }

    delete (window as unknown as Record<string, unknown>)['TrustGateWidget'];
  }

  private addLogEntry(type: string, data: string): void {
    const entry = {
      timestamp: new Date().toLocaleTimeString('es-CL'),
      type,
      data
    };
    this.eventLog.update((log) => [entry, ...log]);
  }
}
