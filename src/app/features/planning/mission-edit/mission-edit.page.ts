import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    inject,
    OnInit,
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
    FormBuilder,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { MissionDoc, MissionStatus } from '@core/models/mission.model';
import { PlaceDoc } from '@core/models/place.model';
import { PersonDoc } from '@core/models/person.model';
import { LoggerService } from '@core/services/logger.service';
import { PersonService } from '@core/services/person.service';
import { PlacesService } from '@features/places/services/places.service';
import { ZsoButton } from '@shared/ui/zso-button/zso-button';
import { ZsoInputField } from '@shared/ui/zso-input-field/zso-input-field';
import { MissionsService } from '../services/missions.service';

@Component({
    selector: 'zso-mission-edit',
    standalone: true,
    imports: [CommonModule, RouterModule, ReactiveFormsModule, ZsoInputField, ZsoButton],
    templateUrl: './mission-edit.page.html',
    styleUrls: ['./mission-edit.page.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MissionEditPage implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly missionsService = inject(MissionsService);
    private readonly placesService = inject(PlacesService);
    private readonly personService = inject(PersonService);
    private readonly logger = inject(LoggerService);
    private readonly cdr = inject(ChangeDetectorRef);

    missionId: string | null = null;
    isNew = true;

    isLoading = true;
    isSaving = false;
    isDeleting = false;
    errorMsg: string | null = null;

    places: PlaceDoc[] = [];
    persons: PersonDoc[] = [];
    filteredPersons: PersonDoc[] = [];
    personSearch = '';

    statusOptions: Array<{ value: MissionStatus; label: string }> = [
        { value: 'planned', label: 'Geplant' },
        { value: 'active', label: 'Aktiv' },
        { value: 'done', label: 'Erledigt' },
        { value: 'cancelled', label: 'Abgesagt' },
        { value: 'draft', label: 'Entwurf' },
    ];

    form = this.fb.group({
        title: ['', Validators.required],
        description: [''],
        status: ['planned' as MissionStatus, Validators.required],
        placeId: ['', Validators.required],
        startDate: ['', Validators.required],
        startTime: ['08:00', Validators.required],
        endDate: ['', Validators.required],
        endTime: ['17:00', Validators.required],
        assignedPersonIds: this.fb.control<string[]>([]),
    });

    get placeOptions(): Array<{ value: string; label: string }> {
        return this.places.map((p) => ({ value: p.id, label: p.name }));
    }

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        this.isNew = !id;
        this.missionId = id;

        void this.init();
    }

    private async init(): Promise<void> {
        this.isLoading = true;
        this.errorMsg = null;
        this.cdr.markForCheck();

        try {
            const [places, persons] = await Promise.all([
                firstValueFrom(this.placesService.getAll()),
                firstValueFrom(this.personService.getAll()),
            ]);

            this.places = places;
            this.persons = persons
                .slice()
                .sort((a, b) =>
                    `${a.grunddaten.nachname} ${a.grunddaten.vorname}`.localeCompare(
                        `${b.grunddaten.nachname} ${b.grunddaten.vorname}`
                    )
                );
            this.applyPersonFilter();

            if (!this.isNew && this.missionId) {
                const mission = await firstValueFrom(
                    this.missionsService.getById(this.missionId)
                );
                if (!mission) {
                    this.errorMsg = 'Einsatz nicht gefunden';
                } else {
                    this.patchMission(mission);
                }
            } else {
                // default endDate = startDate initially
                const today = this.toDateInputValue(Date.now());
                this.form.patchValue({ startDate: today, endDate: today });
            }
        } catch (err) {
            this.logger.error('MissionEditPage', 'init failed', err);
            this.errorMsg = 'Fehler beim Laden';
        } finally {
            this.isLoading = false;
            this.cdr.markForCheck();
        }
    }

    private patchMission(m: MissionDoc): void {
        this.form.patchValue({
            title: m.title,
            description: m.description ?? '',
            status: m.status,
            placeId: m.placeId,
            startDate: this.toDateInputValue(m.startAt),
            startTime: this.toTimeInputValue(m.startAt),
            endDate: this.toDateInputValue(m.endAt),
            endTime: this.toTimeInputValue(m.endAt),
            assignedPersonIds: m.assignedPersonIds ?? [],
        });
    }

    onPersonSearch(v: string): void {
        this.personSearch = v;
        this.applyPersonFilter();
        this.cdr.markForCheck();
    }

    private applyPersonFilter(): void {
        const q = this.personSearch.trim().toLowerCase();
        if (!q) {
            this.filteredPersons = this.persons;
            return;
        }
        this.filteredPersons = this.persons.filter((p) => {
            const full = `${p.grunddaten.vorname} ${p.grunddaten.nachname}`.toLowerCase();
            return full.includes(q);
        });
    }

    isAssigned(personId: string): boolean {
        const ids = this.form.get('assignedPersonIds')?.value ?? [];
        return ids.includes(personId);
    }

    togglePerson(personId: string): void {
        const ctrl = this.form.get('assignedPersonIds');
        const ids = (ctrl?.value ?? []).slice();
        const idx = ids.indexOf(personId);
        if (idx >= 0) ids.splice(idx, 1);
        else ids.push(personId);
        ctrl?.setValue(ids);
        ctrl?.markAsDirty();
        this.cdr.markForCheck();
    }

    async save(): Promise<void> {
        if (this.isSaving) return;

        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const v = this.form.value as any;
        const startAt = this.combineDateTime(v.startDate, v.startTime);
        const endAt = this.combineDateTime(v.endDate, v.endTime);

        if (!startAt || !endAt) {
            this.errorMsg = 'Start-/Endzeit ungültig';
            this.cdr.markForCheck();
            return;
        }
        if (endAt < startAt) {
            this.errorMsg = 'Ausrückzeit muss nach der Einrückzeit liegen';
            this.cdr.markForCheck();
            return;
        }

        this.isSaving = true;
        this.errorMsg = null;
        this.cdr.markForCheck();

        const payload = {
            title: v.title as string,
            description: (v.description as string) || undefined,
            status: v.status as MissionStatus,
            placeId: v.placeId as string,
            startAt,
            endAt,
            assignedPersonIds: (v.assignedPersonIds as string[]) ?? [],
        };

        try {
            if (this.isNew) {
                const newId = await firstValueFrom(this.missionsService.create(payload as any));
                await this.router.navigate(['/planning', newId]);
            } else if (this.missionId) {
                await firstValueFrom(this.missionsService.update(this.missionId, payload as any));
                await this.router.navigate(['/planning', this.missionId]);
            }
        } catch (err) {
            this.logger.error('MissionEditPage', 'save failed', err);
            this.errorMsg = 'Speichern fehlgeschlagen';
        } finally {
            this.isSaving = false;
            this.cdr.markForCheck();
        }
    }

    async delete(): Promise<void> {
        if (this.isNew || !this.missionId || this.isDeleting) return;
        if (!confirm('Einsatz wirklich löschen?')) return;

        this.isDeleting = true;
        this.errorMsg = null;
        this.cdr.markForCheck();

        try {
            await firstValueFrom(this.missionsService.delete(this.missionId));
            await this.router.navigate(['/planning']);
        } catch (err) {
            this.logger.error('MissionEditPage', 'delete failed', err);
            this.errorMsg = 'Löschen fehlgeschlagen';
        } finally {
            this.isDeleting = false;
            this.cdr.markForCheck();
        }
    }

    cancel(): void {
        if (this.isNew) {
            this.router.navigate(['/planning']);
        } else if (this.missionId) {
            this.router.navigate(['/planning', this.missionId]);
        }
    }

    private toDateInputValue(ts: number): string {
        const d = new Date(ts);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    private toTimeInputValue(ts: number): string {
        const d = new Date(ts);
        const hh = String(d.getHours()).padStart(2, '0');
        const mi = String(d.getMinutes()).padStart(2, '0');
        return `${hh}:${mi}`;
    }

    private combineDateTime(dateStr: string, timeStr: string): number | null {
        if (!dateStr || !timeStr) return null;
        const [y, m, d] = dateStr.split('-').map((x) => Number(x));
        const [hh, mm] = timeStr.split(':').map((x) => Number(x));
        if (!y || !m || !d) return null;
        const dt = new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0);
        return dt.getTime();
    }
}
