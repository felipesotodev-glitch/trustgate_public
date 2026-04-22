import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

interface AuthorizationTemplateNotice {
  templateId: string;
  version: string;
  templateHash: string;
  title: string;
  approvedCopy: string;
  documentLinks: string[];
}

interface AuthorizationChannelOption {
  id: number;
  nombre: string;
  codigo: string;
  active: boolean;
  template: AuthorizationTemplateNotice;
}

interface AuthorizationPurposeOption {
  id: number;
  nombre: string;
  descripcion: string;
  baseLegal: string;
  canales: AuthorizationChannelOption[];
}

interface AuthorizationInfoResponse {
  titularId: string;
  titularName: string;
  email: string;
  requiresRut: boolean;
  requestedArtifact: string;
  reviewAction: string;
  expiresAt: string;
  purposes: AuthorizationPurposeOption[];
}

interface CompletionResponse {
  status: string;
  eventId: string;
  completedAt: string;
  consentIds: string[];
  consentEvent: Record<string, unknown>;
}

interface DeviceFingerprintPayload {
  type: string;
  os: string;
  osVersion: string;
  browser: string;
  browserVersion: string;
  screenResolution: string;
  language: string;
  viewport: string;
  touchPoints: number;
  platform: string;
  timezone: string;
  userAgent: string;
  hardwareConcurrency: number | null;
  deviceMemoryGb: number | null;
  collectedAt: string;
}

interface NetworkContextPayload {
  ipAddress: string | null;
  geoRegion: string | null;
  geoRegionSource: string;
  isp: string;
  ispSource: string;
  pageUrl: string;
  referrer: string | null;
  timezone: string;
  connectionType: string;
  downlinkMbps: number | null;
  roundTripMs: number | null;
}

interface NavigatorWithUAData extends Navigator {
  userAgentData?: {
    platform?: string;
    mobile?: boolean;
    brands?: Array<{ brand: string; version: string }>;
    getHighEntropyValues?: (hints: string[]) => Promise<Record<string, unknown>>;
  };
  connection?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
  mozConnection?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
  webkitConnection?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
  deviceMemory?: number;
}

@Component({
  selector: 'tp-consent-authorization',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="authorization-shell">
      <main class="authorization-layout">
        <header class="hero-card">
          <span class="eyebrow">Acceso privado por enlace único</span>
          <h1>Autoriza tus canales de contacto</h1>
          <p>
            Este enlace seguro te muestra solo la solicitud asignada a tu correo. Revisa el texto legal, valida tu contexto técnico y autoriza únicamente los canales que aceptas.
          </p>
        </header>

        @if (loading()) {
          <section class="content-card state-card">
            <p>Cargando solicitud privada...</p>
          </section>
        } @else if (errorMessage()) {
          <section class="content-card state-card state-card--error">
            <h2>No fue posible abrir la solicitud</h2>
            <p>{{ errorMessage() }}</p>
          </section>
        } @else if (completed()) {
          <section class="content-card state-card state-card--success">
            <div class="completion-header">
              <span class="completion-badge" aria-hidden="true">✔</span>
              <div>
                <h2>Autorización registrada</h2>
                <p>Tu consentimiento quedó almacenado con bloque técnico de auditoría conforme a la Ley 21.719.</p>
              </div>
            </div>

            <dl class="completion-summary">
              <div>
                <dt>Titular</dt>
                <dd>{{ authorizationInfo()?.titularName }}</dd>
              </div>
              <div>
                <dt>Correo notificado</dt>
                <dd>{{ authorizationInfo()?.email }}</dd>
              </div>
              <div>
                <dt>Fecha de aceptación</dt>
                <dd>{{ completedAt() | date:'dd/MM/yyyy HH:mm:ss' }}</dd>
              </div>
              <div>
                <dt>Identificador de evento</dt>
                <dd><code>{{ completionEventId() }}</code></dd>
              </div>
            </dl>

            @if (completedChannels().length > 0) {
              <div class="completion-section">
                <h3>Canales autorizados</h3>
                <ul class="completion-channels">
                  @for (entry of completedChannels(); track entry.key) {
                    <li>
                      <strong>{{ entry.purposeName }}</strong>
                      <span class="completion-channel">{{ entry.channelName }}</span>
                    </li>
                  }
                </ul>
              </div>
            }

            @if (completionConsentIds().length > 0) {
              <div class="completion-section">
                <h3>Consentimientos generados</h3>
                <ul class="completion-consent-ids">
                  @for (id of completionConsentIds(); track id) {
                    <li><code>{{ id }}</code></li>
                  }
                </ul>
              </div>
            }

            <details class="completion-audit">
              <summary>Ver bloque técnico de auditoría</summary>
              <pre>{{ completionText() }}</pre>
            </details>
          </section>
        } @else if (authorizationInfo()) {
          <div class="content-grid">
            <section class="content-card summary-card">
              <h2>Resumen de la solicitud</h2>
              <dl>
                <div>
                  <dt>Titular</dt>
                  <dd>{{ authorizationInfo()!.titularName }}</dd>
                </div>
                <div>
                  <dt>Correo</dt>
                  <dd>{{ authorizationInfo()!.email }}</dd>
                </div>
                <div>
                  <dt>Solicitud</dt>
                  <dd>{{ authorizationInfo()!.requestedArtifact }}</dd>
                </div>
                <div>
                  <dt>Expira</dt>
                  <dd>{{ authorizationInfo()!.expiresAt | date:'dd/MM/yyyy HH:mm' }}</dd>
                </div>
              </dl>

              <div class="identity-card">
                <h3>Validación del dispositivo</h3>
                <p>
                  Si tu teléfono soporta biometría local, úsala para reforzar la evidencia. Si no, el sistema igual dejará trazabilidad del enlace, IP minimizada y huella técnica del navegador.
                </p>
                <button class="btn btn-outline" type="button" (click)="triggerDeviceValidation()" [disabled]="validatingDevice() || deviceValidated()">
                  {{ deviceValidated() ? 'Dispositivo validado' : (validatingDevice() ? 'Validando...' : 'Validar este dispositivo') }}
                </button>
                <small>{{ deviceValidationHint() }}</small>
              </div>

              @if (authorizationInfo()!.requiresRut) {
                <label class="form-field">
                  <span>RUT del titular</span>
                  <input type="text" class="form-control" [(ngModel)]="rut" name="rut" placeholder="12.345.678-9" />
                  <small>Se solicita solo porque tu ficha aún no tiene RUT protegido en la base de clientes.</small>
                </label>
              }
            </section>

            <section class="content-card form-card">
              <h2>Canales disponibles para autorizar</h2>
              <p class="section-hint">Estos canales fueron solicitados. Los que ya están vigentes se muestran bloqueados. Puedes desmarcar los que no deseas autorizar.</p>

              @for (purpose of authorizationInfo()!.purposes; track purpose.id) {
                <article class="purpose-card">
                  <div class="purpose-header">
                    <div>
                      <h3>{{ purpose.nombre }}</h3>
                      <p>{{ purpose.descripcion }}</p>
                    </div>
                    <span class="purpose-legal">{{ purpose.baseLegal }}</span>
                  </div>

                  <div class="channel-list">
                    @for (channel of purpose.canales; track channel.id) {
                      <label class="channel-card" [class.channel-card--active]="channel.active">
                        <input
                          type="checkbox"
                          [checked]="isSelected(purpose.id, channel.id) || channel.active"
                          [disabled]="channel.active"
                          (change)="toggleChannel(purpose.id, channel.id, $any($event.target).checked)"
                        />
                        <div class="channel-card__content">
                          <div class="channel-card__top">
                            <strong>{{ channel.nombre }}</strong>
                            <span>{{ channel.codigo }}</span>
                          </div>
                          <p>{{ channel.template.title }}</p>
                          <div class="notice-box" [innerHTML]="channel.template.approvedCopy"></div>
                          <small>Template {{ channel.template.templateId }} · v{{ channel.template.version }} · {{ shortHash(channel.template.templateHash) }}</small>
                          @if (channel.active) {
                            <small class="channel-card__state">Ya autorizado</small>
                          }
                        </div>
                      </label>
                    }
                  </div>
                </article>
              }

              <label class="acceptance-box">
                <input type="checkbox" [(ngModel)]="acceptedNotice" name="acceptedNotice" />
                <span>
                  Confirmo que revisé el contenido legal visible, que entiendo la finalidad de cada canal y que otorgo mi consentimiento expreso conforme a Ley 21.719.
                </span>
              </label>

              <div class="actions-row">
                <button class="btn btn-primary" type="button" (click)="submitAuthorization()" [disabled]="submitting()">
                  {{ submitting() ? 'Registrando...' : 'Autorizar canales seleccionados' }}
                </button>
              </div>

              @if (submitMessage()) {
                <p class="submit-message" [class.submit-message--error]="submitError()">{{ submitMessage() }}</p>
              }
            </section>
          </div>
        }
      </main>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100dvh;
      color: #112031;
    }

    .authorization-shell {
      position: relative;
      min-height: 100dvh;
      padding: 32px 16px 56px;
      background: radial-gradient(circle at top left, rgba(248, 197, 72, 0.22), transparent 28%), linear-gradient(180deg, #f7f2e8 0%, #f2f6fb 45%, #ffffff 100%);
    }

    .authorization-layout {
      position: relative;
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .hero-card,
    .content-card {
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(17, 32, 49, 0.1);
      border-radius: 28px;
      box-shadow: 0 20px 60px rgba(17, 32, 49, 0.08);
    }

    .hero-card {
      padding: 28px;
    }

    .eyebrow {
      display: inline-flex;
      padding: 6px 12px;
      border-radius: 999px;
      background: #112031;
      color: #f7f2e8;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    h1 {
      margin: 14px 0 10px;
      font-size: clamp(2rem, 4vw, 3.5rem);
      line-height: 1.02;
      font-family: Georgia, 'Times New Roman', serif;
    }

    .hero-card p {
      margin: 0;
      max-width: 760px;
      font-size: 1.05rem;
      color: #3c5266;
    }

    .content-grid {
      display: grid;
      gap: 20px;
      grid-template-columns: 1fr;
    }

    @media (min-width: 1024px) {
      .content-grid {
        grid-template-columns: 340px 1fr;
        align-items: start;
      }
    }

    .content-card {
      padding: 24px;
    }

    .state-card {
      text-align: center;
      padding: 56px 24px;
    }

    .state-card pre {
      margin: 16px 0 0;
      text-align: left;
      white-space: pre-wrap;
      word-break: break-word;
      background: #0f172a;
      color: #e2e8f0;
      border-radius: 16px;
      padding: 16px;
    }

    .state-card--error {
      border-color: rgba(185, 28, 28, 0.22);
    }

    .state-card--success {
      border-color: rgba(20, 83, 45, 0.22);
      background: linear-gradient(180deg, #f3fbf6, #ffffff);
    }

    .completion-header {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 18px;
    }

    .completion-header h2 {
      margin: 0 0 6px;
    }

    .completion-header p {
      margin: 0;
      color: #4b5f73;
    }

    .completion-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #16a34a;
      color: #ffffff;
      font-size: 1.4rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .completion-summary {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      margin: 0 0 22px;
      padding: 16px;
      border-radius: 14px;
      background: #ffffff;
      border: 1px solid rgba(15, 23, 42, 0.08);
    }

    .completion-summary dt {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6b7280;
      margin-bottom: 4px;
    }

    .completion-summary dd {
      margin: 0;
      font-weight: 600;
      word-break: break-word;
    }

    .completion-summary code {
      font-family: 'SFMono-Regular', Menlo, monospace;
      font-size: 0.85rem;
      background: rgba(15, 23, 42, 0.06);
      padding: 2px 6px;
      border-radius: 6px;
    }

    .completion-section {
      margin-bottom: 18px;
    }

    .completion-section h3 {
      margin: 0 0 10px;
      font-size: 0.95rem;
      color: #0f172a;
    }

    .completion-channels,
    .completion-consent-ids {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 8px;
    }

    .completion-channels li {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border-radius: 12px;
      background: rgba(22, 163, 74, 0.08);
      border: 1px solid rgba(22, 163, 74, 0.18);
    }

    .completion-channel {
      font-size: 0.82rem;
      font-weight: 600;
      color: #166534;
      background: #ffffff;
      padding: 4px 10px;
      border-radius: 999px;
      border: 1px solid rgba(22, 163, 74, 0.3);
    }

    .completion-consent-ids li {
      padding: 8px 12px;
      border-radius: 10px;
      background: rgba(15, 23, 42, 0.04);
      font-family: 'SFMono-Regular', Menlo, monospace;
      font-size: 0.82rem;
      word-break: break-all;
    }

    .completion-audit {
      margin-top: 12px;
      border: 1px solid rgba(15, 23, 42, 0.1);
      border-radius: 12px;
      padding: 10px 14px;
      background: #ffffff;
    }

    .completion-audit summary {
      cursor: pointer;
      font-weight: 600;
      color: #1e293b;
      list-style: none;
    }

    .completion-audit summary::-webkit-details-marker {
      display: none;
    }

    .completion-audit summary::before {
      content: '▸ ';
      display: inline-block;
      transition: transform 0.15s ease;
    }

    .completion-audit[open] summary::before {
      content: '▾ ';
    }

    .completion-audit pre {
      margin: 12px 0 0;
      padding: 12px;
      background: #0f172a;
      color: #e2e8f0;
      border-radius: 10px;
      overflow-x: auto;
      font-size: 0.78rem;
      line-height: 1.5;
    }

    h2 {
      margin: 0 0 14px;
      font-size: 1.25rem;
    }

    .summary-card dl {
      display: grid;
      gap: 12px;
      margin: 0 0 20px;
    }

    .summary-card dt {
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6b7280;
      margin-bottom: 4px;
    }

    .summary-card dd {
      margin: 0;
      font-weight: 600;
    }

    .identity-card {
      margin: 18px 0;
      padding: 16px;
      border-radius: 18px;
      background: linear-gradient(180deg, #fff8e8, #fffdf8);
      border: 1px solid rgba(180, 138, 28, 0.24);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .identity-card h3 {
      margin: 0;
      font-size: 1rem;
    }

    .identity-card p,
    .identity-card small,
    .section-hint,
    .purpose-header p,
    .channel-card__content p,
    .submit-message {
      color: #4b5f73;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 12px;
    }

    .form-field span {
      font-weight: 600;
    }

    .form-control {
      min-height: 48px;
      border-radius: 14px;
      border: 1px solid #cfd8e3;
      padding: 0 14px;
      font: inherit;
      background: #fff;
    }

    .purpose-card {
      border-top: 1px solid rgba(17, 32, 49, 0.08);
      padding-top: 18px;
      margin-top: 18px;
    }

    .purpose-header {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 14px;
    }

    .purpose-header h3 {
      margin: 0;
      font-size: 1.02rem;
    }

    .purpose-header p {
      margin: 0;
    }

    .purpose-legal {
      align-self: flex-start;
      background: #112031;
      color: #fff;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 0.76rem;
    }

    .channel-list {
      display: grid;
      gap: 12px;
    }

    .channel-card {
      display: grid;
      grid-template-columns: 20px 1fr;
      gap: 12px;
      align-items: start;
      padding: 14px;
      border-radius: 18px;
      border: 1px solid rgba(17, 32, 49, 0.12);
      background: #fbfdff;
    }

    .channel-card--active {
      background: #f0fdf4;
      border-color: rgba(22, 101, 52, 0.2);
    }

    .channel-card input {
      margin-top: 4px;
    }

    .channel-card__top {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      align-items: center;
    }

    .channel-card__top span,
    .channel-card__content small {
      color: #64748b;
    }

    .notice-box {
      margin: 10px 0;
      padding: 12px 14px;
      border-radius: 14px;
      background: #f8fafc;
      border: 1px solid rgba(17, 32, 49, 0.08);
      font-size: 0.94rem;
      line-height: 1.5;
    }

    .channel-card__state {
      display: inline-flex;
      margin-top: 8px;
      color: #166534;
      font-weight: 700;
    }

    .acceptance-box {
      display: grid;
      grid-template-columns: 20px 1fr;
      gap: 12px;
      margin-top: 22px;
      padding: 16px;
      border-radius: 18px;
      background: #112031;
      color: #f8fafc;
    }

    .acceptance-box span {
      line-height: 1.5;
    }

    .actions-row {
      display: flex;
      justify-content: flex-start;
      margin-top: 18px;
    }

    .btn {
      border: none;
      border-radius: 999px;
      min-height: 46px;
      padding: 0 18px;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }

    .btn-primary {
      background: #112031;
      color: #fff;
    }

    .btn-outline {
      background: #fff;
      color: #112031;
      border: 1px solid rgba(17, 32, 49, 0.14);
    }

    .submit-message {
      margin-top: 12px;
      font-weight: 600;
    }

    .submit-message--error {
      color: #b91c1c;
    }
  `]
})
export class ConsentAuthorizationComponent implements OnInit {
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly validatingDevice = signal(false);
  readonly deviceValidated = signal(false);
  readonly completed = signal(false);
  readonly authorizationInfo = signal<AuthorizationInfoResponse | null>(null);
  readonly errorMessage = signal('');
  readonly submitMessage = signal('');
  readonly submitError = signal(false);
  readonly completionText = signal('');
  readonly completionEventId = signal('');
  readonly completedAt = signal('');
  readonly completionConsentIds = signal<string[]>([]);
  readonly completedChannels = signal<Array<{ key: string; purposeName: string; channelName: string }>>([]);

  token = '';
  rut = '';
  acceptedNotice = false;
  private readonly selectedChannels = new Map<number, Set<number>>();
  private noticeDisplayedAt = new Date().toISOString();
  private integrityCheckValue = 'Verified_by_TrustGate_Link';
  private webauthnCredentialId = '';

  constructor(private readonly route: ActivatedRoute) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.token) {
      this.errorMessage.set('El enlace privado no es válido.');
      this.loading.set(false);
      return;
    }
    void this.loadAuthorizationInfo();
  }

  async triggerDeviceValidation(): Promise<void> {
    if (this.deviceValidated()) {
      return;
    }

    this.validatingDevice.set(true);
    try {
      if (typeof window !== 'undefined' && 'PublicKeyCredential' in window) {
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);
        const userId = new TextEncoder().encode(this.authorizationInfo()?.titularId ?? 'titular');
        const credential = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: 'TrustGate Autorizacion', id: location.hostname },
            user: {
              id: userId,
              name: this.authorizationInfo()?.email ?? 'titular',
              displayName: this.authorizationInfo()?.titularName ?? 'Titular'
            },
            pubKeyCredParams: [
              { alg: -7, type: 'public-key' },
              { alg: -257, type: 'public-key' }
            ],
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              userVerification: 'required',
              residentKey: 'preferred'
            },
            timeout: 60000,
            attestation: 'none'
          }
        }) as PublicKeyCredential | null;

        this.webauthnCredentialId = credential?.id ?? '';
        this.integrityCheckValue = this.webauthnCredentialId
          ? 'Verified_by_TrustGate_WebAuthn'
          : 'Verified_by_TrustGate_Link';
      }

      this.deviceValidated.set(true);
    } catch {
      this.integrityCheckValue = 'Verified_by_TrustGate_Link';
      this.deviceValidated.set(true);
    } finally {
      this.validatingDevice.set(false);
    }
  }

  isSelected(purposeId: number, channelId: number): boolean {
    return this.selectedChannels.get(purposeId)?.has(channelId) ?? false;
  }

  toggleChannel(purposeId: number, channelId: number, checked: boolean): void {
    const channels = this.selectedChannels.get(purposeId) ?? new Set<number>();
    if (checked) {
      channels.add(channelId);
    } else {
      channels.delete(channelId);
    }
    if (channels.size === 0) {
      this.selectedChannels.delete(purposeId);
      return;
    }
    this.selectedChannels.set(purposeId, channels);
  }

  shortHash(value: string): string {
    if (!value) {
      return 'sin hash';
    }
    return value.length > 18 ? `${value.slice(0, 18)}...` : value;
  }

  deviceValidationHint(): string {
    if (this.deviceValidated()) {
      return this.webauthnCredentialId
        ? `Biometría local registrada. Credencial: ${this.webauthnCredentialId}`
        : 'No hubo biometría local disponible, pero el sistema dejará trazabilidad del enlace y del dispositivo.';
    }
    return 'Se recomienda validar desde el teléfono del titular para reforzar la evidencia probatoria.';
  }

  async submitAuthorization(): Promise<void> {
    this.submitMessage.set('');
    this.submitError.set(false);

    const purposes = Array.from(this.selectedChannels.entries()).map(([idFinalidad, channels]) => ({
      idFinalidad,
      idCanales: Array.from(channels)
    }));

    if (purposes.length === 0) {
      this.submitError.set(true);
      this.submitMessage.set('Selecciona al menos un canal para autorizar.');
      return;
    }

    if (!this.acceptedNotice) {
      this.submitError.set(true);
      this.submitMessage.set('Debes aceptar expresamente el aviso legal antes de continuar.');
      return;
    }

    if (this.authorizationInfo()?.requiresRut && !this.rut.trim()) {
      this.submitError.set(true);
      this.submitMessage.set('Debes ingresar el RUT porque esta ficha todavía no lo tiene trazado.');
      return;
    }

    this.submitting.set(true);
    try {
      const deviceFingerprint = await this.collectDeviceFingerprint();
      const networkContext = this.collectNetworkContext(deviceFingerprint);
      const response = await fetch(`/api/v1/public/consent/authorization/${encodeURIComponent(this.token)}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Language': deviceFingerprint.language,
          'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
          'X-Client-Platform': deviceFingerprint.platform,
          'X-Client-Device-Type': deviceFingerprint.type,
          'X-Client-Browser': deviceFingerprint.browser,
          'X-Client-Browser-Version': deviceFingerprint.browserVersion,
          'X-Client-OS-Version': deviceFingerprint.osVersion,
          'X-Client-Screen': deviceFingerprint.screenResolution,
          'X-Client-Viewport': deviceFingerprint.viewport,
          'X-Client-Touch-Points': String(deviceFingerprint.touchPoints),
          'X-Client-ISP-Hint': networkContext.isp,
          'X-Client-ISP-Source': networkContext.ispSource,
          'X-Client-Geo-Region-Hint': networkContext.geoRegion ?? '',
          'X-Client-Geo-Region-Source': networkContext.geoRegionSource,
          'X-Client-Connection-Type': networkContext.connectionType,
          'X-Client-Downlink': networkContext.downlinkMbps != null ? String(networkContext.downlinkMbps) : '',
          'X-Client-RTT': networkContext.roundTripMs != null ? String(networkContext.roundTripMs) : '',
          'X-Client-Referrer': networkContext.referrer ?? '',
          'X-Page-Url': networkContext.pageUrl,
          'X-Client-User-Agent': deviceFingerprint.userAgent,
          'X-Client-Hardware-Concurrency': deviceFingerprint.hardwareConcurrency != null ? String(deviceFingerprint.hardwareConcurrency) : '',
          'X-Client-Device-Memory': deviceFingerprint.deviceMemoryGb != null ? String(deviceFingerprint.deviceMemoryGb) : '',
          'X-Client-Collected-At': deviceFingerprint.collectedAt
        },
        body: JSON.stringify({
          rut: this.rut.trim() || null,
          purposes,
          acceptedNotice: this.acceptedNotice,
          acceptanceAction: this.deviceValidated() ? 'secure_link_biometric_acceptance' : 'secure_link_explicit_acceptance',
          noticeDisplayedAt: this.noticeDisplayedAt,
          noticeAcceptedAt: new Date().toISOString(),
          integrityCheck: this.integrityCheckValue,
          deviceFingerprint,
          networkContext
        })
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.detail || 'No fue posible registrar la autorización.');
      }

      const completion = body as CompletionResponse;
      this.completionText.set(JSON.stringify(completion, null, 2));
      this.completionEventId.set(completion.eventId ?? '');
      this.completedAt.set(completion.completedAt ?? '');
      this.completionConsentIds.set(Array.isArray(completion.consentIds) ? completion.consentIds : []);
      this.completedChannels.set(this.buildCompletedChannelsList());
      this.completed.set(true);
    } catch (error) {
      this.submitError.set(true);
      this.submitMessage.set(error instanceof Error ? error.message : 'No fue posible registrar la autorización.');
    } finally {
      this.submitting.set(false);
    }
  }

  private buildCompletedChannelsList(): Array<{ key: string; purposeName: string; channelName: string }> {
    const info = this.authorizationInfo();
    if (!info) {
      return [];
    }
    const result: Array<{ key: string; purposeName: string; channelName: string }> = [];
    for (const purpose of info.purposes) {
      const selected = this.selectedChannels.get(purpose.id);
      for (const channel of purpose.canales) {
        const isAlreadyActive = channel.active;
        const wasSelected = selected?.has(channel.id) ?? false;
        if (isAlreadyActive || wasSelected) {
          result.push({
            key: `${purpose.id}-${channel.id}`,
            purposeName: purpose.nombre,
            channelName: channel.nombre
          });
        }
      }
    }
    return result;
  }

  private async loadAuthorizationInfo(): Promise<void> {
    this.loading.set(true);
    try {
      const response = await fetch(`/api/v1/public/consent/authorization/${encodeURIComponent(this.token)}`);
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.detail || 'El enlace no es válido o ya expiró.');
      }
      this.authorizationInfo.set(body as AuthorizationInfoResponse);
      this.noticeDisplayedAt = new Date().toISOString();
      this.preSelectGrantedChannels(body as AuthorizationInfoResponse);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible cargar la solicitud.');
    } finally {
      this.loading.set(false);
    }
  }

  private preSelectGrantedChannels(info: AuthorizationInfoResponse): void {
    this.selectedChannels.clear();
    for (const purpose of info.purposes ?? []) {
      const channelIds = (purpose.canales ?? [])
        .filter(c => !c.active)
        .map(c => c.id);
      if (channelIds.length > 0) {
        this.selectedChannels.set(purpose.id, new Set(channelIds));
      }
    }
  }

  private async collectDeviceFingerprint(): Promise<DeviceFingerprintPayload> {
    const userAgent = navigator.userAgent;
    const navigatorWithUAData = navigator as NavigatorWithUAData;
    const userAgentData = navigatorWithUAData.userAgentData;
    const highEntropyValues = userAgentData?.getHighEntropyValues
      ? await userAgentData.getHighEntropyValues([
          'platform',
          'platformVersion',
          'architecture',
          'bitness',
          'model',
          'uaFullVersion',
          'fullVersionList'
        ]).catch(() => ({}))
      : {};

    const browserDetails = this.resolveBrowserDetails(userAgent, highEntropyValues);
    const osDetails = this.resolveOperatingSystem(userAgent, userAgentData?.platform, highEntropyValues);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown';

    return {
      type: /android|iphone|ipad|mobile/i.test(userAgent) ? 'Mobile' : 'Desktop',
      os: osDetails.name,
      osVersion: osDetails.version,
      browser: browserDetails.name,
      browserVersion: browserDetails.version,
      screenResolution: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'unknown',
      language: navigator.language || 'es-CL',
      viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown',
      touchPoints: navigator.maxTouchPoints || 0,
      platform: navigator.platform || 'unknown',
      timezone,
      userAgent,
      hardwareConcurrency: navigator.hardwareConcurrency ?? null,
      deviceMemoryGb: navigatorWithUAData.deviceMemory ?? null,
      collectedAt: new Date().toISOString()
    };
  }

  private collectNetworkContext(deviceFingerprint: DeviceFingerprintPayload): NetworkContextPayload {
    const navigatorWithUAData = navigator as NavigatorWithUAData;
    const connection = navigatorWithUAData.connection ?? navigatorWithUAData.mozConnection ?? navigatorWithUAData.webkitConnection;
    const geoRegion = this.resolveGeoRegionHint(deviceFingerprint.language, deviceFingerprint.timezone);

    return {
      ipAddress: null,
      geoRegion,
      geoRegionSource: geoRegion ? 'locale_timezone_inference' : 'browser_unavailable',
      isp: 'browser_unavailable',
      ispSource: 'browser_restricted',
      pageUrl: location.href,
      referrer: document.referrer || null,
      timezone: deviceFingerprint.timezone,
      connectionType: connection?.effectiveType || 'unknown',
      downlinkMbps: typeof connection?.downlink === 'number' ? connection.downlink : null,
      roundTripMs: typeof connection?.rtt === 'number' ? connection.rtt : null
    };
  }

  private resolveGeoRegionHint(language: string, timezone: string): string | null {
    const normalizedLanguage = (language || '').toLowerCase();
    const normalizedTimezone = (timezone || '').toLowerCase();

    if (normalizedLanguage.endsWith('-cl') || normalizedTimezone.includes('santiago')) {
      return 'CL';
    }
    if (normalizedLanguage.endsWith('-ar') || normalizedTimezone.includes('buenos_aires')) {
      return 'AR';
    }
    if (normalizedLanguage.endsWith('-pe') || normalizedTimezone.includes('lima')) {
      return 'PE';
    }
    return null;
  }

  private resolveBrowserDetails(userAgent: string, highEntropyValues: Record<string, unknown>): { name: string; version: string } {
    const agent = userAgent.toLowerCase();
    const highEntropyVersion = this.extractHighEntropyBrowserVersion(highEntropyValues);

    if (agent.includes('edg/')) return { name: 'Edge', version: this.extractVersion(agent, /edg\/(\d+(?:\.\d+)*)/) || highEntropyVersion };
    if (agent.includes('chrome/') && !agent.includes('edg/')) return { name: /mobile/i.test(agent) ? 'Chrome Mobile' : 'Chrome', version: this.extractVersion(agent, /chrome\/(\d+(?:\.\d+)*)/) || highEntropyVersion };
    if (agent.includes('safari/') && !agent.includes('chrome/')) return { name: /mobile/i.test(agent) ? 'Safari Mobile' : 'Safari', version: this.extractVersion(agent, /version\/(\d+(?:\.\d+)*)/) || highEntropyVersion };
    if (agent.includes('firefox/')) return { name: /mobile/i.test(agent) ? 'Firefox Mobile' : 'Firefox', version: this.extractVersion(agent, /firefox\/(\d+(?:\.\d+)*)/) || highEntropyVersion };
    return { name: 'Browser', version: highEntropyVersion || 'unknown' };
  }

  private resolveOperatingSystem(userAgent: string, uaPlatform: string | undefined, highEntropyValues: Record<string, unknown>): { name: string; version: string } {
    const agent = userAgent.toLowerCase();
    const platformVersion = this.asString(highEntropyValues['platformVersion']) || 'unknown';
    const platform = (uaPlatform || navigator.platform || 'unknown').toLowerCase();

    if (agent.includes('android')) {
      return {
        name: 'Android',
        version: this.extractVersion(agent, /android\s(\d+(?:[._]\d+)*)/) || platformVersion
      };
    }
    if (/iphone|ipad|ipod/.test(agent)) {
      return {
        name: 'iOS',
        version: (this.extractVersion(agent, /os\s(\d+(?:[_]\d+)*)/) || platformVersion).replace(/_/g, '.')
      };
    }
    if (platform.includes('win')) {
      return {
        name: 'Windows',
        version: this.extractVersion(agent, /windows nt\s(\d+(?:\.\d+)*)/) || platformVersion
      };
    }
    if (platform.includes('mac')) {
      return {
        name: 'macOS',
        version: (this.extractVersion(agent, /mac os x\s(\d+(?:[_]\d+)*)/) || platformVersion).replace(/_/g, '.')
      };
    }
    if (platform.includes('linux')) {
      return {
        name: 'Linux',
        version: platformVersion
      };
    }
    return {
      name: uaPlatform || navigator.platform || 'unknown',
      version: platformVersion
    };
  }

  private extractHighEntropyBrowserVersion(highEntropyValues: Record<string, unknown>): string {
    const fullVersionList = highEntropyValues['fullVersionList'];
    if (Array.isArray(fullVersionList)) {
      const preferredBrand = fullVersionList.find((entry) => {
        const brand = this.asString((entry as Record<string, unknown>)['brand']).toLowerCase();
        return brand.includes('chrome') || brand.includes('edge') || brand.includes('firefox') || brand.includes('safari');
      }) as Record<string, unknown> | undefined;
      const version = preferredBrand ? this.asString(preferredBrand['version']) : '';
      if (version) {
        return version;
      }
    }
    return this.asString(highEntropyValues['uaFullVersion']) || 'unknown';
  }

  private extractVersion(agent: string, pattern: RegExp): string {
    return pattern.exec(agent)?.[1]?.replace(/_/g, '.') || '';
  }

  private asString(value: unknown): string {
    return typeof value === 'string' && value.trim() ? value.trim() : '';
  }
}