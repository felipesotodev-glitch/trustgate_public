import { Component, OnInit, OnDestroy, isDevMode, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface Finalidad {
  id: number;
  nombre: string;
  descripcion: string;
}

interface Canal {
  id: number;
  nombre: string;
  icono?: string;
  descripcion?: string;
}

interface SimpleWidgetConfig {
  clientKey: string;
  apiUrl: string;
  mode: 'inline' | 'modal';
  locale: 'es' | 'en';
  policyType: 'callbacks';
  primaryColor: string;
  borderRadius: string;
  fontFamily: string;
  selectedFinalidades: number[];
  selectedCanales: number[];
}

interface EventLogEntry {
  id: number;
  timestamp: string;
  type: string;
  data: string;
}

@Component({
  selector: 'tp-simple-widget-demo',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <section class="section">
      <div class="container">
        <header class="page-header">
          <span class="badge badge-success">Demo interactiva</span>
          <h1>Widget Simplificado — Configurador</h1>
          <p class="page-header__lead">
            Configura el widget simplificado paso a paso. Ajusta las opciones y ve el código de integración generándose en tiempo real.
          </p>
        </header>

        <div class="demo-layout">
          <!-- Config panel -->
          <aside class="demo-config card" aria-label="Configuración del widget">
            <h2>Configuración</h2>

            <form class="demo-form" (ngSubmit)="launchWidget()" #configForm="ngForm">
              <!-- API Key -->
              <div class="form-group">
                <label class="form-label" for="clientKey">
                  API Key (x-client-key)
                  <span class="form-required">*</span>
                </label>
                <input
                  id="clientKey"
                  type="text"
                  class="form-control"
                  [(ngModel)]="config.clientKey"
                  name="clientKey"
                  placeholder="tgpub_xxxxxxxxxxxxxxxx"
                  required
                />
                <span class="form-hint">Tu clave de integración de TrustGate</span>
              </div>

              <!-- Mode -->
              <div class="form-group">
                <label class="form-label" for="widgetMode">Modo de presentación</label>
                <select
                  id="widgetMode"
                  class="form-control"
                  [(ngModel)]="config.mode"
                  name="widgetMode"
                >
                  <option value="inline">Inline (embebido en la página)</option>
                  <option value="modal">Modal (ventana flotante)</option>
                </select>
              </div>

              <!-- Locale -->
              <div class="form-group">
                <label class="form-label" for="locale">Idioma</label>
                <select
                  id="locale"
                  class="form-control"
                  [(ngModel)]="config.locale"
                  name="locale"
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </div>

              <!-- Policy Type -->
              <div class="form-group">
                <label class="form-label">Gestión de políticas</label>
                <div class="radio-group">
                  <label class="radio-option">
                    <input
                      type="radio"
                      [(ngModel)]="config.policyType"
                      name="policyType"
                      value="callbacks"
                      checked
                      disabled
                    />
                    <span class="radio-content">
                      <span class="radio-label">Callbacks (modales personalizados)</span>
                      <span class="radio-hint">Recomendado — usuario permanece en la página</span>
                    </span>
                  </label>
                </div>
              </div>

              <!-- Finalidades -->
              <div class="form-group">
                <label class="form-label">Finalidades a mostrar</label>
                <p class="form-hint">Opcional. Selecciona las finalidades que quieres exponer en la integración.</p>
                @if (availableFinalidades().length === 0 && !loadingFinalidades()) {
                  <p class="form-info">No hay finalidades cargadas aún. El demo intentará obtenerlas desde la API con la llave de integración actual.</p>
                }
                @if (loadingFinalidades()) {
                  <p class="form-info">Cargando finalidades...</p>
                }
                @if (availableFinalidades().length > 0) {
                  <div class="checkbox-group">
                    @for (finalidad of availableFinalidades(); track finalidad.id) {
                      <label class="checkbox-option">
                        <input
                          type="checkbox"
                          [value]="finalidad.id"
                          [checked]="config.selectedFinalidades.includes(finalidad.id)"
                          (change)="toggleFinalidad(finalidad.id, $event)"
                        />
                        <span class="checkbox-label">
                          <strong>{{ finalidad.nombre }}</strong>
                          <small>{{ finalidad.descripcion }}</small>
                        </span>
                      </label>
                    }
                  </div>
                }
              </div>

              <!-- Canales -->
              <div class="form-group">
                <label class="form-label">Canales a mostrar</label>
                <p class="form-hint">Opcional. Selecciona los canales que quieres exponer en la integración.</p>
                @if (availableCanales().length === 0 && !loadingCanales()) {
                  <p class="form-info">No hay canales cargados aún. El demo intentará obtenerlos desde la API con la llave de integración actual.</p>
                }
                @if (loadingCanales()) {
                  <p class="form-info">Cargando canales...</p>
                }
                @if (availableCanales().length > 0) {
                  <div class="checkbox-group">
                    @for (canal of availableCanales(); track canal.id) {
                      <label class="checkbox-option">
                        <input
                          type="checkbox"
                          [value]="canal.id"
                          [checked]="config.selectedCanales.includes(canal.id)"
                          (change)="toggleCanal(canal.id, $event)"
                        />
                        <span class="checkbox-label">
                          <strong>{{ canal.icono }} {{ canal.nombre }}</strong>
                          @if (canal.descripcion) {
                            <small>{{ canal.descripcion }}</small>
                          }
                        </span>
                      </label>
                    }
                  </div>
                }
              </div>

              <!-- Theme -->
              <div class="form-group">
                <label class="form-label">Tema visual</label>
                <div class="theme-inputs">
                  <div class="theme-field">
                    <label class="theme-field__label" for="primaryColor">Color primario</label>
                    <div class="color-input-group">
                      <input
                        id="primaryColor"
                        type="color"
                        class="color-picker"
                        [(ngModel)]="config.primaryColor"
                        name="primaryColor"
                      />
                      <input
                        type="text"
                        class="form-control form-control--sm"
                        [(ngModel)]="config.primaryColor"
                        name="primaryColorText"
                        placeholder="#0b5fff"
                      />
                    </div>
                  </div>
                  <div class="theme-field">
                    <label class="theme-field__label" for="borderRadius">Border radius</label>
                    <input
                      id="borderRadius"
                      type="text"
                      class="form-control form-control--sm"
                      [(ngModel)]="config.borderRadius"
                      name="borderRadius"
                      placeholder="12px"
                    />
                  </div>
                  <div class="theme-field">
                    <label class="theme-field__label" for="fontFamily">Fuente</label>
                    <input
                      id="fontFamily"
                      type="text"
                      class="form-control form-control--sm"
                      [(ngModel)]="config.fontFamily"
                      name="fontFamily"
                      placeholder="Inter, system-ui, sans-serif"
                    />
                  </div>
                </div>
              </div>

              <div class="demo-actions">
                <button type="submit" class="btn btn-primary" [disabled]="!configForm.valid">
                  Lanzar widget
                </button>
                <button type="button" class="btn btn-outline" (click)="resetWidget()">
                  Resetear
                </button>
              </div>
            </form>
          </aside>

          <!-- Preview + code -->
          <div class="demo-preview">
            <!-- Integration code -->
            <div class="integration-code card" aria-label="Código de integración generado">
              <div class="integration-code__header">
                <div>
                  <p class="integration-code__eyebrow">Código generado</p>
                  <h3>Script listo para integrar</h3>
                </div>
              </div>
              <p class="integration-code__hint">
                Este código se construye automáticamente según tu configuración. Cópialo y pégalo en tu sitio web.
              </p>
              <pre class="integration-code__pre"><code>{{ buildIntegrationSnippet() }}</code></pre>
            </div>

            <!-- Inline target -->
            @if (config.mode === 'inline') {
              <div class="inline-target-wrapper card" aria-label="Área del widget inline">
                <p class="inline-target-label">Vista previa del widget</p>
                <div id="trustgate-simple-widget" class="inline-target"></div>
              </div>
            }

            <!-- Event log -->
            <div class="event-log card" aria-label="Log de eventos del widget" aria-live="polite">
              <div class="event-log__header">
                <h3>Log de eventos</h3>
                <button class="btn btn-outline event-log__clear" (click)="clearLog()">Limpiar</button>
              </div>
              <div class="event-log__body" role="log">
                @if (eventLog().length === 0) {
                  <p class="event-log__empty">Los eventos del widget aparecerán aquí.</p>
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
    .page-header { margin-bottom: 40px; }
    .page-header h1 { margin-top: 12px; }
    .page-header__lead { margin-top: 12px; font-size: var(--font-size-lg); max-width: 640px; }

    .demo-layout {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
    }

    @media (min-width: 1024px) {
      .demo-layout {
        grid-template-columns: 360px 1fr;
        align-items: start;
      }
      .demo-config { position: sticky; top: 80px; }
    }

    .demo-config h2 { font-size: var(--font-size-xl); margin-bottom: 20px; }
    .demo-form { display: flex; flex-direction: column; gap: 16px; }
    .form-label { font-weight: 600; display: flex; align-items: center; gap: 4px; }
    .form-required { color: var(--color-error); }
    .form-hint { font-size: var(--font-size-xs); color: var(--color-muted); font-weight: 400; display: block; margin-top: 2px; }
    .demo-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }

    .radio-group { display: flex; flex-direction: column; gap: 8px; }
    .radio-option {
      display: flex;
      align-items: start;
      gap: 10px;
      padding: 10px 12px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-alt);
      cursor: pointer;
    }
    .radio-content { display: flex; flex-direction: column; gap: 4px; }
    .radio-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); }
    .radio-hint { font-size: var(--font-size-xs); color: var(--color-muted); line-height: 1.4; }

    .theme-inputs { display: flex; flex-direction: column; gap: 10px; }
    .theme-field { display: flex; flex-direction: column; gap: 6px; }
    .theme-field__label { font-size: var(--font-size-xs); color: var(--color-muted); font-weight: 600; }
    .color-input-group { display: flex; gap: 8px; align-items: center; }
    .color-picker { width: 48px; height: 36px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); cursor: pointer; }
    .form-control--sm { flex: 1; }

    .demo-preview { display: flex; flex-direction: column; gap: 20px; }

    .integration-code__header { display: flex; justify-content: space-between; align-items: start; gap: 12px; margin-bottom: 8px; }
    .integration-code__eyebrow { font-size: var(--font-size-xs); color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; margin-bottom: 6px; }
    .integration-code__header h3 { font-size: var(--font-size-lg); }
    .integration-code__hint { font-size: var(--font-size-sm); color: var(--color-muted); margin-bottom: 16px; }
    .integration-code__pre { margin: 0; max-height: 420px; overflow: auto; white-space: pre-wrap; word-break: break-word; font-size: var(--font-size-xs); }

    .inline-target-wrapper { min-height: 200px; }
    .inline-target-label { font-size: var(--font-size-xs); color: var(--color-muted); margin-bottom: 12px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; }
    .inline-target { min-height: 160px; }

    .event-log { min-height: 300px; }
    .event-log__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .event-log__header h3 { font-size: var(--font-size-base); }
    .event-log__clear { padding: 4px 12px; font-size: var(--font-size-xs); }
    .event-log__body { display: flex; flex-direction: column; gap: 12px; max-height: 400px; overflow-y: auto; }
    .event-log__empty { font-size: var(--font-size-sm); color: var(--color-muted); text-align: center; padding: 40px 0; }

    .event-log__entry {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 10px 12px;
      background: var(--color-bg-alt);
      border-radius: var(--radius-md);
      border-left: 3px solid var(--color-border);
    }
    .entry-success { border-left-color: var(--color-success); }
    .entry-error { border-left-color: var(--color-error); }
    .entry-info { border-left-color: var(--color-primary); }

    .entry-time { font-size: var(--font-size-xs); color: var(--color-muted); }
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
    .entry-badge--success { background: var(--color-success-bg); color: var(--color-success-text); }
    .entry-badge--error { background: var(--color-error-bg); color: var(--color-error-text); }
    .entry-badge--info { background: var(--color-primary-light); color: var(--color-primary-dark); }
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
export class SimpleWidgetDemoComponent implements OnInit, OnDestroy {
  config: SimpleWidgetConfig = {
    clientKey: '',
    apiUrl: '',
    mode: 'inline',
    locale: 'es',
    policyType: 'callbacks',
    primaryColor: '#0b5fff',
    borderRadius: '12px',
    fontFamily: 'Inter, system-ui, sans-serif',
    selectedFinalidades: [],
    selectedCanales: []
  };

  eventLog = signal<EventLogEntry[]>([]);
  availableFinalidades = signal<Finalidad[]>([]);
  availableCanales = signal<Canal[]>([]);
  loadingFinalidades = signal<boolean>(false);
  loadingCanales = signal<boolean>(false);
  
  private eventLogSequence = 0;
  private widgetInstance: any = null;
  private scriptElement: HTMLScriptElement | null = null;

  ngOnInit(): void {
    this.loadDemoConfig();
    this.loadFinalidadesFromApi();
  }

  ngOnDestroy(): void {
    this.removeWidgetScript();
  }

  private async loadDemoConfig(): Promise<void> {
    this.config.apiUrl = isDevMode() ? 'http://localhost:8180' : window.location.origin;
    
    if (isDevMode()) {
      this.config.clientKey = 'tgpub_demo_key_12345678';
      return;
    }

    try {
      const response = await fetch('/api/public-config');
      if (response.ok) {
        const data = await response.json() as { demoClientKey?: string };
        if (data.demoClientKey) {
          this.config.clientKey = data.demoClientKey;
        }
      }
    } catch {
      this.addLogEntry('info', 'No se pudo cargar la config del servidor (modo desarrollo)');
    }
  }

  launchWidget(): void {
    if (!this.config.clientKey.trim()) {
      this.addLogEntry('error', 'Debes ingresar una API key válida.');
      return;
    }

    this.removeWidgetScript();
    
    // Deshabilitar auto-init del widget ANTES de cargar el script
    (window as any).TrustGateSimpleConfig = { autoInit: false };
    
    this.addLogEntry('info', `Lanzando widget en modo "${this.config.mode}" con locale "${this.config.locale}"`);

    // Cargar el script del widget
    const script = document.createElement('script');
    script.src = '/assets/trustgate-widget-simple.js?v=' + Date.now();
    script.onload = () => {
      this.initWidget();
    };
    script.onerror = () => {
      this.addLogEntry('error', 'No se pudo cargar trustgate-widget-simple.js');
    };
    document.body.appendChild(script);
    this.scriptElement = script;
  }

  private initWidget(): void {
    try {
      // Verificar que el widget esté disponible
      // @ts-ignore
      if (typeof window.TrustGateSimpleWidget !== 'function') {
        this.addLogEntry('error', 'TrustGateSimpleWidget no está disponible. Verifica que el script se haya cargado correctamente.');
        return;
      }

      const widgetConfig: any = {
        clientKey: this.config.clientKey.trim(),
        apiUrl: this.config.apiUrl,
        targetId: 'trustgate-simple-widget',
        mode: this.config.mode,
        locale: this.config.locale,
        theme: {
          primaryColor: this.config.primaryColor,
          borderRadius: this.config.borderRadius,
          fontFamily: this.config.fontFamily
        },
        onSuccess: (data: any) => {
          this.addLogEntry('success', JSON.stringify(data, null, 2));
        },
        onError: (error: any) => {
          this.addLogEntry('error', JSON.stringify(error, null, 2));
        }
      };

      // Configurar finalidades y canales si hay seleccionados
      if (this.config.selectedFinalidades.length > 0) {
        widgetConfig.finalidadIds = this.config.selectedFinalidades;
      }
      if (this.config.selectedCanales.length > 0) {
        widgetConfig.canalIds = this.config.selectedCanales;
      }

      // Configurar callback para política de privacidad
      widgetConfig.onPrivacyPolicyClick = () => {
        this.addLogEntry('info', 'Callback onPrivacyPolicyClick ejecutado');
      };

      // @ts-ignore
      this.widgetInstance = new window.TrustGateSimpleWidget(widgetConfig);
      this.widgetInstance.init();
      this.addLogEntry('info', 'Widget inicializado correctamente');
    } catch (error: any) {
      this.addLogEntry('error', error.message || 'Error al inicializar el widget');
    }
  }

  buildIntegrationSnippet(): string {
    const lines: string[] = [];
    
    lines.push(`<!-- Contenedor del widget -->`);
    lines.push(`<div id="trustgate-simple-widget"></div>\n`);
    lines.push(`<!-- Script de configuración -->`);
    lines.push(`<script>`);
    lines.push(`  const widget = new TrustGateSimpleWidget({`);
    lines.push(`    clientKey: '${this.escapeForSnippet(this.config.clientKey.trim() || 'tgpub_xxxxxxxxxxxxxxxx')}',`);
    lines.push(`    apiUrl: '${this.escapeForSnippet(this.config.apiUrl || 'https://api.trustgate.cl')}',`);
    lines.push(`    targetId: 'trustgate-simple-widget',`);
    lines.push(`    mode: '${this.config.mode}',`);
    lines.push(`    locale: '${this.config.locale}',`);

    lines.push(`    `);
    lines.push(`    // Callback para política de privacidad personalizada`);
    lines.push(`    onPrivacyPolicyClick: () => {`);
    lines.push(`      // Abre tu modal de política de privacidad`);
    lines.push(`      openPrivacyModal();`);
    lines.push(`    },`);

    lines.push(`    `);
    lines.push(`    theme: {`);
    lines.push(`      primaryColor: '${this.escapeForSnippet(this.config.primaryColor)}',`);
    lines.push(`      borderRadius: '${this.escapeForSnippet(this.config.borderRadius)}',`);
    lines.push(`      fontFamily: '${this.escapeForSnippet(this.config.fontFamily)}'`);
    lines.push(`    },`);
    lines.push(`    `);
    lines.push(`    onSuccess: (data) => console.log('✅ Consentimiento registrado:', data),`);
    lines.push(`    onError: (error) => console.error('❌ Error:', error)`);
    lines.push(`  });`);
    lines.push(`  `);
    lines.push(`  widget.init();`);
    lines.push(`</script>\n`);
    lines.push(`<!-- Script del widget -->`);
    lines.push(`<script src="https://cdn.trustgate.cl/widget/simple/latest/trustgate-widget-simple.js"></script>`);

    return lines.join('\n');
  }

  async loadFinalidadesFromApi(): Promise<void> {
    if (!this.config.clientKey.trim() || !this.config.apiUrl.trim()) {
      return;
    }

    this.loadingFinalidades.set(true);
    this.loadingCanales.set(true);
    try {
      const response = await fetch(`${this.config.apiUrl}/api/v1/public/consent/purposes`, {
        headers: {
          'Content-Type': 'application/json',
          'x-client-key': this.config.clientKey.trim()
        }
      });
      
      if (response.ok) {
        const purposes = await response.json();
        
        // Extraer finalidades únicas
        const finalidades = purposes.map((p: any) => ({
          id: p.id,
          nombre: p.nombre,
          descripcion: p.descripcion
        }));
        
        // Extraer canales únicos (todas las finalidades tienen los mismos canales)
        const allCanales: any[] = [];
        const canalIds = new Set<number>();
        purposes.forEach((p: any) => {
          p.canales.forEach((c: any) => {
            if (!canalIds.has(c.id)) {
              canalIds.add(c.id);
              allCanales.push({
                id: c.id,
                nombre: c.nombre,
                icono: this.getChannelIcon(c.codigo),
                descripcion: `Mensajes vía ${c.nombre}`
              });
            }
          });
        });
        
        this.availableFinalidades.set(finalidades);
        this.availableCanales.set(allCanales);
        this.addLogEntry('info', `Cargadas ${finalidades.length} finalidades y ${allCanales.length} canales`);
      } else {
        this.addLogEntry('error', `Error al cargar datos: HTTP ${response.status}`);
      }
    } catch (error: any) {
      this.addLogEntry('error', `Error al cargar datos: ${error.message}`);
    } finally {
      this.loadingFinalidades.set(false);
      this.loadingCanales.set(false);
    }
  }

  async loadCanalesFromApi(): Promise<void> {
    // Ya no se necesita - se cargan junto con las finalidades
  }

  private getChannelIcon(codigo: string): string {
    const icons: Record<string, string> = {
      'whatsapp': '📱',
      'email': '📧',
      'sms': '💬',
      'messenger': '💬',
      'telegram': '✈️',
      'instagram': '📷',
      'web': '🌐'
    };
    return icons[codigo.toLowerCase()] || '📞';
  }

  toggleFinalidad(id: number, event: any): void {
    const checked = event.target.checked;
    if (checked) {
      if (!this.config.selectedFinalidades.includes(id)) {
        this.config.selectedFinalidades.push(id);
      }
    } else {
      this.config.selectedFinalidades = this.config.selectedFinalidades.filter(fid => fid !== id);
    }
  }

  toggleCanal(id: number, event: any): void {
    const checked = event.target.checked;
    if (checked) {
      if (!this.config.selectedCanales.includes(id)) {
        this.config.selectedCanales.push(id);
      }
    } else {
      this.config.selectedCanales = this.config.selectedCanales.filter(cid => cid !== id);
    }
  }

  private escapeForSnippet(value: string): string {
    return String(value || '')
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'");
  }

  resetWidget(): void {
    this.removeWidgetScript();
    const target = document.getElementById('trustgate-simple-widget');
    if (target) {
      target.innerHTML = '';
    }
    this.addLogEntry('info', 'Widget reseteado');
  }

  clearLog(): void {
    this.eventLog.set([]);
  }

  private removeWidgetScript(): void {
    if (this.widgetInstance && typeof this.widgetInstance.destroy === 'function') {
      this.widgetInstance.destroy();
    }

    if (this.scriptElement && this.scriptElement.parentNode) {
      this.scriptElement.parentNode.removeChild(this.scriptElement);
      this.scriptElement = null;
    }

    delete (window as any).TrustGateSimpleWidget;
    delete (window as any).TrustGateSimpleConfig;
    this.widgetInstance = null;
  }

  private addLogEntry(type: string, data: string): void {
    const entry: EventLogEntry = {
      id: ++this.eventLogSequence,
      timestamp: new Date().toLocaleTimeString('es-CL'),
      type,
      data
    };
    this.eventLog.update((log) => [entry, ...log]);
  }
}
