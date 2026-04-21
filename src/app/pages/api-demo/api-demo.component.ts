import { Component, OnInit, signal } from '@angular/core';
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

interface ConsentItem {
  purposeId: number;
  purposeNombre: string;
  canalId: number;
  canalNombre: string;
  selected: boolean;
}

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
            </div>

            <!-- Purposes -->
            <div class="card apidemo-card">
              <h2>Finalidades</h2>
              <p class="apidemo-hint">Carga las finalidades activas para el cliente.</p>
              <button class="btn btn-primary" (click)="loadPurposes()" [disabled]="loading()">
                {{ loading() ? 'Cargando...' : 'Cargar finalidades' }}
              </button>
            </div>

            <!-- Status -->
            <div class="card apidemo-card">
              <h2>Estado del titular</h2>
              <p class="apidemo-hint">Consulta los consentimientos del titular identificado arriba.</p>
              <button class="btn btn-primary" (click)="queryStatus()" [disabled]="loading() || !identifier">
                Consultar estado
              </button>
            </div>

            <!-- Grant -->
            <div class="card apidemo-card">
              <h2>Otorgar consentimiento</h2>
              @if (purposes().length > 0) {
                <div class="checkbox-list checkbox-list--scrollable">
                  @for (item of grantItems(); track item.purposeId + '_' + item.canalId) {
                    <label class="checkbox-item">
                      <input
                        type="checkbox"
                        [ngModel]="item.selected"
                        (ngModelChange)="updateGrantSelection(item.purposeId, item.canalId, $event)"
                        [name]="'grant_' + item.purposeId + '_' + item.canalId"
                      />
                      <span>{{ item.purposeNombre }}</span>
                      <span class="channel-tag">{{ item.canalNombre }}</span>
                    </label>
                  }
                </div>
              } @else {
                <p class="apidemo-hint">Carga las finalidades primero.</p>
              }
              <button
                class="btn btn-primary"
                style="margin-top:12px"
                (click)="grantConsent()"
                [disabled]="loading() || !identifier || !hasSelectedGrantItems()"
              >
                Otorgar seleccionados
              </button>
            </div>

            <!-- Revoke -->
            <div class="card apidemo-card">
              <h2>Revocar consentimiento</h2>
              @if (purposes().length > 0) {
                <div class="checkbox-list checkbox-list--scrollable">
                  @for (item of revokeItems(); track item.purposeId + '_' + item.canalId) {
                    <label class="checkbox-item">
                      <input
                        type="checkbox"
                        [ngModel]="item.selected"
                        (ngModelChange)="updateRevokeSelection(item.purposeId, item.canalId, $event)"
                        [name]="'revoke_' + item.purposeId + '_' + item.canalId"
                      />
                      <span>{{ item.purposeNombre }}</span>
                      <span class="channel-tag">{{ item.canalNombre }}</span>
                    </label>
                  }
                </div>
                <div class="form-group" style="margin-top:12px">
                  <label class="form-label" for="revokeReason">Motivo</label>
                  <input
                    id="revokeReason"
                    type="text"
                    class="form-control"
                    [(ngModel)]="revokeReason"
                    name="revokeReason"
                    placeholder="Solicitud del titular"
                  />
                </div>
              } @else {
                <p class="apidemo-hint">Carga las finalidades primero.</p>
              }
              <button
                class="btn btn-outline"
                style="margin-top:12px; border-color: var(--color-error); color: var(--color-error)"
                (click)="revokeConsent()"
                [disabled]="loading() || !identifier || !hasSelectedRevokeItems()"
              >
                Revocar seleccionados
              </button>
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

    .checkbox-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .checkbox-list--scrollable {
      max-height: calc((10 * 42px) + (9 * 8px));
      overflow-y: auto;
      padding-right: 4px;
    }

    .checkbox-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: var(--font-size-sm);
      cursor: pointer;
      padding: 8px 10px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      transition: background var(--transition);
    }

    .checkbox-item:hover {
      background: var(--color-bg-alt);
    }

    .channel-tag {
      margin-left: auto;
      font-size: var(--font-size-xs);
      background: var(--color-primary-light);
      color: var(--color-primary-dark);
      padding: 1px 6px;
      border-radius: 999px;
      font-weight: 600;
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

    .status-ok { background: #dcfce7; color: #166534; }
    .status-err { background: #fee2e2; color: #991b1b; }

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
  identifier = '';
  revokeReason = 'Solicitud del titular (Art. 16 Ley 21.719)';
  selectedOperation: 'purposes' | 'status' | 'grant' | 'revoke' = 'grant';

  purposes = signal<Purpose[]>([]);
  grantItems = signal<ConsentItem[]>([]);
  revokeItems = signal<ConsentItem[]>([]);
  responseText = signal<string>('');
  lastStatus = signal<number | null>(null);
  loading = signal(false);

  ngOnInit(): void {
    this.loadPublicConfig();
  }

  private async loadPublicConfig(): Promise<void> {
    try {
      const res = await fetch('/api/public-config');
      if (res.ok) {
        const data = await res.json() as { demoClientKey?: string };
        if (data.demoClientKey) {
          this.clientKey = data.demoClientKey;
          await this.loadPurposes(false);
        }
      }
    } catch {
      // dev mode — ignore
    }
  }

  private buildHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'x-client-key': this.clientKey
    };
  }

  private updateSelection(
    itemsSignal: typeof this.grantItems,
    purposeId: number,
    canalId: number,
    selected: boolean
  ): void {
    itemsSignal.update((items) =>
      items.map((item) =>
        item.purposeId === purposeId && item.canalId === canalId
          ? { ...item, selected }
          : item
      )
    );
  }

  updateGrantSelection(purposeId: number, canalId: number, selected: boolean): void {
    this.updateSelection(this.grantItems, purposeId, canalId, selected);
  }

  updateRevokeSelection(purposeId: number, canalId: number, selected: boolean): void {
    this.updateSelection(this.revokeItems, purposeId, canalId, selected);
  }

  hasSelectedGrantItems(): boolean {
    return this.grantItems().some((item) => item.selected);
  }

  hasSelectedRevokeItems(): boolean {
    return this.revokeItems().some((item) => item.selected);
  }

  /** Aplana propósito × canal en una lista de ítems con checkbox */
  private flattenPurposes(list: Purpose[]): ConsentItem[] {
    return list.flatMap(p =>
      p.canales.map(c => ({
        purposeId: p.id,
        purposeNombre: p.nombre,
        canalId: c.id,
        canalNombre: c.nombre,
        selected: false
      }))
    );
  }

  /** Agrupa ítems seleccionados en el formato { idFinalidad, idCanales[] } */
  private groupSelected(items: ConsentItem[]): Array<{ idFinalidad: number; idCanales: number[] }> {
    const map = new Map<number, number[]>();
    for (const item of items.filter(i => i.selected)) {
      const existing = map.get(item.purposeId);
      if (existing) {
        existing.push(item.canalId);
      } else {
        map.set(item.purposeId, [item.canalId]);
      }
    }
    return Array.from(map.entries()).map(([idFinalidad, idCanales]) => ({ idFinalidad, idCanales }));
  }

  async loadPurposes(showResponse = true): Promise<void> {
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

      if (res.ok) {
        const list: Purpose[] = Array.isArray(data) ? data : [];
        this.purposes.set(list);
        const items = this.flattenPurposes(list);
        this.grantItems.set(items.map(i => ({ ...i })));
        this.revokeItems.set(items.map(i => ({ ...i })));
      }
    } catch (err) {
      this.responseText.set(`Error de red: ${String(err)}`);
    } finally {
      this.loading.set(false);
    }
  }

  async queryStatus(): Promise<void> {
    if (!this.identifier) return;
    this.loading.set(true);
    try {
      const url = `/api/v1/public/consent/status?identifier=${encodeURIComponent(this.identifier)}`;
      const res = await fetch(url, {
        headers: this.buildHeaders()
      });
      const data = await res.json();
      this.lastStatus.set(res.status);
      this.responseText.set(JSON.stringify(data, null, 2));
    } catch (err) {
      this.responseText.set(`Error de red: ${String(err)}`);
    } finally {
      this.loading.set(false);
    }
  }

  async grantConsent(): Promise<void> {
    const grouped = this.groupSelected(this.grantItems());
    if (grouped.length === 0) {
      this.lastStatus.set(null);
      this.responseText.set('Selecciona al menos una finalidad/canal para otorgar consentimiento.');
      return;
    }
    this.loading.set(true);
    try {
      const body = {
        identifier: this.identifier,
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
    } catch (err) {
      this.responseText.set(`Error de red: ${String(err)}`);
    } finally {
      this.loading.set(false);
    }
  }

  async revokeConsent(): Promise<void> {
    const grouped = this.groupSelected(this.revokeItems());
    if (grouped.length === 0) {
      this.lastStatus.set(null);
      this.responseText.set('Selecciona al menos una finalidad/canal para revocar consentimiento.');
      return;
    }
    this.loading.set(true);
    try {
      const body = {
        identifier: this.identifier,
        purposes: grouped,
        reason: this.revokeReason,
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
    } catch (err) {
      this.responseText.set(`Error de red: ${String(err)}`);
    } finally {
      this.loading.set(false);
    }
  }

  clearResponse(): void {
    this.responseText.set('');
    this.lastStatus.set(null);
  }

  buildIntegrationSnippet(): string {
    const identifier = this.identifier.trim() || 'usuario@empresa.cl';
    const groupedGrant = this.groupSelected(this.grantItems());
    const groupedRevoke = this.groupSelected(this.revokeItems());
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

    if (this.selectedOperation === 'status') {
      return !this.identifier.trim();
    }

    if (this.selectedOperation === 'grant') {
      return !this.identifier.trim() || !this.hasSelectedGrantItems();
    }

    if (this.selectedOperation === 'revoke') {
      return !this.identifier.trim() || !this.hasSelectedRevokeItems();
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
      reason: this.revokeReason || 'Solicitud del titular',
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
}
