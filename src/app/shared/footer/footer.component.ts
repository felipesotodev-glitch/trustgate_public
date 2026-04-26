import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'tp-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="footer" role="contentinfo">
      <div class="container footer__inner">
        <div class="footer__brand">
          <div class="footer__logo">
            <span class="footer__logo-mark" aria-hidden="true">TG</span>
            <strong>TrustGate</strong>
          </div>
          <p class="footer__tagline">
            Plataforma de gestión de consentimiento y protección de datos personales bajo la Ley 21.719 Chile y normativa CMF.
          </p>
        </div>

        <nav class="footer__nav" aria-label="Navegación pie de página">
          <h3 class="footer__nav-title">Plataforma</h3>
          <ul role="list">
            <li><a routerLink="/docs">Documentación</a></li>
            <li><a routerLink="/widget-demo">Demo Widget</a></li>
            <li><a routerLink="/api-demo">Demo API</a></li>
            <li><a routerLink="/quickstart">Quickstart</a></li>
            <li><a routerLink="/contacto">Contacto</a></li>
          </ul>
        </nav>

        <div class="footer__legal-col">
          <h3 class="footer__nav-title">Legal</h3>
          <ul role="list">
            <li><span>Ley 21.719 (Chile)</span></li>
            <li><span>Normativa CMF</span></li>
            <li><span>Derechos ARCO-P</span></li>
          </ul>
        </div>
      </div>

      <div class="footer__bottom">
        <div class="container">
          <p>© 2026 TrustGate. Cumplimiento Ley 21.719 Chile. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    /* US-6001 técnica: consolida el contraste dark del footer público con tokens reutilizables del sistema global. */
    .footer {
      background: var(--color-dark);
      color: var(--color-dark-muted);
      margin-top: auto;
    }

    .footer__inner {
      display: grid;
      grid-template-columns: 1fr;
      gap: 40px;
      padding-block: 48px;
    }

    @media (min-width: 768px) {
      .footer__inner {
        grid-template-columns: 2fr 1fr 1fr;
      }
    }

    .footer__brand {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .footer__logo {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .footer__logo-mark {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: var(--color-primary);
      color: var(--color-bg);
      border-radius: var(--radius-md);
      font-size: 0.7rem;
      font-weight: 800;
    }

    .footer__logo strong {
      font-size: 1.125rem;
      color: var(--color-bg);
      font-weight: 700;
    }

    .footer__tagline {
      font-size: var(--font-size-sm);
      line-height: 1.6;
      color: var(--color-dark-muted);
      max-width: 360px;
    }

    .footer__nav-title {
      font-size: var(--font-size-xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-dark-text);
      margin-bottom: 16px;
    }

    .footer__nav ul,
    .footer__legal-col ul {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .footer__nav a {
      font-size: var(--font-size-sm);
      color: var(--color-dark-muted);
      text-decoration: none;
      transition: color var(--transition);
    }

    .footer__nav a:hover {
      color: var(--color-bg);
    }

    .footer__legal-col span {
      font-size: var(--font-size-sm);
      color: var(--color-dark-subtle);
    }

    .footer__bottom {
      border-top: 1px solid var(--color-dark-border);
      padding-block: 20px;
    }

    .footer__bottom p {
      font-size: var(--font-size-xs);
      color: var(--color-dark-subtle);
      text-align: center;
    }
  `]
})
export class FooterComponent {}
