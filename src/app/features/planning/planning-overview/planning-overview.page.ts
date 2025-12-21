import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BehaviorSubject, combineLatest, map, startWith } from 'rxjs';

import { MissionDoc, MissionStatus } from '@core/models/mission.model';
import { PlaceDoc } from '@core/models/place.model';
import { PersonDoc } from '@core/models/person.model';
import { PersonService } from '@core/services/person.service';
import { ZsoButton } from '@shared/ui/zso-button/zso-button';
import { ZsoSkeleton } from '@shared/ui/zso-skeleton/zso-skeleton';
import { ZsoStateMessage } from '@shared/ui/zso-state-message/zso-state-message';
import { PlacesService } from '@features/places/services/places.service';
import { MissionsService } from '../services/missions.service';

interface MissionRow {
    mission: MissionDoc;
    placeName: string;
    assignedPersonsCount: number;
    responsibleLabel: string;
    placeMaxPersons: number | null;
    isOverPlaceCapacity: boolean;
}

interface PlanningOverviewVm {
    rows: MissionRow[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    placeOptions: Array<{ value: string; label: string }>;
    selectedPlaceId: string;
    dateFrom: string;
    dateTo: string;
}

@Component({
    selector: 'zso-planning-overview',
    standalone: true,
    imports: [CommonModule, RouterModule, DatePipe, ZsoButton, ZsoSkeleton, ZsoStateMessage],
    templateUrl: './planning-overview.page.html',
    styleUrls: ['./planning-overview.page.scss'],
})
export class PlanningOverviewPage {
    private readonly missionsService = inject(MissionsService);
    private readonly placesService = inject(PlacesService);
    private readonly personService = inject(PersonService);

    private readonly search$ = new BehaviorSubject<string>('');
    private readonly status$ = new BehaviorSubject<MissionStatus | 'all'>('all');
    private readonly placeId$ = new BehaviorSubject<string>('all');
    private readonly dateFrom$ = new BehaviorSubject<string>('');
    private readonly dateTo$ = new BehaviorSubject<string>('');
    private readonly page$ = new BehaviorSubject<number>(1);
    private readonly pageSize$ = new BehaviorSubject<number>(25);

    missions$ = this.missionsService.getAll().pipe(startWith(null as MissionDoc[] | null));
    places$ = this.placesService.getAll().pipe(startWith(null as PlaceDoc[] | null));
    persons$ = this.personService.getAll().pipe(startWith(null as PersonDoc[] | null));

    vm$ = combineLatest([
        this.missions$,
        this.places$,
        this.persons$,
        this.search$,
        this.status$,
        this.placeId$,
        this.dateFrom$,
        this.dateTo$,
        this.page$,
        this.pageSize$,
    ]).pipe(
        map(
            ([
                missions,
                places,
                persons,
                search,
                status,
                placeId,
                dateFrom,
                dateTo,
                page,
                pageSize,
            ]) => {
                if (!missions || !places || !persons) return null;

                const placeById = new Map(places.map((p) => [p.id, p] as const));
                const personById = new Map(persons.map((p) => [p.id, p] as const));

                const placeOptions: Array<{ value: string; label: string }> = [
                    { value: 'all', label: 'Alle Orte' },
                    ...places.map((p) => ({ value: p.id, label: p.name })),
                ];

                const q = search.trim().toLowerCase();
                const fromTs = this.toDayStartTs(dateFrom);
                const toTs = this.toDayEndTs(dateTo);

                const filtered = missions
                    .slice()
                    .sort((a, b) => a.startAt - b.startAt)
                    .filter((m) => (status === 'all' ? true : m.status === status))
                    .filter((m) => (placeId === 'all' ? true : m.placeId === placeId))
                    .filter((m) => (q ? m.title.toLowerCase().includes(q) : true))
                    .filter((m) => (fromTs ? m.startAt >= fromTs : true))
                    .filter((m) => (toTs ? m.startAt <= toTs : true))
                    .map((m): MissionRow => {
                        const placeName = placeById.get(m.placeId)?.name ?? '—';
                        const rp = m.responsiblePersonId
                            ? personById.get(m.responsiblePersonId)
                            : null;
                        const responsibleLabel = rp
                            ? `${rp.grunddaten.nachname} ${rp.grunddaten.vorname} (${rp.grunddaten.grad || '—'})`
                            : '—';
                        const max = placeById.get(m.placeId)?.capacity?.maxPersons;
                        const placeMaxPersons = typeof max === 'number' && max > 0 ? max : null;
                        const assignedPersonsCount = m.assignedPersonIds?.length ?? 0;
                        return {
                            mission: m,
                            placeName,
                            assignedPersonsCount,
                            responsibleLabel,
                            placeMaxPersons,
                            isOverPlaceCapacity:
                                !!placeMaxPersons && assignedPersonsCount > placeMaxPersons,
                        };
                    });

                const safePageSize = Math.max(1, Number.isFinite(pageSize) ? pageSize : 25);
                const total = filtered.length;
                const totalPages = Math.max(1, Math.ceil(total / safePageSize));
                const safePage = Math.min(Math.max(1, page), totalPages);
                const start = (safePage - 1) * safePageSize;
                const rows = filtered.slice(start, start + safePageSize);

                return {
                    rows,
                    total,
                    page: safePage,
                    pageSize: safePageSize,
                    totalPages,
                    placeOptions,
                    selectedPlaceId: placeId,
                    dateFrom,
                    dateTo,
                } satisfies PlanningOverviewVm;
            }
        )
    );

    statusOptions: Array<{ value: MissionStatus | 'all'; label: string }> = [
        { value: 'all', label: 'Alle' },
        { value: 'planned', label: 'Geplant' },
        { value: 'active', label: 'Aktiv' },
        { value: 'done', label: 'Erledigt' },
        { value: 'cancelled', label: 'Abgesagt' },
        { value: 'draft', label: 'Entwurf' },
    ];

    setSearch(v: string) {
        this.search$.next(v);
        this.page$.next(1);
    }

    setStatus(v: string) {
        const allowed = new Set<MissionStatus | 'all'>([
            'all',
            'draft',
            'planned',
            'active',
            'done',
            'cancelled',
        ]);
        this.status$.next(allowed.has(v as any) ? (v as any) : 'all');
        this.page$.next(1);
    }

    setPlaceId(v: string) {
        this.placeId$.next(v || 'all');
        this.page$.next(1);
    }

    setDateFrom(v: string) {
        this.dateFrom$.next((v ?? '').trim());
        this.page$.next(1);
    }

    setDateTo(v: string) {
        this.dateTo$.next((v ?? '').trim());
        this.page$.next(1);
    }

    setPageSize(v: unknown) {
        const parsed = typeof v === 'string' ? Number.parseInt(v, 10) : (v as number);
        const next = Number.isFinite(parsed) && parsed > 0 ? parsed : 25;
        this.pageSize$.next(next);
        this.page$.next(1);
    }

    prevPage(): void {
        const current = this.page$.value;
        this.page$.next(Math.max(1, current - 1));
    }

    nextPage(): void {
        const current = this.page$.value;
        this.page$.next(current + 1);
    }

    private toDayStartTs(dateStr: string): number | null {
        const v = (dateStr ?? '').trim();
        if (!v) return null;
        const d = new Date(v);
        if (Number.isNaN(d.getTime())) return null;
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    }

    private toDayEndTs(dateStr: string): number | null {
        const v = (dateStr ?? '').trim();
        if (!v) return null;
        const d = new Date(v);
        if (Number.isNaN(d.getTime())) return null;
        d.setHours(23, 59, 59, 999);
        return d.getTime();
    }

    trackRow(_: number, row: MissionRow) {
        return row.mission.id;
    }

    statusLabel(status: MissionStatus): string {
        return (
            {
                draft: 'Entwurf',
                planned: 'Geplant',
                active: 'Aktiv',
                done: 'Erledigt',
                cancelled: 'Abgesagt',
            } as const
        )[status];
    }

    statusBadgeClass(status: MissionStatus): string {
        return (
            {
                draft: 'badge--unverified',
                planned: 'badge--pending',
                active: 'badge--approved',
                done: 'badge--verified',
                cancelled: 'badge--blocked',
            } as const
        )[status];
    }
}
