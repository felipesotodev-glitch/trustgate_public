import { Component, OnInit, OnDestroy, isDevMode, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface DemoChannelOption {
  id: number;
  nombre: string;
  codigo: string;
}

interface DemoPurpose {
  id: number;
  nombre: string;
  descripcion?: string;
  canales?: DemoChannelOption[];
}

interface WidgetConfig {
  clientKey: string;
  identifier: string;
  mode: 'banner' | 'modal' | 'inline';
  selectedPurposeIds: number[];
  selectedChannelCodes: string[];
}

interface WidgetEventLogEntry {
  id: number;
  timestamp: string;
  type: string;
  data: string;
}

const DEFAULT_DEMO_IDENTIFIER = 'demo@trustgate.cl';
const WIDGET_ASSET_VERSION = '2026-04-20-02';

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
                  (blur)="reloadCatalog()"
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

              <div class="form-group">
                <label class="form-label">
                  Finalidades a mostrar
                  <span class="form-hint">Opcional. Selecciona las finalidades que quieres exponer en la integración.</span>
                </label>
                @if (availablePurposes().length > 0) {
                  <div class="purpose-selector" role="group" aria-label="Finalidades disponibles">
                    @for (purpose of availablePurposes(); track purpose.id) {
                      <label class="purpose-selector__item">
                        <input
                          type="checkbox"
                          [ngModel]="isPurposeSelected(purpose.id)"
                          (ngModelChange)="updatePurposeSelection(purpose.id, $event)"
                          [name]="'purpose_' + purpose.id"
                        />
                        <span class="purpose-selector__content">
                          <span class="purpose-selector__label">{{ purpose.nombre }}</span>
                          @if (purpose.descripcion) {
                            <span class="purpose-selector__description">{{ purpose.descripcion }}</span>
                          }
                        </span>
                      </label>
                    }
                  </div>
                } @else {
                  <p class="form-hint form-hint--panel">
                    No hay finalidades cargadas aún. El demo intentará obtenerlas desde la API con la llave de integración actual.
                  </p>
                }
              </div>

              <div class="form-group">
                <label class="form-label">
                  Canales a mostrar
                  <span class="form-hint">Opcional. Selecciona los canales que quieres exponer en la integración.</span>
                </label>
                @if (availableChannels().length > 0) {
                  <div class="channel-selector" role="group" aria-label="Canales disponibles">
                    @for (channel of availableChannels(); track channel.codigo) {
                      <label class="channel-selector__item">
                        <input
                          type="checkbox"
                          [ngModel]="isChannelSelected(channel.codigo)"
                          (ngModelChange)="updateChannelSelection(channel.codigo, $event)"
                          [name]="'channel_' + channel.codigo"
                        />
                        <span class="channel-selector__label">{{ channel.nombre }}</span>
                        <span class="channel-selector__code">{{ channel.codigo }}</span>
                      </label>
                    }
                  </div>
                } @else {
                  <p class="form-hint form-hint--panel">
                    No hay canales cargados aún. El demo intentará obtenerlos desde la API con la llave de integración actual.
                  </p>
                }
              </div>

              <div class="demo-actions">
                <button type="submit" class="btn btn-primary">Lanzar widget</button>
                <button type="button" class="btn btn-outline" (click)="closeWidget()">Cerrar widget</button>
              </div>
            </form>
          </aside>

          <!-- Preview + log -->
          <div class="demo-preview">
            <div class="integration-code card" aria-label="Código de integración generado">
              <div class="integration-code__header">
                <div>
                  <p class="integration-code__eyebrow">Código generado</p>
                  <h3>Snippet listo para integrar</h3>
                </div>
              </div>
              <p class="integration-code__hint">
                Este bloque se construye según tu configuración actual. Ajusta modo, identificador y filtros para ver el código final que deberías incrustar en tu sitio.
              </p>
              <pre class="integration-code__pre"><code>{{ buildIntegrationSnippet() }}</code></pre>
            </div>

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
                @for (entry of eventLog(); track entry.id) {
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

    .channel-selector {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 220px;
      overflow-y: auto;
      padding-right: 4px;
    }

    .purpose-selector {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 220px;
      overflow-y: auto;
      padding-right: 4px;
    }

    .channel-selector__item,
    .purpose-selector__item {
      display: flex;
      align-items: start;
      gap: 10px;
      padding: 10px 12px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-alt);
      cursor: pointer;
    }

    .purpose-selector__content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .purpose-selector__label {
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--color-text);
    }

    .purpose-selector__description {
      font-size: var(--font-size-xs);
      color: var(--color-muted);
      line-height: 1.4;
    }

    .channel-selector__label {
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--color-text);
    }

    .channel-selector__code {
      margin-left: auto;
      font-size: var(--font-size-xs);
      color: var(--color-muted);
      padding: 2px 8px;
      border-radius: 999px;
      background: var(--color-primary-light);
    }

    .form-hint--panel {
      padding: 10px 12px;
      border-radius: var(--radius-md);
      background: var(--color-bg-alt);
      border: 1px dashed var(--color-border);
      margin-top: 0;
    }

    .demo-preview {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .integration-code__header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      gap: 12px;
      margin-bottom: 8px;
    }

    .integration-code__eyebrow {
      font-size: var(--font-size-xs);
      color: var(--color-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 700;
      margin-bottom: 6px;
    }

    .integration-code__header h3 {
      font-size: var(--font-size-lg);
    }

    .integration-code__hint {
      font-size: var(--font-size-sm);
      color: var(--color-muted);
      margin-bottom: 16px;
    }

    .integration-code__pre {
      margin: 0;
      max-height: 420px;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-word;
      font-size: var(--font-size-xs);
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
    .entry-error   { border-left-color: var(--color-warning); }
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

    .entry-badge--granted { background: var(--color-success-bg); color: var(--color-success-text); }
    .entry-badge--revoked { background: var(--color-error-bg); color: var(--color-error-text); }
    .entry-badge--error   { background: var(--color-warning-bg); color: var(--color-warning-text); }
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
    mode: 'banner',
    selectedPurposeIds: [],
    selectedChannelCodes: []
  };

  eventLog = signal<WidgetEventLogEntry[]>([]);
  availablePurposes = signal<DemoPurpose[]>([]);
  availableChannels = signal<DemoChannelOption[]>([]);

  private scriptElement: HTMLScriptElement | null = null;
  private eventLogSequence = 0;

  ngOnInit(): void {
    this.loadDemoConfig();
  }

  ngOnDestroy(): void {
    this.removeWidgetScript();
  }

  private async loadDemoConfig(): Promise<void> {
    if (isDevMode()) {
      await this.reloadCatalog();
      return;
    }

    try {
      const response = await fetch('/api/public-config');
      if (response.ok) {
        const data = await response.json() as { demoClientKey?: string; demoIdentifier?: string };
        if (data.demoClientKey) {
          this.config.clientKey = data.demoClientKey;
        }
        this.config.identifier = data.demoIdentifier?.trim() || this.config.identifier || DEFAULT_DEMO_IDENTIFIER;
        await this.reloadCatalog();
      }
    } catch {
      this.addLogEntry('info', 'No se pudo cargar la config del servidor (modo desarrollo)');
    }
  }

  async reloadCatalog(): Promise<void> {
    if (!this.config.clientKey.trim()) {
      this.availablePurposes.set([]);
      this.availableChannels.set([]);
      return;
    }

    try {
      const response = await fetch('/api/v1/public/consent/purposes', {
        headers: {
          'Content-Type': 'application/json',
          'x-client-key': this.config.clientKey.trim()
        }
      });

      if (!response.ok) {
        this.availableChannels.set([]);
        return;
      }

      const data = await response.json() as DemoPurpose[];
      this.availablePurposes.set(data);
      const uniqueChannels = new Map<string, DemoChannelOption>();

      data.forEach((purpose) => {
        (purpose.canales || []).forEach((channel) => {
          if (!channel?.codigo || uniqueChannels.has(channel.codigo)) {
            return;
          }
          uniqueChannels.set(channel.codigo, channel);
        });
      });

      this.availableChannels.set(Array.from(uniqueChannels.values()));
    } catch {
      this.availablePurposes.set([]);
      this.availableChannels.set([]);
    }
  }

  isPurposeSelected(purposeId: number): boolean {
    return this.config.selectedPurposeIds.includes(purposeId);
  }

  updatePurposeSelection(purposeId: number, selected: boolean): void {
    this.config.selectedPurposeIds = selected
      ? Array.from(new Set([...this.config.selectedPurposeIds, purposeId]))
      : this.config.selectedPurposeIds.filter((item) => item !== purposeId);
  }

  isChannelSelected(channelCode: string): boolean {
    return this.config.selectedChannelCodes.includes(channelCode);
  }

  updateChannelSelection(channelCode: string, selected: boolean): void {
    this.config.selectedChannelCodes = selected
      ? Array.from(new Set([...this.config.selectedChannelCodes, channelCode]))
      : this.config.selectedChannelCodes.filter((item) => item !== channelCode);
  }

  launchWidget(): void {
    this.config.identifier = this.config.identifier.trim() || DEFAULT_DEMO_IDENTIFIER;
    const purposeIds = this.config.selectedPurposeIds;
    const channelCodes = this.config.selectedChannelCodes;
    const statusEndpoint = this.resolveStatusEndpoint();

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
      statusEndpoint,
      purposeIds: purposeIds,
      channelCodes: channelCodes,
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

  buildIntegrationSnippet(): string {
    const identifier = this.config.identifier.trim() || DEFAULT_DEMO_IDENTIFIER;
    const purposeIds = this.config.selectedPurposeIds;
    const channelCodes = this.config.selectedChannelCodes;
    const statusEndpoint = this.resolveStatusEndpoint();
    const configLines = [
      `  clientKey: '${this.escapeForSnippet(this.config.clientKey.trim() || 'tgpub_xxxxxxxxxxxxxxxx')}',`,
      `  identifier: '${this.escapeForSnippet(identifier)}',`,
      `  mode: '${this.config.mode}',`
    ];

    if (this.config.mode === 'inline') {
      configLines.push(`  targetId: 'trustgate-inline-target',`);
    }

    if (purposeIds.length > 0) {
      configLines.push(`  purposeIds: [${purposeIds.join(', ')}],`);
    }

    if (channelCodes.length > 0) {
      const quotedChannelCodes = channelCodes.map((item) => `'${this.escapeForSnippet(item)}'`).join(', ');
      configLines.push(`  channelCodes: [${quotedChannelCodes}],`);
    }

    if (statusEndpoint !== '/api/v1/public/consent/status') {
      configLines.push(`  statusEndpoint: '${this.escapeForSnippet(statusEndpoint)}',`);
    }

    configLines.push(`  onGranted: (data) => console.log('Consentimiento otorgado', data),`);
    configLines.push(`  onRevoked: (data) => console.log('Consentimiento revocado', data),`);
    configLines.push(`  onError: (error) => console.error('Error del widget', error)`);

    const inlineTargetMarkup = this.config.mode === 'inline'
      ? '<div id="trustgate-inline-target"></div>\n\n'
      : '';

    return `${inlineTargetMarkup}<script>\nwindow.TrustGateConfig = {\n${configLines.join('\n')}\n};\n</script>\n<script src="https://cdn.trustgate.cl/widget/latest/trustgate-widget.js" defer></script>`;
  }

  private escapeForSnippet(value: string): string {
    return String(value || '')
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'");
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

  private resolveStatusEndpoint(): string {
    return isDevMode() ? '/api/v1/public/consent/status' : '/api/widget-demo/consent-status';
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
      id: ++this.eventLogSequence,
      timestamp: new Date().toLocaleTimeString('es-CL'),
      type,
      data
    };
    this.eventLog.update((log) => [entry, ...log]);
  }
}
