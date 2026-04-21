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
                <div class="checkbox-list">
                  @for (item of grantItems(); track item.purposeId + '_' + item.canalId) {
                    <label class="checkbox-item">
                      <input type="checkbox" [(ngModel)]="item.selected" [name]="'grant_' + item.purposeId + '_' + item.canalId" />
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
                [disabled]="loading() || !identifier || grantItems().length === 0"
              >
                Otorgar seleccionados
              </button>
            </div>

            <!-- Revoke -->
            <div class="card apidemo-card">
              <h2>Revocar consentimiento</h2>
              @if (purposes().length > 0) {
                <div class="checkbox-list">
                  @for (item of revokeItems(); track item.purposeId + '_' + item.canalId) {
                    <label class="checkbox-item">
                      <input type="checkbox" [(ngModel)]="item.selected" [name]="'revoke_' + item.purposeId + '_' + item.canalId" />
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
                [disabled]="loading() || !identifier || revokeItems().length === 0"
              >
                Revocar seleccionados
              </button>
            </div>

          </div>

          <!-- Right: response -->
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

    .checkbox-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
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

  async loadPurposes(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await fetch('/api/v1/public/consent/purposes', {
        headers: this.buildHeaders()
      });
      const data = await res.json();
      this.lastStatus.set(res.status);
      this.responseText.set(JSON.stringify(data, null, 2));

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
    if (grouped.length === 0) return;
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
    if (grouped.length === 0) return;
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
}
