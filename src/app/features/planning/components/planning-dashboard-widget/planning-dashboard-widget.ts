import { AsyncPipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { combineLatest, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { PersonDoc } from '@core/models/person.model';
import { MissionDoc } from '@core/models/mission.model';
import { PersonService } from '@core/services/person.service';
import { PlaceDoc } from '@core/models/place.model';
import { PlacesService } from '@features/places/services/places.service';
import { MissionsService } from '../../services/missions.service';

interface MissionWidgetItemVm {
  title: string;
  when: string;
  placeName: string;
  responsibleName: string;
  capacityText: string;
  isOverCapacity: boolean;
}

interface PlanningWidgetVm {
  current: MissionWidgetItemVm | null;
  next: MissionWidgetItemVm | null;
}

@Component({
  selector: 'zso-planning-dashboard-widget',
  standalone: true,
  imports: [AsyncPipe, NgClass],
  host: { class: 'lg:row-span-2' },
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
          @if (vm?.current; as current) {
          <div class="flex items-start justify-between gap-2">
            <div class="text-sm font-semibold text-white truncate">{{ current.title }}</div>
            <div class="text-xs text-white/60 whitespace-pre-line text-right leading-tight shrink-0">
              {{ current.when }}
            </div>
          </div>
          <div class="text-xs text-white/60 truncate mt-1">
            {{ current.placeName }} <span class="opacity-60">•</span> {{ current.responsibleName }}
          </div>
          <div
            class="text-xs mt-1"
            [ngClass]="current.isOverCapacity ? 'text-rose-400' : 'text-white/60'"
          >
            {{ current.capacityText }}
          </div>
          } @else {
          <div class="text-sm font-semibold text-white whitespace-pre-line leading-tight">—</div>
          }
        </div>

        <div class="rounded-lg bg-white/5 px-3 py-2">
          <div class="text-[10px] uppercase tracking-wide text-white/60">Nächster</div>
          @if (vm?.next; as next) {
          <div class="flex items-start justify-between gap-2">
            <div class="text-sm font-semibold text-white truncate">{{ next.title }}</div>
            <div class="text-xs text-white/60 whitespace-pre-line text-right leading-tight shrink-0">
              {{ next.when }}
            </div>
          </div>
          <div class="text-xs text-white/60 truncate mt-1">
            {{ next.placeName }} <span class="opacity-60">•</span> {{ next.responsibleName }}
          </div>
          <div
            class="text-xs mt-1"
            [ngClass]="next.isOverCapacity ? 'text-rose-400' : 'text-white/60'"
          >
            {{ next.capacityText }}
          </div>
          } @else {
          <div class="text-sm font-semibold text-white whitespace-pre-line leading-tight">—</div>
          }
        </div>
      </div>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanningDashboardWidget {
  private readonly missions = inject(MissionsService);
  private readonly places = inject(PlacesService);
  private readonly persons = inject(PersonService);
  private readonly router = inject(Router);

  readonly vm$ = combineLatest([
    this.missions.getAll(),
    this.places.getAll(),
    this.persons.getAll(),
  ]).pipe(
    map(([missions, places, persons]): PlanningWidgetVm => {
      const now = Date.now();

      const placeById = new Map((places ?? []).map((p) => [p.id, p] as const));
      const personById = new Map((persons ?? []).map((p) => [p.id, p] as const));

      const active = (missions ?? [])
        .filter((m) => m.status === 'active' || (m.startAt <= now && m.endAt >= now && m.status !== 'cancelled'))
        .sort((a, b) => a.startAt - b.startAt)[0];

      const next = (missions ?? [])
        .filter((m) => m.startAt >= now && m.status !== 'cancelled' && m.status !== 'done')
        .sort((a, b) => a.startAt - b.startAt)[0];

      return {
        current: active ? this.toItemVm(active, placeById, personById) : null,
        next: next ? this.toItemVm(next, placeById, personById) : null,
      };
    }),
    catchError(() => of({ current: null, next: null } satisfies PlanningWidgetVm))
  );

  private toItemVm(
    mission: MissionDoc,
    placeById: Map<string, PlaceDoc>,
    personById: Map<string, PersonDoc>
  ): MissionWidgetItemVm {
    const place = placeById.get(mission.placeId);
    const placeName = place?.name ?? '—';

    const max = place?.capacity?.maxPersons;
    const placeMaxPersons = typeof max === 'number' && max > 0 ? max : null;
    const assignedCount = (mission.assignedPersonIds ?? []).length;
    const isOverCapacity = !!placeMaxPersons && assignedCount > placeMaxPersons;

    const capacityText = placeMaxPersons
      ? `${assignedCount}/${placeMaxPersons} AdZS`
      : `${assignedCount} AdZS`;

    const responsible = mission.responsiblePersonId
      ? personById.get(mission.responsiblePersonId)
      : null;

    const responsibleName = responsible
      ? `${responsible.grunddaten.nachname} ${responsible.grunddaten.vorname}`
      : '—';

    return {
      title: mission.title || '—',
      when: this.formatTs(mission.startAt),
      placeName,
      responsibleName,
      capacityText,
      isOverCapacity,
    };
  }

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
