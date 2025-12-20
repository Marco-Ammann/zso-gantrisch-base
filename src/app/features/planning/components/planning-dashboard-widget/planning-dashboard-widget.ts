import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { MissionsService } from '../../services/missions.service';

@Component({
  selector: 'zso-planning-dashboard-widget',
  standalone: true,
  imports: [AsyncPipe],
  host: { class: 'sm:row-span-2' },
  template: `
    <button
      type="button"
      class="glass-card w-full h-full text-left p-4 sm:p-5 min-h-[160px] flex flex-col gap-3 hover:bg-white/15 active:bg-white/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
      (click)="navigate()"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined text-2xl text-cp-orange">event_note</span>
          <span class="text-sm font-semibold text-white">Einsätze</span>
        </div>
        <span class="material-symbols-outlined text-white/40">chevron_right</span>
      </div>

      @let vm = vm$ | async;
      <div class="grid grid-cols-1 gap-2">
        <div class="rounded-lg bg-white/5 px-3 py-2">
          <div class="text-[10px] uppercase tracking-wide text-white/60">Aktuell</div>
          <div class="text-sm font-semibold text-white whitespace-pre-line leading-tight">
            {{ vm?.currentValue ?? '—' }}
          </div>
        </div>

        <div class="rounded-lg bg-white/5 px-3 py-2">
          <div class="text-[10px] uppercase tracking-wide text-white/60">Nächster</div>
          <div class="text-sm font-semibold text-white whitespace-pre-line leading-tight">
            {{ vm?.nextValue ?? '—' }}
          </div>
        </div>
      </div>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanningDashboardWidget {
  private readonly missions = inject(MissionsService);
  private readonly router = inject(Router);

  readonly vm$ = this.missions.getAll().pipe(
    map((missions) => {
      const now = Date.now();

      const active = missions
        .filter((m) => m.status === 'active' || (m.startAt <= now && m.endAt >= now && m.status !== 'cancelled'))
        .sort((a, b) => a.startAt - b.startAt)[0];

      const next = missions
        .filter((m) => m.startAt >= now && m.status !== 'cancelled' && m.status !== 'done')
        .sort((a, b) => a.startAt - b.startAt)[0];

      return {
        currentValue: active ? this.formatTs(active.startAt) : '—',
        nextValue: next ? this.formatTs(next.startAt) : '—',
      };
    }),
    catchError(() => of({ currentValue: '—', nextValue: '—' }))
  );

  private formatTs(ts: number): string {
    try {
      const date = new Intl.DateTimeFormat('de-CH', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      }).format(new Date(ts));

      const time = new Intl.DateTimeFormat('de-CH', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(ts));

      return `${date}\n${time}`;
    } catch {
      return new Date(ts).toLocaleString();
    }
  }

  navigate(): void {
    this.router.navigate(['/planning']);
  }
}
