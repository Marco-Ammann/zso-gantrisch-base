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
    placeMaxPersons: number | null;
    isOverPlaceCapacity: boolean;
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

    missions$ = this.missionsService.getAll().pipe(startWith(null as MissionDoc[] | null));
    places$ = this.placesService.getAll().pipe(startWith(null as PlaceDoc[] | null));
    persons$ = this.personService.getAll().pipe(startWith(null as PersonDoc[] | null));

    rows$ = combineLatest([this.missions$, this.places$, this.persons$, this.search$, this.status$]).pipe(
        map(([missions, places, persons, search, status]) => {
            if (!missions || !places || !persons) return null;

            const placeById = new Map(places.map((p) => [p.id, p] as const));
            const q = search.trim().toLowerCase();

            return missions
                .slice()
                .sort((a, b) => a.startAt - b.startAt)
                .filter((m) => (status === 'all' ? true : m.status === status))
                .filter((m) => (q ? m.title.toLowerCase().includes(q) : true))
                .map((m): MissionRow => {
                    const placeName = placeById.get(m.placeId)?.name ?? '—';
                    const max = placeById.get(m.placeId)?.capacity?.maxPersons;
                    const placeMaxPersons = typeof max === 'number' && max > 0 ? max : null;
                    const assignedPersonsCount = m.assignedPersonIds?.length ?? 0;
                    return {
                        mission: m,
                        placeName,
                        assignedPersonsCount,
                        placeMaxPersons,
                        isOverPlaceCapacity: !!placeMaxPersons && assignedPersonsCount > placeMaxPersons,
                    };
                });
        })
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
