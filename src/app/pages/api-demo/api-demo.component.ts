import { Component, OnInit, isDevMode, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Canal {
  id: number;
  nombre: string;
  codigo: string;
}

interface Purpose {
  id: number;
  nombre: string;
  descripcion: string;
  baseLegal: string;
  canales: Canal[];
}

interface ApiDemoLogEntry {
  id: number;
  timestamp: string;
  type: 'info' | 'success' | 'error';
  data: string;
}

const API_DEMO_DEFAULT_IDENTIFIER = 'demo@trustgate.cl';
const API_DEMO_DEFAULT_REVOKE_REASON = 'Solicitud del titular (Art. 16 Ley 21.719)';

@Component({
  selector: 'tp-api-demo',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="section">
      <div class="container">
        <header class="page-header">
          <span class="badge badge-primary">REST API</span>
          <h1>Demo API REST pública</h1>
          <p class="page-header__lead">
            Prueba todos los endpoints de la TrustGate Public API directamente desde tu navegador.
          </p>
        </header>

        <div class="apidemo-layout">
          <!-- Left: controls -->
          <div class="apidemo-controls">

            <!-- Credentials -->
            <div class="card apidemo-card">
              <h2>Credenciales</h2>
              <div class="form-group">
                <label class="form-label" for="apiClientKey">
                  Llave de integración (x-client-key)
                </label>
                <input
                  id="apiClientKey"
                  type="text"
                  class="form-control"
                  [(ngModel)]="clientKey"
                  name="apiClientKey"
                  placeholder="tgpub_xxxxxxxxxxxxxxxx"
                  autocomplete="off"
                />
              </div>
              <div class="form-group" style="margin-top:12px">
                <label class="form-label" for="apiIdentifier">
                  Identificador del titular
                </label>
                <input
                  id="apiIdentifier"
                  type="text"
                  class="form-control"
                  [(ngModel)]="identifier"
                  name="apiIdentifier"
                  placeholder="rut@empresa.cl"
                  autocomplete="off"
                />
              </div>
              <div class="demo-actions" style="margin-top:12px">
                <button class="btn btn-outline" type="button" (click)="loadPurposes()" [disabled]="loading() || !clientKey">
                  Recargar catalogo
                </button>
              </div>
            </div>

            <div class="card apidemo-card">
              <h2>Operacion a integrar</h2>
              <p class="apidemo-hint">Selecciona la API que quieres probar e integrar. El snippet generado se actualiza segun esta eleccion.</p>
              <select class="form-control" [(ngModel)]="selectedOperation" name="selectedOperation">
                <option value="purposes">Listar finalidades</option>
                <option value="status">Consultar estado</option>
                <option value="grant">Otorgar consentimiento</option>
                <option value="revoke">Revocar consentimiento</option>
              </select>
              <p class="apidemo-hint">
                Los requests de <strong>grant</strong> y <strong>revoke</strong> usan como ejemplo la primera finalidad/canal disponible del catalogo cargado.
              </p>
            </div>

            <div class="card apidemo-card apidemo-event-log" aria-label="Log de eventos de la API demo">
              <div class="apidemo-event-log__header">
                <h2>Log de eventos</h2>
                <button class="btn btn-outline apidemo-clear" type="button" (click)="clearEventLog()">Limpiar</button>
              </div>
              <div class="apidemo-event-log__body" role="log" aria-live="polite">
                @if (eventLog().length === 0) {
                  <p class="apidemo-hint">Las ejecuciones, respuestas y errores de esta pantalla apareceran aqui.</p>
                }
                @for (entry of eventLog(); track entry.id) {
                  <div class="apidemo-log-entry" [class]="'apidemo-log-entry--' + entry.type">
                    <div class="apidemo-log-entry__meta">
                      <span>{{ entry.timestamp }}</span>
                      <span class="apidemo-log-entry__badge">{{ entry.type }}</span>
                    </div>
                    <pre class="apidemo-log-entry__data">{{ entry.data }}</pre>
                  </div>
                }
              </div>
            </div>

          </div>

          <!-- Right: generated code + response -->
          <div class="apidemo-results">
            <div class="card apidemo-card apidemo-code">
              <div class="apidemo-code__header">
                <div>
                  <p class="apidemo-code__eyebrow">Codigo generado</p>
                  <h2>Snippet listo para integrar</h2>
                </div>
              </div>
              <p class="apidemo-hint">
                Este bloque usa tu configuracion actual y la operacion seleccionada para mostrar el request que deberias integrar desde tu backend o frontend controlado.
              </p>
              <pre class="apidemo-code__pre" aria-label="Snippet de integracion API">{{ buildIntegrationSnippet() }}</pre>
              <div class="demo-actions" style="margin-top:12px">
                <button class="btn btn-primary" type="button" (click)="executeSelectedOperation()" [disabled]="isExecuteDisabled() || loading()">
                  {{ loading() ? 'Ejecutando...' : 'Ejecutar solicitud' }}
                </button>
              </div>
            </div>

            <div class="apidemo-response card">
              <div class="apidemo-response__header">
                <h2>Respuesta</h2>
                @if (lastStatus()) {
                  <span class="status-chip" [class.status-ok]="lastStatus()! < 400" [class.status-err]="lastStatus()! >= 400">
                    HTTP {{ lastStatus() }}
                  </span>
                }
                <button class="btn btn-outline apidemo-clear" (click)="clearResponse()">Limpiar</button>
              </div>
              <pre class="apidemo-pre" aria-label="Respuesta JSON de la API">{{ responseText() || 'La respuesta aparecerá aquí...' }}</pre>
            </div>
          </div>
        </div>

      </div>
    </section>
  `,
  styles: [`
    /* US-6301 técnica: normaliza estados visuales de ejecución API con tokens de semáforo institucional. */
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

    .apidemo-layout {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
    }

    @media (min-width: 1024px) {
      .apidemo-layout {
        grid-template-columns: 380px 1fr;
        align-items: start;
      }
    }

    .apidemo-controls {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .apidemo-results {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .apidemo-card {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .apidemo-card h2 {
      font-size: var(--font-size-base);
      font-weight: 700;
      color: var(--color-dark);
    }

    .apidemo-hint {
      font-size: var(--font-size-sm);
      color: var(--color-muted);
    }

    .demo-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .apidemo-event-log {
      min-height: 280px;
    }

    .apidemo-event-log__header {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .apidemo-event-log__header h2 {
      flex: 1;
    }

    .apidemo-event-log__body {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 360px;
      overflow-y: auto;
      padding-right: 4px;
    }

    .apidemo-log-entry {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 10px 12px;
      background: var(--color-bg-alt);
    }

    .apidemo-log-entry--success {
      border-color: var(--color-success-border);
      background: var(--color-success-bg);
    }

    .apidemo-log-entry--error {
      border-color: var(--color-error-border);
      background: var(--color-error-bg);
    }

    .apidemo-log-entry__meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      font-size: var(--font-size-xs);
      color: var(--color-muted);
      margin-bottom: 8px;
    }

    .apidemo-log-entry__badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 2px 8px;
      border-radius: 999px;
      background: var(--color-primary-light);
      color: var(--color-primary-dark);
      font-weight: 700;
      text-transform: uppercase;
    }

    .apidemo-log-entry__data {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-size: var(--font-size-xs);
    }

    .apidemo-code__header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      gap: 12px;
      margin-bottom: 8px;
    }

    .apidemo-code__eyebrow {
      font-size: var(--font-size-xs);
      color: var(--color-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 700;
      margin-bottom: 6px;
    }

    .apidemo-code__pre {
      margin: 0;
      max-height: 320px;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-word;
      font-size: var(--font-size-xs);
    }

    .apidemo-response {
      position: sticky;
      top: 80px;
      min-height: 500px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .apidemo-response__header {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .apidemo-response__header h2 {
      font-size: var(--font-size-base);
      font-weight: 700;
      flex: 1;
    }

    .status-chip {
      padding: 2px 10px;
      border-radius: 999px;
      font-size: var(--font-size-xs);
      font-weight: 700;
    }

    .status-ok { background: var(--color-success-bg); color: var(--color-success); }
    .status-err { background: var(--color-error-bg); color: var(--color-error); }

    .apidemo-clear {
      padding: 4px 12px;
      font-size: var(--font-size-xs);
    }

    .apidemo-pre {
      flex: 1;
      min-height: 400px;
      margin: 0;
      white-space: pre-wrap;
      word-break: break-all;
      font-size: var(--font-size-xs);
    }
  `]
})
export class ApiDemoComponent implements OnInit {
  clientKey = '';
  identifier = API_DEMO_DEFAULT_IDENTIFIER;
  selectedOperation: 'purposes' | 'status' | 'grant' | 'revoke' = 'grant';

  purposes = signal<Purpose[]>([]);
  eventLog = signal<ApiDemoLogEntry[]>([]);
  responseText = signal<string>('');
  lastStatus = signal<number | null>(null);
  loading = signal(false);

  private logSequence = 0;

  ngOnInit(): void {
    this.loadPublicConfig();
  }

  private async loadPublicConfig(): Promise<void> {
    if (isDevMode()) {
      await this.loadPurposes(false);
      return;
    }

    try {
      const res = await fetch('/api/public-config');
      if (res.ok) {
        const data = await res.json() as { demoClientKey?: string; demoIdentifier?: string };
        if (data.demoClientKey) {
          this.clientKey = data.demoClientKey;
        }
        this.identifier = data.demoIdentifier?.trim() || this.identifier || API_DEMO_DEFAULT_IDENTIFIER;
        await this.loadPurposes(false);
      }
    } catch {
      // dev mode — ignore
    }
  }

  private getEffectiveIdentifier(): string {
    return this.identifier.trim() || API_DEMO_DEFAULT_IDENTIFIER;
  }

  private buildHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'x-client-key': this.clientKey
    };
  }

  private buildExamplePurposes(): Array<{ idFinalidad: number; idCanales: number[] }> {
    const firstPurpose = this.purposes()[0];
    const firstChannel = firstPurpose?.canales?.[0];

    if (firstPurpose && firstChannel) {
      return [{ idFinalidad: firstPurpose.id, idCanales: [firstChannel.id] }];
    }

    return [{ idFinalidad: 1, idCanales: [1] }];
  }

  async loadPurposes(showResponse = true): Promise<void> {
    this.addLogEntry('info', 'Cargando finalidades activas para la client key configurada.');
    this.loading.set(true);
    try {
      const res = await fetch('/api/v1/public/consent/purposes', {
        headers: this.buildHeaders()
      });
      const data = await res.json();
      this.lastStatus.set(res.status);
      if (showResponse) {
        this.responseText.set(JSON.stringify(data, null, 2));
      }
      this.addLogEntry(res.ok ? 'success' : 'error', this.formatLogPayload('GET /api/v1/public/consent/purposes', res.status, data));

      if (res.ok) {
        const list: Purpose[] = Array.isArray(data) ? data : [];
        this.purposes.set(list);
      }
    } catch (err) {
      this.responseText.set(`Error de red: ${String(err)}`);
      this.addLogEntry('error', `GET /api/v1/public/consent/purposes\n${String(err)}`);
    } finally {
      this.loading.set(false);
    }
  }

  async queryStatus(): Promise<void> {
    const identifier = this.getEffectiveIdentifier();
    this.addLogEntry('info', `Consultando estado para ${identifier}.`);
    this.loading.set(true);
    try {
      const url = `/api/v1/public/consent/status?identifier=${encodeURIComponent(identifier)}`;
      const res = await fetch(url, {
        headers: this.buildHeaders()
      });
      const data = await res.json();
      this.lastStatus.set(res.status);
      this.responseText.set(JSON.stringify(data, null, 2));
      this.addLogEntry(res.ok ? 'success' : 'error', this.formatLogPayload(`GET ${url}`, res.status, data));
    } catch (err) {
      this.responseText.set(`Error de red: ${String(err)}`);
      this.addLogEntry('error', `GET /api/v1/public/consent/status\n${String(err)}`);
    } finally {
      this.loading.set(false);
    }
  }

  async grantConsent(): Promise<void> {
    const grouped = this.buildExamplePurposes();
    const identifier = this.getEffectiveIdentifier();
    this.addLogEntry('info', `Ejecutando grant de prueba para ${identifier}.\n${JSON.stringify(grouped, null, 2)}`);
    this.loading.set(true);
    try {
      const body = {
        identifier,
        purposes: grouped,
        acceptanceAction: 'DEMO_GRANT',
        clientMetadata: {
          pageUrl: typeof window !== 'undefined' ? window.location.href : ''
        }
      };
      const res = await fetch('/api/v1/public/consent/grant', {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(body)
      });
      const data = await res.json();
      this.lastStatus.set(res.status);
      this.responseText.set(JSON.stringify(data, null, 2));
      this.addLogEntry(res.ok ? 'success' : 'error', this.formatLogPayload('POST /api/v1/public/consent/grant', res.status, data));
    } catch (err) {
      this.responseText.set(`Error de red: ${String(err)}`);
      this.addLogEntry('error', `POST /api/v1/public/consent/grant\n${String(err)}`);
    } finally {
      this.loading.set(false);
    }
  }

  async revokeConsent(): Promise<void> {
    const grouped = this.buildExamplePurposes();
    const identifier = this.getEffectiveIdentifier();
    this.addLogEntry('info', `Ejecutando revoke de prueba para ${identifier}.\n${JSON.stringify(grouped, null, 2)}`);
    this.loading.set(true);
    try {
      const body = {
        identifier,
        purposes: grouped,
        reason: API_DEMO_DEFAULT_REVOKE_REASON,
        clientMetadata: {
          pageUrl: typeof window !== 'undefined' ? window.location.href : ''
        }
      };
      const res = await fetch('/api/v1/public/consent/revoke', {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(body)
      });
      const data = await res.json();
      this.lastStatus.set(res.status);
      this.responseText.set(JSON.stringify(data, null, 2));
      this.addLogEntry(res.ok ? 'success' : 'error', this.formatLogPayload('POST /api/v1/public/consent/revoke', res.status, data));
    } catch (err) {
      this.responseText.set(`Error de red: ${String(err)}`);
      this.addLogEntry('error', `POST /api/v1/public/consent/revoke\n${String(err)}`);
    } finally {
      this.loading.set(false);
    }
  }

  clearResponse(): void {
    this.responseText.set('');
    this.lastStatus.set(null);
  }

  clearEventLog(): void {
    this.eventLog.set([]);
  }

  buildIntegrationSnippet(): string {
    const identifier = this.getEffectiveIdentifier();
    const groupedGrant = this.buildExamplePurposes();
    const groupedRevoke = this.buildExamplePurposes();
    const snippetByOperation: Record<typeof this.selectedOperation, string> = {
      purposes: this.buildPurposesSnippet(),
      status: this.buildStatusSnippet(identifier),
      grant: this.buildGrantSnippet(identifier, groupedGrant),
      revoke: this.buildRevokeSnippet(identifier, groupedRevoke)
    };

    return snippetByOperation[this.selectedOperation];
  }

  executeSelectedOperation(): Promise<void> {
    switch (this.selectedOperation) {
      case 'purposes':
        return this.loadPurposes();
      case 'status':
        return this.queryStatus();
      case 'grant':
        return this.grantConsent();
      case 'revoke':
        return this.revokeConsent();
      default:
        return Promise.resolve();
    }
  }

  isExecuteDisabled(): boolean {
    if (!this.clientKey.trim()) {
      return true;
    }

    if (this.selectedOperation === 'grant') {
      return this.purposes().length === 0;
    }

    if (this.selectedOperation === 'revoke') {
      return this.purposes().length === 0;
    }

    return false;
  }

  private buildPurposesSnippet(): string {
    return `fetch('/api/v1/public/consent/purposes', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'x-client-key': '${this.escapeForSnippet(this.clientKey.trim() || 'tgpub_xxxxxxxxxxxxxxxx')}'
  }
}).then((response) => response.json())
  .then((data) => console.log('Finalidades activas', data));`;
  }

  private buildStatusSnippet(identifier: string): string {
    return `fetch('/api/v1/public/consent/status?identifier=${encodeURIComponent(identifier)}', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'x-client-key': '${this.escapeForSnippet(this.clientKey.trim() || 'tgpub_xxxxxxxxxxxxxxxx')}'
  }
}).then((response) => response.json())
  .then((data) => console.log('Estado del titular', data));`;
  }

  private buildGrantSnippet(identifier: string, purposes: Array<{ idFinalidad: number; idCanales: number[] }>): string {
    const payload = {
      identifier,
      purposes: purposes.length > 0 ? purposes : [{ idFinalidad: 1, idCanales: [1] }],
      acceptanceAction: 'CHECKBOX_ACCEPTED',
      clientMetadata: {
        pageUrl: 'https://www.miempresa.cl/preferencias'
      }
    };

    return `fetch('/api/v1/public/consent/grant', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-client-key': '${this.escapeForSnippet(this.clientKey.trim() || 'tgpub_xxxxxxxxxxxxxxxx')}'
  },
  body: JSON.stringify(${JSON.stringify(payload, null, 2)})
}).then((response) => response.json())
  .then((data) => console.log('Consentimiento otorgado', data));`;
  }

  private buildRevokeSnippet(identifier: string, purposes: Array<{ idFinalidad: number; idCanales: number[] }>): string {
    const payload = {
      identifier,
      purposes: purposes.length > 0 ? purposes : [{ idFinalidad: 1, idCanales: [1] }],
      reason: API_DEMO_DEFAULT_REVOKE_REASON,
      clientMetadata: {
        pageUrl: 'https://www.miempresa.cl/preferencias'
      }
    };

    return `fetch('/api/v1/public/consent/revoke', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-client-key': '${this.escapeForSnippet(this.clientKey.trim() || 'tgpub_xxxxxxxxxxxxxxxx')}'
  },
  body: JSON.stringify(${JSON.stringify(payload, null, 2)})
}).then((response) => response.json())
  .then((data) => console.log('Consentimiento revocado', data));`;
  }

  private escapeForSnippet(value: string): string {
    return String(value || '')
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'");
  }

  private addLogEntry(type: ApiDemoLogEntry['type'], data: string): void {
    const entry: ApiDemoLogEntry = {
      id: ++this.logSequence,
      timestamp: new Date().toLocaleTimeString('es-CL'),
      type,
      data
    };
    this.eventLog.update((items) => [entry, ...items]);
  }

  private formatLogPayload(operation: string, status: number, payload: unknown): string {
    return `${operation}\nHTTP ${status}\n${JSON.stringify(payload, null, 2)}`;
  }
}
