import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home.component').then((m) => m.HomeComponent),
    title: 'TrustGate — Gestión de Consentimiento Ley 21.719'
  },
  {
    path: 'docs',
    loadComponent: () =>
      import('./pages/docs/docs.component').then((m) => m.DocsComponent),
    title: 'Documentación — TrustGate'
  },
  {
    path: 'widget-demo',
    loadComponent: () =>
      import('./pages/widget-demo/widget-demo.component').then(
        (m) => m.WidgetDemoComponent
      ),
    title: 'Demo Widget — TrustGate'
  },
  {
    path: 'widget-simple',
    loadComponent: () =>
      import('./pages/simple-widget-demo/simple-widget-demo.component').then(
        (m) => m.SimpleWidgetDemoComponent
      ),
    title: 'Widget Simplificado — TrustGate'
  },
  {
    path: 'api-demo',
    loadComponent: () =>
      import('./pages/api-demo/api-demo.component').then(
        (m) => m.ApiDemoComponent
      ),
    title: 'Demo API — TrustGate'
  },
  {
    path: 'quickstart',
    loadComponent: () =>
      import('./pages/quickstart/quickstart.component').then(
        (m) => m.QuickstartComponent
      ),
    title: 'Quickstart — TrustGate'
  },
  {
    path: 'contacto',
    loadComponent: () =>
      import('./pages/contact/contact.component').then(
        (m) => m.ContactComponent
      ),
    title: 'Contacto — TrustGate'
  },
  {
    path: 'autorizacion/:token',
    loadComponent: () =>
      import('./pages/consent-authorization/consent-authorization.component').then(
        (m) => m.ConsentAuthorizationComponent
      ),
    title: 'Autorización privada — TrustGate'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
