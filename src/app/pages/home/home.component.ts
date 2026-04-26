import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'tp-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <!-- Hero -->
    <section class="hero section" aria-labelledby="hero-title">
      <div class="container hero__inner">
        <div class="hero__content">
          <span class="badge badge-primary hero__badge">Ley 21.719 · CMF · ARCO-P</span>
          <h1 id="hero-title">Cumplimiento Ley 21.719<br />sin fricciones</h1>
          <p class="hero__description">
            TrustGate es la plataforma que permite a tu organización gestionar el consentimiento de datos personales de forma segura, auditable y conforme a la normativa chilena vigente.
          </p>
          <div class="hero__actions">
            <a routerLink="/docs" class="btn btn-primary btn-lg">Ver documentación</a>
            <a routerLink="/widget-demo" class="btn btn-secondary btn-lg">Demo en vivo</a>
          </div>
        </div>
        <div class="hero__visual" aria-hidden="true">
          <div class="hero__card">
            <div class="hero__card-header">
              <span class="hero__card-dot hero__card-dot--error"></span>
              <span class="hero__card-dot hero__card-dot--warning"></span>
              <span class="hero__card-dot hero__card-dot--success"></span>
            </div>
            <div class="hero__card-body">
              <div class="hero__consent-item">
                <span class="hero__consent-label">Marketing digital</span>
                <span class="hero__consent-toggle is-on" aria-hidden="true">✓</span>
              </div>
              <div class="hero__consent-item">
                <span class="hero__consent-label">Comunicaciones email</span>
                <span class="hero__consent-toggle is-on" aria-hidden="true">✓</span>
              </div>
              <div class="hero__consent-item">
                <span class="hero__consent-label">Datos analíticos</span>
                <span class="hero__consent-toggle" aria-hidden="true">—</span>
              </div>
              <div class="hero__consent-item">
                <span class="hero__consent-label">Compartir con terceros</span>
                <span class="hero__consent-toggle" aria-hidden="true">—</span>
              </div>
              <p class="hero__card-meta">Titular verificado · SHA-256 ✓</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="features section" aria-labelledby="features-title">
      <div class="container">
        <header class="section-header">
          <h2 id="features-title">Todo lo que necesitas para cumplir</h2>
          <p>Módulos integrados para el ciclo de vida completo del consentimiento.</p>
        </header>
        <ul class="features__grid" role="list">
          @for (feature of features; track feature.title) {
            <li class="feature-card">
              <span class="feature-card__icon" aria-hidden="true">{{ feature.icon }}</span>
              <h3>{{ feature.title }}</h3>
              <p>{{ feature.description }}</p>
            </li>
          }
        </ul>
      </div>
    </section>

    <!-- How it works -->
    <section class="how-it-works section" aria-labelledby="hiw-title">
      <div class="container">
        <header class="section-header">
          <h2 id="hiw-title">¿Cómo funciona?</h2>
          <p>Tres pasos para integrar TrustGate en tu organización.</p>
        </header>
        <ol class="steps" role="list">
          @for (step of steps; track step.number) {
            <li class="step">
              <span class="step__number" aria-hidden="true">{{ step.number }}</span>
              <div class="step__content">
                <h3>{{ step.title }}</h3>
                <p>{{ step.description }}</p>
              </div>
            </li>
          }
        </ol>
      </div>
    </section>

    <!-- CTA final -->
    <section class="cta-section section" aria-labelledby="cta-title">
      <div class="container cta-section__inner">
        <h2 id="cta-title">¿Listo para integrar?</h2>
        <p>Solicita acceso a la plataforma y comienza a gestionar consentimientos en minutos.</p>
        <div class="cta-section__actions">
          <a routerLink="/contacto" class="btn btn-primary btn-lg">Solicitar acceso</a>
          <a routerLink="/quickstart" class="btn btn-outline btn-lg">Ver Quickstart</a>
        </div>
      </div>
    </section>
  `,
  styles: [`
    /* US-6101 técnica: estandariza hero y CTA de la landing pública eliminando hardcoded y estilos inline de color. */
    /* Hero */
    .hero {
      background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-bg) 60%);
    }

    .hero__inner {
      display: grid;
      grid-template-columns: 1fr;
      gap: 48px;
      align-items: center;
    }

    @media (min-width: 1024px) {
      .hero__inner {
        grid-template-columns: 1fr 1fr;
        gap: 64px;
      }
    }

    .hero__badge {
      margin-bottom: 16px;
    }

    .hero__content {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .hero__content h1 {
      font-size: clamp(1.875rem, 5vw, 3.5rem);
      line-height: 1.15;
    }

    .hero__description {
      font-size: var(--font-size-lg);
      color: var(--color-muted);
      max-width: 520px;
    }

    .hero__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 8px;
    }

    /* Hero visual */
    .hero__visual {
      display: none;
    }

    @media (min-width: 1024px) {
      .hero__visual {
        display: flex;
        justify-content: center;
        align-items: center;
      }
    }

    .hero__card {
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-lg);
      width: 100%;
      max-width: 360px;
      overflow: hidden;
    }

    .hero__card-header {
      display: flex;
      gap: 6px;
      align-items: center;
      padding: 12px 16px;
      background: var(--color-bg-alt);
      border-bottom: 1px solid var(--color-border);
    }

    .hero__card-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: block;
    }

    .hero__card-dot--error { background: var(--color-error); }
    .hero__card-dot--warning { background: var(--color-warning); }
    .hero__card-dot--success { background: var(--color-success); }

    .hero__card-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .hero__consent-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      background: var(--color-bg-alt);
      border-radius: var(--radius-md);
    }

    .hero__consent-label {
      font-size: var(--font-size-sm);
      color: var(--color-text);
      font-weight: 500;
    }

    .hero__consent-toggle {
      font-size: var(--font-size-xs);
      font-weight: 700;
      color: var(--color-muted);
      background: var(--color-border);
      padding: 2px 8px;
      border-radius: 999px;
    }

    .hero__consent-toggle.is-on {
      background: var(--color-success-bg);
      color: var(--color-success);
    }

    .hero__card-meta {
      font-size: var(--font-size-xs);
      color: var(--color-muted);
      text-align: center;
      padding-top: 4px;
    }

    /* Section header */
    .section-header {
      text-align: center;
      margin-bottom: 40px;
    }

    .section-header p {
      margin-top: 12px;
      font-size: var(--font-size-lg);
    }

    /* Features */
    .features {
      background: var(--color-bg-alt);
    }

    .features__grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    @media (min-width: 1024px) {
      .features__grid {
        grid-template-columns: repeat(4, 1fr);
        gap: 24px;
      }
    }

    .feature-card {
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 24px 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      transition: box-shadow var(--transition), transform var(--transition);
    }

    .feature-card:hover {
      box-shadow: var(--shadow-md);
      transform: translateY(-2px);
    }

    .feature-card__icon {
      font-size: 1.75rem;
    }

    .feature-card h3 {
      font-size: var(--font-size-base);
    }

    .feature-card p {
      font-size: var(--font-size-sm);
    }

    /* Steps */
    .how-it-works {
      background: var(--color-bg);
    }

    .steps {
      display: flex;
      flex-direction: column;
      gap: 24px;
      counter-reset: none;
    }

    @media (min-width: 768px) {
      .steps {
        flex-direction: row;
        gap: 32px;
      }
    }

    .step {
      display: flex;
      gap: 20px;
      flex: 1;
    }

    .step__number {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--color-primary);
      color: var(--color-bg);
      font-size: var(--font-size-xl);
      font-weight: 800;
    }

    .step__content {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .step__content h3 {
      font-size: var(--font-size-lg);
    }

    /* CTA section */
    .cta-section {
      background: var(--color-primary);
    }

    .cta-section__inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 16px;
    }

    .cta-section h2 {
      color: var(--color-bg);
    }

    .cta-section p {
      color: rgba(255,255,255,0.85);
      font-size: var(--font-size-lg);
      max-width: 480px;
    }

    .cta-section__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      justify-content: center;
      margin-top: 8px;
    }

    .cta-section .btn-primary {
      background: var(--color-bg);
      color: var(--color-primary);
      border-color: var(--color-bg);
    }

    .cta-section .btn-primary:hover {
      background: var(--color-primary-light);
      color: var(--color-primary-dark);
    }

    .cta-section .btn-outline {
      border-color: rgba(255,255,255,0.5);
      color: var(--color-bg);
    }

    .cta-section .btn-outline:hover {
      border-color: var(--color-bg);
      background: rgba(255,255,255,0.1);
    }
  `]
})
export class HomeComponent {
  features = [
    {
      icon: '✓',
      title: 'Consentimiento granular',
      description: 'Gestiona consentimiento por finalidad y canal con trazabilidad completa.'
    },
    {
      icon: '</>',
      title: 'Widget embebible',
      description: 'Integra el centro de consentimiento con una sola línea de código.'
    },
    {
      icon: '⚡',
      title: 'API REST pública',
      description: 'Endpoints documentados para grant, revoke y consulta de estado en tiempo real.'
    },
    {
      icon: '🛡',
      title: 'Cumplimiento CMF',
      description: 'Reportes automáticos R01-R12 y cadena de evidencia con hash SHA-256.'
    }
  ];

  steps = [
    {
      number: '1',
      title: 'Registra tu cliente',
      description: 'Crea una cuenta en TrustGate y obtén tu clave de integración x-client-key.'
    },
    {
      number: '2',
      title: 'Integra el widget o API',
      description: 'Embebe el widget en tu sitio web o conecta tu backend a la REST API pública.'
    },
    {
      number: '3',
      title: 'Los titulares gestionan su consentimiento',
      description: 'Tus clientes ejercen sus derechos ARCO-P de forma autónoma y tú cumples la ley.'
    }
  ];
}
