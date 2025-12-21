import { CommonModule, DatePipe } from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    inject,
    OnDestroy,
    OnInit,
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Location } from '@angular/common';
import { MissionDoc, MissionStatus } from '@core/models/mission.model';
import { PlaceDoc } from '@core/models/place.model';
import { PersonDoc } from '@core/models/person.model';
import { LoggerService } from '@core/services/logger.service';
import { PersonService } from '@core/services/person.service';
import { PlacesService } from '@features/places/services/places.service';
import { ZsoButton } from '@shared/ui/zso-button/zso-button';
import { ZsoSkeleton } from '@shared/ui/zso-skeleton/zso-skeleton';
import { ZsoStateMessage } from '@shared/ui/zso-state-message/zso-state-message';
import { MissionsService } from '../services/missions.service';

interface AssignedPersonVm {
    id: string;
    name: string;
    zug: number;
    gruppe: string;
}

interface ResponsiblePersonVm {
    id: string;
    name: string;
    grad: string;
}

@Component({
    selector: 'zso-mission-detail',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        DatePipe,
        ZsoButton,
        ZsoSkeleton,
        ZsoStateMessage,
    ],
    templateUrl: './mission-detail.page.html',
    styleUrls: ['./mission-detail.page.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MissionDetailPage implements OnInit, OnDestroy {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly location = inject(Location);
    private readonly missionsService = inject(MissionsService);
    private readonly placesService = inject(PlacesService);
    private readonly personService = inject(PersonService);
    private readonly logger = inject(LoggerService);
    private readonly cdr = inject(ChangeDetectorRef);

    private readonly destroy$ = new Subject<void>();

    missionId!: string;

    mission: MissionDoc | null = null;
    place: PlaceDoc | null = null;
    assignedPersons: AssignedPersonVm[] = [];
    responsiblePerson: ResponsiblePersonVm | null = null;

    isLoading = true;
    errorMsg: string | null = null;
    isDeleting = false;

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) {
            this.router.navigate(['/planning']);
            return;
        }

        this.missionId = id;
        this.load(id);
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private load(id: string): void {
        this.isLoading = true;
        this.errorMsg = null;
        this.cdr.markForCheck();

        this.missionsService
            .getById(id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (m) => {
                    if (!m) {
                        this.mission = null;
                        this.errorMsg = 'Einsatz nicht gefunden';
                        this.isLoading = false;
                        this.cdr.markForCheck();
                        return;
                    }

                    this.mission = m;
                    this.loadRelated(m);
                },
                error: (err) => {
                    this.logger.error('MissionDetailPage', 'load failed', err);
                    this.errorMsg = 'Fehler beim Laden';
                    this.isLoading = false;
                    this.cdr.markForCheck();
                },
            });
    }

    private async loadRelated(m: MissionDoc): Promise<void> {
        try {
            const [place, persons] = await Promise.all([
                firstValueFrom(this.placesService.getById(m.placeId)),
                firstValueFrom(this.personService.getAll()),
            ]);

            this.place = (place ?? null) as PlaceDoc | null;

            const personById = new Map((persons ?? []).map((p) => [p.id, p] as const));

            const rp = m.responsiblePersonId ? personById.get(m.responsiblePersonId) : null;
            this.responsiblePerson = rp
                ? {
                    id: rp.id,
                    name: `${rp.grunddaten.vorname} ${rp.grunddaten.nachname}`,
                    grad: rp.grunddaten.grad || '—',
                }
                : null;

            this.assignedPersons = (m.assignedPersonIds ?? [])
                .map((pid) => personById.get(pid))
                .filter((p): p is PersonDoc => !!p)
                .map((p) => ({
                    id: p.id,
                    name: `${p.grunddaten.vorname} ${p.grunddaten.nachname}`,
                    zug: p.zivilschutz.einteilung.zug,
                    gruppe: p.zivilschutz.einteilung.gruppe || '—',
                }))
                .sort((a, b) => a.name.localeCompare(b.name));
        } catch (err) {
            this.logger.error('MissionDetailPage', 'loadRelated failed', err);
        } finally {
            this.isLoading = false;
            this.cdr.markForCheck();
        }
    }

    back(): void {
        const navId = (window.history.state as any)?.navigationId ?? 0;
        if (navId > 1) {
            this.location.back();
            return;
        }
        this.goOverview();
    }

    goOverview(): void {
        this.router.navigate(['/planning']);
    }

    edit(): void {
        this.router.navigate(['/planning', this.missionId, 'edit']);
    }

    get placeMaxPersons(): number | null {
        const max = this.place?.capacity?.maxPersons;
        return typeof max === 'number' && max > 0 ? max : null;
    }

    get assignedPersonsCount(): number {
        return this.mission?.assignedPersonIds?.length ?? 0;
    }

    get isOverPlaceCapacity(): boolean {
        const max = this.placeMaxPersons;
        if (!max) return false;
        return this.assignedPersonsCount > max;
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

    openPlace(): void {
        if (!this.place?.id) return;
        this.router.navigate(['/places', this.place.id]);
    }

    openPerson(id: string): void {
        this.router.navigate(['/adsz', id]);
    }

    async delete(): Promise<void> {
        if (this.isDeleting || !this.missionId) return;
        if (!confirm('Einsatz wirklich löschen?')) return;

        this.isDeleting = true;
        this.cdr.markForCheck();

        this.missionsService
            .delete(this.missionId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.router.navigate(['/planning']);
                },
                error: (err) => {
                    this.logger.error('MissionDetailPage', 'delete failed', err);
                    this.isDeleting = false;
                    this.errorMsg = 'Löschen fehlgeschlagen';
                    this.cdr.markForCheck();
                },
            });
    }
}
