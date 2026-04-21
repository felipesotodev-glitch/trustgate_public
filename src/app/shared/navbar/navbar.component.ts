import { Component, HostListener, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'tp-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="navbar" role="banner">
      <div class="container navbar__inner">
        <a routerLink="/" class="navbar__brand" aria-label="TrustGate — Ir al inicio">
          <span class="navbar__logo-mark" aria-hidden="true">TG</span>
          <div class="navbar__logo-text">
            <strong>TrustGate</strong>
            <span>Gestión de Consentimiento</span>
          </div>
        </a>

        <button
          class="navbar__hamburger"
          [class.is-open]="menuOpen()"
          (click)="toggleMenu()"
          [attr.aria-expanded]="menuOpen()"
          aria-controls="main-nav"
          aria-label="Abrir menú de navegación"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <nav
          id="main-nav"
          class="navbar__nav"
          [class.is-open]="menuOpen()"
          role="navigation"
          aria-label="Navegación principal"
        >
          <ul class="navbar__links" role="list">
            <li><a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" (click)="closeMenu()">Inicio</a></li>
            <li><a routerLink="/docs" routerLinkActive="active" (click)="closeMenu()">Documentación</a></li>
            <li><a routerLink="/widget-demo" routerLinkActive="active" (click)="closeMenu()">Demo Widget</a></li>
            <li><a routerLink="/api-demo" routerLinkActive="active" (click)="closeMenu()">Demo API</a></li>
            <li><a routerLink="/quickstart" routerLinkActive="active" (click)="closeMenu()">Quickstart</a></li>
            <li><a routerLink="/contacto" routerLinkActive="active" (click)="closeMenu()">Contacto</a></li>
          </ul>
          <a routerLink="/contacto" class="btn btn-primary navbar__cta" (click)="closeMenu()">
            Solicitar acceso
          </a>
        </nav>
      </div>
    </header>
  `,
  styles: [`
    .navbar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: #ffffff;
      border-bottom: 1px solid var(--color-border);
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }

    .navbar__inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 64px;
      gap: 16px;
    }

    .navbar__brand {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      flex-shrink: 0;
    }

    .navbar__logo-mark {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background: var(--color-primary);
      color: #fff;
      border-radius: var(--radius-md);
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.02em;
    }

    .navbar__logo-text {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
    }

    .navbar__logo-text strong {
      font-size: 1rem;
      font-weight: 700;
      color: var(--color-dark);
    }

    .navbar__logo-text span {
      font-size: 0.65rem;
      color: var(--color-muted);
      font-weight: 400;
    }

    /* Hamburger */
    .navbar__hamburger {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      width: 24px;
      height: 18px;
      padding: 0;
      background: none;
      border: none;
      cursor: pointer;
      z-index: 110;
    }

    .navbar__hamburger span {
      display: block;
      height: 2px;
      background: var(--color-dark);
      border-radius: 2px;
      transition: transform 0.2s ease, opacity 0.2s ease;
    }

    .navbar__hamburger.is-open span:nth-child(1) {
      transform: translateY(8px) rotate(45deg);
    }

    .navbar__hamburger.is-open span:nth-child(2) {
      opacity: 0;
    }

    .navbar__hamburger.is-open span:nth-child(3) {
      transform: translateY(-8px) rotate(-45deg);
    }

    /* Nav panel */
    .navbar__nav {
      position: fixed;
      top: 64px;
      left: 0;
      right: 0;
      bottom: 0;
      background: #ffffff;
      border-top: 1px solid var(--color-border);
      padding: 24px var(--padding-x);
      display: flex;
      flex-direction: column;
      gap: 24px;
      transform: translateX(100%);
      transition: transform 0.25s ease;
      overflow-y: auto;
    }

    .navbar__nav.is-open {
      transform: translateX(0);
    }

    .navbar__links {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .navbar__links a {
      display: block;
      padding: 10px 0;
      font-size: var(--font-size-base);
      font-weight: 500;
      color: var(--color-text);
      border-bottom: 1px solid var(--color-border);
      text-decoration: none;
      transition: color var(--transition);
    }

    .navbar__links a:hover,
    .navbar__links a.active {
      color: var(--color-primary);
    }

    .navbar__cta {
      align-self: flex-start;
    }

    /* Desktop */
    @media (min-width: 1024px) {
      .navbar__hamburger {
        display: none;
      }

      .navbar__nav {
        position: static;
        transform: none;
        flex-direction: row;
        align-items: center;
        padding: 0;
        background: transparent;
        border: none;
        overflow: visible;
        flex: 1;
        justify-content: flex-end;
        gap: 0;
      }

      .navbar__links {
        flex-direction: row;
        align-items: center;
        gap: 4px;
        margin-right: 16px;
      }

      .navbar__links a {
        padding: 6px 12px;
        font-size: var(--font-size-sm);
        border-bottom: none;
        border-radius: var(--radius-md);
      }

      .navbar__links a:hover {
        background: var(--color-primary-light);
      }

      .navbar__links a.active {
        background: var(--color-primary-light);
        color: var(--color-primary);
      }

      .navbar__cta {
        align-self: center;
      }
    }
  `]
})
export class NavbarComponent {
  menuOpen = signal(false);

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMenu();
  }
}
