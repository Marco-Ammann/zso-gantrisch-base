import { AsyncPipe, CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { ActivityFeedService } from '../services/activity-feed.service';
import { ActivityPreferencesService } from '../services/activity-preferences.service';
import { ActivitySource } from '../activity-feed.model';

@Component({
    selector: 'zso-activities-page',
    standalone: true,
    imports: [AsyncPipe, CommonModule, RouterModule],
    template: `
    <div class="min-h-[calc(100vh-64px)] text-white">
      <div class="layout-container py-6 sm:py-8 space-y-6">
        <div class="flex items-start sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="auth-icon-wrapper">
              <span class="material-symbols-outlined text-2xl text-cp-orange">history</span>
            </div>
            <div>
              <h1 class="text-2xl lg:text-3xl font-bold text-white">Aktivitäten</h1>
              <p class="text-sm text-gray-400">Alle Änderungen & Ereignisse</p>
            </div>
          </div>

          <a
            routerLink="/dashboard"
            class="text-sm text-gray-400 hover:text-cp-orange transition-colors flex items-center gap-2"
          >
            <span class="material-symbols-outlined">arrow_back</span>
            Zurück
          </a>
        </div>

        <div class="glass-card p-4 sm:p-6">
          <h2 class="text-lg font-semibold text-white mb-3">Sichtbarkeit</h2>
          @let p = prefs$ | async;
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label class="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                class="form-checkbox"
                [checked]="p?.showUsers ?? true"
                (change)="setEnabled('users', $any($event.target).checked)"
              />
              Benutzer
            </label>

            <label class="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                class="form-checkbox"
                [checked]="p?.showPlaces ?? true"
                (change)="setEnabled('places', $any($event.target).checked)"
              />
              Orte
            </label>

            <label class="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                class="form-checkbox"
                [checked]="p?.showAdzs ?? true"
                (change)="setEnabled('adsz', $any($event.target).checked)"
              />
              AdZS
            </label>
          </div>
        </div>

        <div class="glass-card p-4 sm:p-6">
          <div class="space-y-2 sm:space-y-3">
            @for (activity of ((activities$ | async) ?? []); track activity.key; let i = $index) {
              <div
                class="group flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-white/5 transition-all cursor-pointer"
                (click)="navigate(activity.route)"
              >
                <div class="relative flex-shrink-0">
                  <div
                    class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-xs sm:text-sm font-medium text-white"
                  >
                    {{ activity.avatarText }}
                  </div>
                  <span
                    class="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full flex items-center justify-center {{ activity.color }} bg-gray-800"
                  >
                    <span class="material-symbols-outlined text-[10px] sm:text-xs">{{ activity.icon }}</span>
                  </span>
                </div>

                <div class="flex-1 min-w-0">
                  <p class="text-xs sm:text-sm font-medium text-white truncate">
                    {{ activity.name }}
                  </p>
                  <p class="text-[10px] sm:text-xs text-gray-400">
                    {{ activity.text }}
                  </p>
                </div>

                <span class="text-[10px] sm:text-xs text-gray-500 flex-shrink-0">
                  {{ activity.timestamp | date: 'dd.MM.yyyy HH:mm' }}
                </span>
              </div>
            } @empty {
              <div class="text-center py-6 sm:py-8 text-gray-500">
                <span class="material-symbols-outlined text-3xl sm:text-4xl mb-2">inbox</span>
                <p class="text-sm">Keine Aktivitäten</p>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivitiesPage {
    private readonly router = inject(Router);
    private readonly feed = inject(ActivityFeedService);
    private readonly prefs = inject(ActivityPreferencesService);

    readonly prefs$ = this.prefs.preferences$;
    readonly activities$ = this.feed.activities$(50);

    setEnabled(source: ActivitySource, enabled: boolean): void {
        this.prefs.setSourceEnabled(source, enabled);
    }

    navigate(path: string): void {
        this.router.navigate([path]);
    }
}
