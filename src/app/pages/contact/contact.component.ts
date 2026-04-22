import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface ContactForm {
  name: string;
  company: string;
  email: string;
  integrationType: string;
  message: string;
}

@Component({
  selector: 'tp-contact',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <section class="section">
      <div class="container contact-layout">

        <!-- Header -->
        <header class="contact-header">
          <span class="badge badge-primary">Solicitud de acceso</span>
          <h1>Solicitar acceso a TrustGate</h1>
          <p class="contact-header__lead">
            Completa el formulario y el equipo de TrustGate se pondrá en contacto contigo en un plazo de 24-48 horas hábiles.
          </p>
        </header>

        <div class="contact-body">
          <!-- Form -->
          <div class="contact-form-wrapper">
            @if (!submitted()) {
              <form
                class="contact-form card"
                (ngSubmit)="submitForm()"
                #contactForm="ngForm"
                novalidate
                aria-label="Formulario de solicitud de acceso"
              >
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label" for="contactName">
                      Nombre completo <span class="required" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="contactName"
                      type="text"
                      class="form-control"
                      [(ngModel)]="form.name"
                      name="contactName"
                      placeholder="Juan Pérez"
                      required
                      #nameInput="ngModel"
                    />
                    @if (nameInput.invalid && (nameInput.dirty || submitted())) {
                      <span class="field-error">Este campo es requerido</span>
                    }
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="contactCompany">
                      Empresa <span class="required" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="contactCompany"
                      type="text"
                      class="form-control"
                      [(ngModel)]="form.company"
                      name="contactCompany"
                      placeholder="Acme S.A."
                      required
                      #companyInput="ngModel"
                    />
                    @if (companyInput.invalid && (companyInput.dirty || submitted())) {
                      <span class="field-error">Este campo es requerido</span>
                    }
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label" for="contactEmail">
                    Email corporativo <span class="required" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="contactEmail"
                    type="email"
                    class="form-control"
                    [(ngModel)]="form.email"
                    name="contactEmail"
                    placeholder="juan.perez@empresa.cl"
                    required
                    email
                    #emailInput="ngModel"
                  />
                  @if (emailInput.invalid && (emailInput.dirty || submitted())) {
                    <span class="field-error">Ingresa un email válido</span>
                  }
                </div>

                <div class="form-group">
                  <label class="form-label" for="integrationType">
                    Tipo de integración <span class="required" aria-hidden="true">*</span>
                  </label>
                  <select
                    id="integrationType"
                    class="form-control"
                    [(ngModel)]="form.integrationType"
                    name="integrationType"
                    required
                    #typeInput="ngModel"
                  >
                    <option value="" disabled>Selecciona una opción</option>
                    <option value="widget">Widget embebible</option>
                    <option value="api">REST API</option>
                    <option value="both">Ambos</option>
                  </select>
                  @if (typeInput.invalid && (typeInput.dirty || submitted())) {
                    <span class="field-error">Selecciona un tipo de integración</span>
                  }
                </div>

                <div class="form-group">
                  <label class="form-label" for="contactMessage">
                    Mensaje / caso de uso <span class="required" aria-hidden="true">*</span>
                  </label>
                  <textarea
                    id="contactMessage"
                    class="form-control contact-textarea"
                    [(ngModel)]="form.message"
                    name="contactMessage"
                    placeholder="Describe tu caso de uso y qué tipo de datos necesitas gestionar..."
                    required
                    rows="5"
                    #messageInput="ngModel"
                  ></textarea>
                  @if (messageInput.invalid && (messageInput.dirty || submitted())) {
                    <span class="field-error">Este campo es requerido</span>
                  }
                </div>

                @if (submitError()) {
                  <div class="contact-form__error" role="alert">
                    {{ submitError() }}
                  </div>
                }

                <div class="contact-form__footer">
                  <p class="contact-form__privacy">
                    Al enviar este formulario, aceptas que TrustGate procese tus datos para atender tu solicitud, conforme a nuestra política de privacidad.
                  </p>
                  <button
                    type="submit"
                    class="btn btn-primary btn-lg"
                    [disabled]="contactForm.invalid || submitting()"
                  >
                    {{ submitting() ? 'Enviando...' : 'Enviar solicitud' }}
                  </button>
                </div>
              </form>
            } @else {
              <div class="contact-success card" role="alert" aria-live="polite">
                <span class="contact-success__icon" aria-hidden="true">✅</span>
                <h2>¡Solicitud enviada!</h2>
                <p>
                  Hemos recibido tu solicitud. El equipo de TrustGate se pondrá en contacto con
                  <strong>{{ form.email }}</strong> en un plazo de <strong>24-48 horas hábiles</strong>.
                </p>
                <button class="btn btn-secondary" (click)="resetForm()">
                  Enviar otra solicitud
                </button>
              </div>
            }
          </div>

          <!-- Contact info -->
          <aside class="contact-info" aria-label="Información de contacto">
            <div class="contact-info__block card">
              <h3>Información de contacto</h3>
              <ul class="contact-info__list" role="list">
                <li>
                  <span class="contact-info__icon" aria-hidden="true">📧</span>
                  <div>
                    <strong>Email</strong>
                    <p>contacto&#64;trustgate.cl</p>
                  </div>
                </li>
                <li>
                  <span class="contact-info__icon" aria-hidden="true">📍</span>
                  <div>
                    <strong>Ubicación</strong>
                    <p>Santiago, Chile</p>
                  </div>
                </li>
                <li>
                  <span class="contact-info__icon" aria-hidden="true">🕐</span>
                  <div>
                    <strong>Horario de atención</strong>
                    <p>Lunes a viernes, 9:00 – 18:00 CLT</p>
                  </div>
                </li>
              </ul>
            </div>

            <div class="contact-info__block card">
              <h3>Recursos útiles</h3>
              <ul class="contact-info__resources" role="list">
                <li><a href="/docs">📖 Documentación de la API</a></li>
                <li><a href="/quickstart">🚀 Guía de inicio rápido</a></li>
                <li><a href="/widget-demo">🧪 Demo del widget</a></li>
              </ul>
            </div>
          </aside>
        </div>

      </div>
    </section>
  `,
  styles: [`
    .contact-layout {
      display: flex;
      flex-direction: column;
      gap: 40px;
    }

    .contact-header {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .contact-header__lead {
      font-size: var(--font-size-lg);
      max-width: 600px;
    }

    .contact-body {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
      align-items: start;
    }

    @media (min-width: 1024px) {
      .contact-body {
        grid-template-columns: 1fr 320px;
      }
    }

    .contact-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }

    @media (min-width: 768px) {
      .form-row {
        grid-template-columns: 1fr 1fr;
      }
    }

    .required {
      color: var(--color-error);
    }

    .field-error {
      font-size: var(--font-size-xs);
      color: var(--color-error);
      display: block;
      margin-top: 4px;
    }

    .contact-textarea {
      resize: vertical;
      min-height: 120px;
    }

    .contact-form__footer {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    @media (min-width: 768px) {
      .contact-form__footer {
        flex-direction: row;
        align-items: flex-end;
        justify-content: space-between;
      }
    }

    .contact-form__privacy {
      font-size: var(--font-size-xs);
      color: var(--color-muted);
      max-width: 400px;
    }

    /* Success */
    .contact-success {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 16px;
      padding: 48px 32px;
    }

    .contact-success__icon {
      font-size: 3rem;
    }

    .contact-success h2 {
      font-size: var(--font-size-2xl);
      color: var(--color-success);
    }

    /* Info sidebar */
    .contact-info {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .contact-info__block {
      background: var(--color-bg-alt);
    }

    .contact-info__block h3 {
      font-size: var(--font-size-base);
      margin-bottom: 16px;
    }

    .contact-info__list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .contact-info__list li {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }

    .contact-info__icon {
      font-size: 1.25rem;
      flex-shrink: 0;
    }

    .contact-info__list strong {
      display: block;
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--color-text);
    }

    .contact-info__list p {
      font-size: var(--font-size-sm);
      color: var(--color-muted);
    }

    .contact-info__resources {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .contact-info__resources a {
      font-size: var(--font-size-sm);
      color: var(--color-primary);
      text-decoration: none;
      padding: 6px 10px;
      border-radius: var(--radius-md);
      transition: background var(--transition);
    }

    .contact-info__resources a:hover {
      background: var(--color-primary-light);
    }
  `]
})
export class ContactComponent {
  private readonly http = inject(HttpClient);

  submitted = signal(false);
  submitting = signal(false);
  submitError = signal('');

  form: ContactForm = {
    name: '',
    company: '',
    email: '',
    integrationType: '',
    message: ''
  };

  async submitForm(): Promise<void> {
    this.submitting.set(true);
    this.submitError.set('');
    try {
      await firstValueFrom(
        this.http.post('/api/v1/public/contact', this.form)
      );
      this.submitted.set(true);
    } catch (err: unknown) {
      const apiMessage = this.extractApiError(err);
      this.submitError.set(apiMessage);
    } finally {
      this.submitting.set(false);
    }
  }

  resetForm(): void {
    this.form = { name: '', company: '', email: '', integrationType: '', message: '' };
    this.submitted.set(false);
    this.submitError.set('');
  }

  private extractApiError(err: unknown): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const body = (err as { error: unknown }).error;
      if (body && typeof body === 'object' && 'detail' in body) {
        return String((body as { detail: unknown }).detail);
      }
    }
    return 'No se pudo enviar la solicitud. Por favor intenta nuevamente en unos minutos.';
  }
}
