// src/app/shared/components/app-footer/app-footer.ts
import { Component, HostListener, VERSION, inject, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';

import { APP_SETTINGS } from '@config/app-settings';
import { CHANGELOG } from '@config/changelog';
import { ScrollLockService } from '@core/services/scroll-lock.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterModule],
  template: `
    <footer class="bg-gray-900/80 border-t border-white/5 py-8">
      <div class="layout-container">
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
              <button
                type="button"
                class="text-xs text-gray-500 hover:text-cp-orange transition-colors underline-offset-2 hover:underline text-left"
                (click)="openChangelog()"
                [attr.aria-expanded]="changelogOpen"
                aria-haspopup="dialog"
              >
                App Version {{ settings.appVersion }}
              </button>
              <a
                routerLink="/changelog"
                class="text-xs text-gray-500 hover:text-cp-orange transition-colors underline-offset-2 hover:underline"
              >
                Was ist neu?
              </a>
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

      <div
        class="fixed inset-0 bg-black/60 backdrop-blur-glass z-50 flex items-start justify-center pt-20 pb-4 px-2 sm:px-4 overflow-hidden opacity-0 pointer-events-none transition-opacity duration-200"
        [class.opacity-100]="changelogOpen"
        [class.pointer-events-auto]="changelogOpen"
        (click)="closeChangelog()"
      >
        <div
          class="glass-card w-full mx-auto overflow-hidden transform transition-transform duration-200 sm:max-w-xl sm:rounded-lg max-h-[calc(100vh-5.5rem)]"
          [class.translate-y-full]="!changelogOpen"
          [class.translate-y-0]="changelogOpen"
          (click)="$event.stopPropagation()"
          role="dialog"
          aria-modal="true"
          aria-label="Changelog"
        >
          <div class="flex items-center justify-between p-4 border-b border-white/10 bg-black/30">
            <h3 class="text-lg font-semibold text-white">Was ist neu?</h3>
            <button
              type="button"
              (click)="closeChangelog()"
              class="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-all"
            >
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="p-4 space-y-4 overflow-y-auto">
            <p class="text-sm text-gray-300">
              Kurz & verständlich – die wichtigsten Änderungen der letzten Versionen.
            </p>

            @for (entry of changelog; track entry.version) {
            <div class="space-y-2">
              <div class="flex items-center justify-between gap-4">
                <h4 class="text-sm font-semibold text-white">Version {{ entry.version }}</h4>
                <span class="text-xs text-gray-500">{{ entry.title }}</span>
              </div>
              <ul class="list-disc pl-5 text-sm text-gray-300 space-y-1">
                @for (item of entry.items; track item) {
                <li>{{ item }}</li>
                }
              </ul>
            </div>
            }
          </div>
        </div>
      </div>
    </footer>
  `,
})
export class AppFooter implements OnDestroy {
  readonly currentYear = new Date().getFullYear();
  readonly settings = inject(APP_SETTINGS);
  readonly angularVersion = VERSION.full;
  readonly changelog = inject(CHANGELOG);
  private readonly scrollLock = inject(ScrollLockService);
  private scrollLocked = false;

  changelogOpen = false;

  openChangelog(): void {
    this.changelogOpen = true;
    if (!this.scrollLocked) {
      this.scrollLock.lock();
      this.scrollLocked = true;
    }
  }

  closeChangelog(): void {
    this.changelogOpen = false;
    if (this.scrollLocked) {
      this.scrollLock.unlock();
      this.scrollLocked = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.changelogOpen) return;
    this.closeChangelog();
  }

  ngOnDestroy(): void {
    if (this.scrollLocked) {
      this.scrollLock.unlock();
      this.scrollLocked = false;
    }
  }
}