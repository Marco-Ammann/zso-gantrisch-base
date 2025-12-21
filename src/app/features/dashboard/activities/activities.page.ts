import { AsyncPipe, CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { BehaviorSubject, combineLatest, startWith } from 'rxjs';
import { map } from 'rxjs/operators';

import { ActivityFeedService } from '../services/activity-feed.service';
import { ActivityPreferencesService } from '../services/activity-preferences.service';
import { ActivityFeedItem, ActivitySource } from '../activity-feed.model';

import { ZsoSkeleton } from '@shared/ui/zso-skeleton/zso-skeleton';
import { ZsoStateMessage } from '@shared/ui/zso-state-message/zso-state-message';
import { ScrollLockService } from '@core/services/scroll-lock.service';

type ActivitiesVm = {
  prefs: any;
  items: ActivityFeedItem[] | null;
  pageItems: ActivityFeedItem[];
  search: string;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

@Component({
  selector: 'zso-activities-page',
  standalone: true,
  imports: [AsyncPipe, CommonModule, RouterModule, ZsoSkeleton, ZsoStateMessage],
  template: `
    <div class="min-h-[calc(100vh-64px)] text-white">
      <div class="layout-container py-6 sm:py-8 space-y-6">
        @let vm = vm$ | async;
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
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <label class="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                class="form-checkbox"
                [checked]="vm?.prefs?.showUsers ?? true"
                (change)="setEnabled('users', $any($event.target).checked)"
              />
              Benutzer
            </label>

            <label class="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                class="form-checkbox"
                [checked]="vm?.prefs?.showPlaces ?? true"
                (change)="setEnabled('places', $any($event.target).checked)"
              />
              Orte
            </label>

            <label class="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                class="form-checkbox"
                [checked]="vm?.prefs?.showAdzs ?? true"
                (change)="setEnabled('adsz', $any($event.target).checked)"
              />
              AdZS
            </label>

            <label class="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                class="form-checkbox"
                [checked]="vm?.prefs?.showPlanning ?? true"
                (change)="setEnabled('planning', $any($event.target).checked)"
              />
              Einsatz
            </label>
          </div>
        </div>

        <div class="glass-card p-4 sm:p-6">
          <div class="space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center gap-3">
              <div class="flex-1">
                <label class="text-xs text-gray-400">Suche</label>
                <input
                  class="form-input mt-1"
                  placeholder="Name oder Text…"
                  [value]="vm?.search ?? ''"
                  (input)="setSearch($any($event.target).value)"
                />
              </div>

              <div class="flex items-end gap-2">
                <div>
                  <label class="text-xs text-gray-400">Pro Seite</label>
                  <select
                    class="form-input mt-1"
                    [value]="(vm?.pageSize ?? 25)"
                    (change)="setPageSize($any($event.target).value)"
                  >
                    <option [value]="10">10</option>
                    <option [value]="25">25</option>
                    <option [value]="50">50</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="space-y-2 sm:space-y-3">
            @if (vm?.items === null) {
              <div class="space-y-2 sm:space-y-3">
                @for (i of skeletonRows; track i) {
                  <div class="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg">
                    <zso-skeleton shape="circle" width="2.5rem" height="2.5rem" />
                    <div class="flex-1 min-w-0 space-y-2">
                      <zso-skeleton width="60%" height="0.9rem" />
                      <zso-skeleton width="40%" height="0.7rem" className="opacity-70" />
                    </div>
                    <zso-skeleton width="4rem" height="0.7rem" className="opacity-60" />
                  </div>
                }
              </div>
            } @else {
              @if ((vm?.prefs && !vm?.prefs?.showUsers && !vm?.prefs?.showPlaces && !vm?.prefs?.showAdzs && !vm?.prefs?.showPlanning)) {
                <zso-state-message
                  icon="tune"
                  tone="info"
                  title="Keine Quellen ausgewählt"
                  text="Aktiviere mindestens eine Kategorie (Benutzer, Orte, AdZS oder Einsatz)."
                />
              } @else {
                @if ((vm?.total ?? 0) === 0) {
                  <zso-state-message
                    icon="inbox"
                    tone="neutral"
                    title="Keine Aktivitäten"
                    text="Momentan sind keine Aktivitäten sichtbar. Passe ggf. die Filter an."
                  />
                } @else {
                  @for (activity of (vm?.pageItems ?? []); track activity.key; let i = $index) {
                    <div
                      class="group flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-white/5 transition-all cursor-pointer"
                      (click)="openDetails(activity)"
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

                      <div class="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                          (click)="openDetails(activity); $event.stopPropagation()"
                          aria-label="Details"
                        >
                          <span class="material-symbols-outlined text-lg">info</span>
                        </button>

                        <span class="text-[10px] sm:text-xs text-gray-500">
                          {{ activity.timestamp | date: 'dd.MM.yyyy HH:mm' }}
                        </span>
                      </div>
                    </div>
                  }

                  <div class="mt-4 flex items-center justify-between gap-3">
                    <div class="text-xs text-gray-400">
                      Seite {{ vm?.page ?? 1 }} / {{ vm?.totalPages ?? 1 }} · {{ vm?.total ?? 0 }} Einträge
                    </div>

                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        class="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors text-xs"
                        (click)="prevPage()"
                        [disabled]="(vm?.page ?? 1) <= 1"
                      >
                        <span class="material-symbols-outlined text-base">chevron_left</span>
                        Zurück
                      </button>

                      <button
                        type="button"
                        class="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors text-xs"
                        (click)="nextPage()"
                        [disabled]="(vm?.page ?? 1) >= (vm?.totalPages ?? 1)"
                      >
                        Weiter
                        <span class="material-symbols-outlined text-base">chevron_right</span>
                      </button>
                    </div>
                  </div>
                }
              }
            }
            </div>
          </div>
        </div>

        @if (detailsVisible && selectedActivity) {
          <div
            class="fixed inset-0 bg-black/60 backdrop-blur-glass flex items-center justify-center z-50 p-4"
            (click)="closeDetails()"
          >
            <div
              class="glass-card p-6 max-w-2xl w-full mx-auto"
              (click)="$event.stopPropagation()"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <h3 class="text-lg font-semibold text-white truncate">
                    {{ selectedActivity.name }}
                  </h3>
                  <p class="text-xs text-gray-400 mt-1">
                    {{ selectedActivity.timestamp | date: 'dd.MM.yyyy HH:mm' }} · {{ selectedActivity.source }}
                  </p>
                </div>
                <button
                  type="button"
                  class="inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  (click)="closeDetails()"
                  aria-label="Schliessen"
                >
                  <span class="material-symbols-outlined">close</span>
                </button>
              </div>

              <div class="mt-4">
                <p class="text-sm text-gray-200">{{ selectedActivity.text }}</p>
              </div>

              <div class="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div class="text-[10px] text-gray-400">Quelle</div>
                  <div class="text-xs text-white mt-1">{{ selectedActivity.source }}</div>
                </div>

                <div class="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div class="text-[10px] text-gray-400">Zeit (Unix ms)</div>
                  <div class="text-xs text-white mt-1">{{ selectedActivity.timestamp }}</div>
                </div>

                <div class="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div class="text-[10px] text-gray-400">ID</div>
                  <div class="text-xs text-white mt-1 break-all">{{ selectedActivity.id }}</div>
                </div>

                <div class="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div class="text-[10px] text-gray-400">Key</div>
                  <div class="text-xs text-white mt-1 break-all">{{ selectedActivity.key }}</div>
                </div>

                <div class="rounded-lg border border-white/10 bg-white/5 p-3 sm:col-span-2">
                  <div class="text-[10px] text-gray-400">Route</div>
                  <div class="text-xs text-white mt-1 break-all">{{ selectedActivity.route }}</div>
                </div>

                <div class="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div class="text-[10px] text-gray-400">Icon / Farbe</div>
                  <div class="text-xs text-white mt-1">
                    {{ selectedActivity.icon }} · {{ selectedActivity.color }}
                  </div>
                </div>

                <div class="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div class="text-[10px] text-gray-400">Avatar</div>
                  <div class="text-xs text-white mt-1">{{ selectedActivity.avatarText ?? '—' }}</div>
                </div>
              </div>

              <div class="mt-5">
                <div class="text-[10px] text-gray-400 mb-2">Rohdaten</div>
                <pre class="text-[11px] text-gray-200 whitespace-pre-wrap break-words rounded-lg border border-white/10 bg-black/30 p-3 max-h-[240px] overflow-auto">{{ selectedActivity | json }}</pre>
              </div>

              <div class="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  class="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors text-sm"
                  (click)="closeDetails()"
                >
                  Schliessen
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/15 transition-colors text-sm"
                  (click)="navigate(selectedActivity.route); closeDetails()"
                >
                  Öffnen
                  <span class="material-symbols-outlined text-base">open_in_new</span>
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivitiesPage implements OnDestroy {
  private readonly router = inject(Router);
  private readonly feed = inject(ActivityFeedService);
  private readonly prefs = inject(ActivityPreferencesService);
  private readonly scrollLock = inject(ScrollLockService);

  private readonly searchSubject = new BehaviorSubject<string>('');
  private readonly pageSubject = new BehaviorSubject<number>(1);
  private readonly pageSizeSubject = new BehaviorSubject<number>(25);

  selectedActivity: ActivityFeedItem | null = null;
  detailsVisible = false;
  private detailsScrollLocked = false;

  readonly prefs$ = this.prefs.preferences$;

  private readonly activitiesRaw$ = this.feed.activities$(200).pipe(
    startWith(null as ActivityFeedItem[] | null)
  );

  readonly vm$ = combineLatest([
    this.prefs$,
    this.activitiesRaw$,
    this.searchSubject,
    this.pageSubject,
    this.pageSizeSubject,
  ]).pipe(
    map(([prefs, items, search, page, pageSize]) => {
      if (items === null) {
        return {
          prefs,
          items: null,
          pageItems: [],
          search,
          page,
          pageSize,
          total: 0,
          totalPages: 1,
        } satisfies ActivitiesVm;
      }

      const q = search.trim().toLowerCase();
      const filtered = !q
        ? items
        : items.filter((a) => {
          const hay = `${a.name} ${a.text}`.toLowerCase();
          return hay.includes(q);
        });

      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
      const safePage = Math.min(Math.max(1, page), totalPages);

      const start = (safePage - 1) * pageSize;
      const pageItems = filtered.slice(start, start + pageSize);

      return {
        prefs,
        items,
        pageItems,
        search,
        page: safePage,
        pageSize,
        total,
        totalPages,
      } satisfies ActivitiesVm;
    })
  );

  readonly skeletonRows = [0, 1, 2, 3, 4, 5, 6, 7];

  setEnabled(source: ActivitySource, enabled: boolean): void {
    this.prefs.setSourceEnabled(source, enabled);
  }

  setSearch(value: string): void {
    this.searchSubject.next(value ?? '');
    this.pageSubject.next(1);
  }

  setPageSize(size: unknown): void {
    const parsed = typeof size === 'string' ? Number.parseInt(size, 10) : (size as number);
    const next = Number.isFinite(parsed) && parsed > 0 ? parsed : 25;
    this.pageSizeSubject.next(next);
    this.pageSubject.next(1);
  }

  prevPage(): void {
    const current = this.pageSubject.value;
    this.pageSubject.next(Math.max(1, current - 1));
  }

  nextPage(): void {
    const current = this.pageSubject.value;
    this.pageSubject.next(current + 1);
  }

  openDetails(activity: ActivityFeedItem): void {
    this.selectedActivity = activity;
    this.detailsVisible = true;

    if (!this.detailsScrollLocked) {
      this.scrollLock.lock();
      this.detailsScrollLocked = true;
    }
  }

  closeDetails(): void {
    this.detailsVisible = false;
    this.selectedActivity = null;

    if (this.detailsScrollLocked) {
      this.scrollLock.unlock();
      this.detailsScrollLocked = false;
    }
  }

  ngOnDestroy(): void {
    if (this.detailsScrollLocked) {
      this.scrollLock.unlock();
      this.detailsScrollLocked = false;
    }
  }

  navigate(path: string): void {
    this.router.navigate([path]);
  }
}
