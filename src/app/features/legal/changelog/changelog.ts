import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';

import { APP_SETTINGS } from '@config/app-settings';
import { CHANGELOG } from '@config/changelog';

@Component({
    selector: 'zso-changelog-page',
    standalone: true,
    imports: [RouterModule],
    template: `
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-white mb-3">Was ist neu?</h1>
        <p class="text-gray-300">
          Kurz & verständlich – die wichtigsten Änderungen der letzten Versionen.
        </p>
      </div>

      <section class="glass-card p-6 mb-6">
        <h2 class="text-lg font-semibold text-cp-orange mb-2">Aktuelle Version</h2>
        <p class="text-sm text-gray-300">
          <span class="font-medium">{{ settings.appName }}</span>
          <span class="text-gray-400">– Version </span>
          <span class="font-semibold text-white">{{ settings.appVersion }}</span>
        </p>
      </section>

      <div class="space-y-6">
        @for (entry of changelog; track entry.version) {
        <section class="glass-card p-6">
          <div class="flex items-start justify-between gap-4 mb-3">
            <div>
              <h2 class="text-xl font-semibold text-white">Version {{ entry.version }}</h2>
              <p class="text-sm text-gray-400">{{ entry.title }}</p>
            </div>
          </div>

          <ul class="list-disc pl-5 text-gray-300 space-y-1">
            @for (item of entry.items; track item) {
            <li>{{ item }}</li>
            }
          </ul>
        </section>
        }
      </div>

      <div class="flex justify-between items-center pt-8 border-t border-gray-700 mt-8">
        <a routerLink="/" class="text-cp-orange hover:text-cp-orange/80 flex items-center gap-2">
          <span class="material-symbols-outlined">arrow_back</span>
          Zurück
        </a>
        <a routerLink="/impressum" class="text-cp-orange hover:text-cp-orange/80">
          Impressum
        </a>
      </div>
    </div>
  `,
    styles: [
        `
      :host {
        display: block;
        min-height: 100vh;
      }
    `,
    ],
})
export class ChangelogPage {
    readonly settings = inject(APP_SETTINGS);
    readonly changelog = inject(CHANGELOG);
}
