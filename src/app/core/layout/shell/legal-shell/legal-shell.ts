// src/app/core/layout/shell/legal-shell/legal-shell.ts
import { Component } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { AppFooter } from '@shared/components/app-footer/app-footer';

@Component({
  selector: 'zso-legal-shell',
  standalone: true,
  imports: [RouterOutlet, AppFooter],
  template: `
    <div class="min-h-screen flex flex-col bg-gray-900 relative">
      <!-- Fixed Background -->
      <div class="fixed inset-0 bg-[url('assets/images/background_mountains.jpg')] bg-cover bg-center bg-no-repeat"></div>
      <div class="fixed inset-0" style="background: var(--shell-overlay-90)"></div>

      <!-- Header -->
      <header class="relative z-20 border-b border-white/5 flex-shrink-0">
        <nav class="layout-container h-16 flex items-center">
          <!-- Logo -->
          <button (click)="goToApp()" class="flex items-end gap-1 font-bold text-white hover:text-cp-orange transition-colors cursor-pointer">
            <span class="text-xl text-cp-orange">ZSO GANTRISCH</span>
            <span class="text-sm leading-none tracking-tight opacity-80">base</span>
          </button>

          <div class="flex-1"></div>

          <!-- Navigation -->
          <div class="flex items-center gap-4">
            <button (click)="goToApp()"
               class="nav-link">
              Zur Anwendung
            </button>
          </div>
        </nav>
      </header>

      <!-- Main Content -->
      <main class="relative z-10 flex-1 overflow-y-auto">
        <router-outlet></router-outlet>
      </main>

      <!-- Footer -->
      <app-footer class="relative z-10 flex-shrink-0"></app-footer>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }
  `]
})
export class LegalShell {
  constructor(private router: Router) { }

  goToApp(): void {
    // Navigate to the main application (dashboard if logged in, otherwise login)
    this.router.navigate(['/dashboard']).catch(() => {
      // If navigation to dashboard fails (not authenticated), go to login
      this.router.navigate(['/auth/login']);
    });
  }
}