import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { FooterComponent } from './shared/footer/footer.component';

@Component({
  selector: 'tp-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent],
  template: `
    <tp-navbar />
    <main id="main-content">
      <router-outlet />
    </main>
    <tp-footer />
  `,
  styles: [`
    #main-content {
      min-height: calc(100vh - 64px - 200px);
    }
  `]
})
export class AppComponent {}
