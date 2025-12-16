// src/app/shared/components/app-footer/app-footer.ts
import { Component, VERSION, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { APP_SETTINGS } from '@config/app-settings';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <footer class="bg-gray-900/50 backdrop-blur-sm border-t border-white/5 py-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          
          <!-- Zivilschutz Info -->
          <div>
            <h3 class="text-sm font-semibold text-white mb-3">Zivilschutz Gantrisch</h3>
            <div class="space-y-2">
              <a href="https://www.zso-gantrisch.ch" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 class="footer-link">
                Offizielle Website
              </a>
              <a href="mailto:zso-gantrisch@schwarzenburg.ch" 
                 class="footer-link">
                Kontakt
              </a>
            </div>
          </div>

          <!-- Rechtliches -->
          <div>
            <h3 class="text-sm font-semibold text-white mb-3">Rechtliches</h3>
            <div class="space-y-2">
              <a routerLink="/datenschutz" class="footer-link">
                Datenschutz
              </a>
              <a routerLink="/impressum" class="footer-link">
                Impressum
              </a>
            </div>
          </div>

          <!-- Entwicklung -->
          <div>
            <h3 class="text-sm font-semibold text-white mb-3">Entwicklung</h3>
            <div class="space-y-2">
              <a href="https://www.marco-ammann.ch" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 class="footer-link">
                Marco Ammann
              </a>
              <span class="text-xs text-gray-500">Web-Entwicklung</span>
            </div>
          </div>

          <!-- Version Info -->
          <div>
            <h3 class="text-sm font-semibold text-white mb-3">System</h3>
            <div class="space-y-1">
              <p class="text-xs text-gray-500">{{ settings.appName }}</p>
              <p class="text-xs text-gray-500">App Version {{ settings.appVersion }}</p>
              <p class="text-xs text-gray-500">Angular Version {{ angularVersion }}</p>
            </div>
          </div>
        </div>

        <!-- Copyright -->
        <div class="mt-8 pt-6 border-t border-gray-800">
          <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p class="text-xs text-gray-500">
              &copy; {{ currentYear }} Zivilschutz Gantrisch. Alle Rechte vorbehalten.
            </p>
            <p class="text-xs text-gray-500">
              Entwickelt von 
              <a href="https://www.marco-ammann.ch" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 class="text-cp-orange hover:text-cp-orange/80">
                Marco Ammann
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .footer-link {
      @apply block text-sm text-gray-400 hover:text-cp-orange transition-colors;
    }
  `]
})
export class AppFooter {
  readonly currentYear = new Date().getFullYear();
  readonly settings = inject(APP_SETTINGS);
  readonly angularVersion = VERSION.full;
}