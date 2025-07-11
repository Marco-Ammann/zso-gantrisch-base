// src/app/features/places/place-edit/place-edit.page.ts
// Gemeinsame Seite zum Erstellen oder Bearbeiten eines Ortes.
// Für neue Orte wird die Route /places/new ohne ID verwendet.
// Für bestehende Orte wird /places/:id/edit verwendet.

import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { PlacesService } from '../services/places.service';
import { PlaceDoc, PlaceType } from '@core/models/place.model';
import { LoggerService } from '@core/services/logger.service';
import { ZsoInputField } from '@shared/ui/zso-input-field/zso-input-field';
import { ZsoButton } from '@shared/ui/zso-button/zso-button';
import { PlaceMap } from '../components/place-map/place-map';
import { PlaceNotesWidget } from '../components/place-notes-widget/place-notes-widget';

@Component({
  selector: 'zso-place-edit',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    ZsoInputField,
    ZsoButton,
    PlaceMap,
    PlaceNotesWidget,
  ],
  templateUrl: './place-edit.page.html',
  styleUrls: ['./place-edit.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceEditPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly placesService = inject(PlacesService);
  private readonly logger = inject(LoggerService);
  private readonly cdr = inject(ChangeDetectorRef);

  placeId: string | null = null;
  isNew = false;
  isSaving = false;
  isDeleting = false;
  errorMsg: string | null = null;

  types: { value: PlaceType; label: string }[] = [
    { value: 'accommodation', label: 'Heim' },
    { value: 'civil_protection_facility', label: 'Zivilschutzanlage' },
    { value: 'training_room', label: 'Schulungsraum' },
    { value: 'other', label: 'Sonstiges' },
  ];

  form = this.fb.group({
    name: ['', Validators.required],
    type: ['accommodation' as PlaceType, Validators.required],
    address: this.fb.group({
      street: ['', Validators.required],
      zip: ['', Validators.required],
      city: ['', Validators.required],
      country: ['Schweiz'],
    }),
    contactPerson: this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phone: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
    }),
    capacity: this.fb.group({
      maxPersons: [null],
    }),
  });

  /** --- Map helpers ---------------------------------------------------- */
  get mapLat(): number | null {
    const coords = (this.form.get('address') as any)?.value?.coordinates;
    return coords?.lat ?? null;
  }
  get mapLng(): number | null {
    const coords = (this.form.get('address') as any)?.value?.coordinates;
    return coords?.lng ?? null;
  }
  get mapAddress(): string {
    const addr = (this.form.get('address') as any)?.value;
    if (!addr) return '';
    return `${addr.street}, ${addr.zip} ${addr.city}`;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.isNew = !id;
    this.placeId = id;

    if (id) {
      this.loadPlace(id);
    }
  }

  private async loadPlace(id: string): Promise<void> {
    try {
      const place = await firstValueFrom(this.placesService.getById(id));
      if (!place) {
        this.errorMsg = 'Ort nicht gefunden';
      } else {
        this.form.patchValue(place as any);
      }
    } catch (err) {
      this.logger.error('PlaceEditPage', 'loadPlace failed', err);
      this.errorMsg = 'Fehler beim Laden des Ortes';
    } finally {
      this.cdr.markForCheck();
    }
  }

  async save(): Promise<void> {
    if (this.isSaving) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.errorMsg = null;
    this.cdr.markForCheck();

    const data = this.form.value as Omit<PlaceDoc, 'id'>;

    try {
      if (this.isNew) {
        const newId = await firstValueFrom(this.placesService.create(data));
        await this.router.navigate(['/places', newId]);
      } else if (this.placeId) {
        await firstValueFrom(this.placesService.update(this.placeId, data));
        await this.router.navigate(['/places', this.placeId]);
      }
    } catch (err) {
      this.logger.error('PlaceEditPage', 'save failed', err);
      this.errorMsg = 'Speichern fehlgeschlagen';
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  async delete(): Promise<void> {
    if (this.isNew || !this.placeId || this.isDeleting) return;
    if (!confirm('Ort wirklich löschen?')) return;
    this.isDeleting = true;
    try {
      await firstValueFrom(this.placesService.delete(this.placeId));
      await this.router.navigate(['/places']);
    } catch (err) {
      this.logger.error('PlaceEditPage', 'delete failed', err);
      this.errorMsg = 'Löschen fehlgeschlagen';
    } finally {
      this.isDeleting = false;
      this.cdr.markForCheck();
    }
  }

  cancel(): void {
    if (this.isNew) {
      this.router.navigate(['/places']);
    } else if (this.placeId) {
      this.router.navigate(['/places', this.placeId]);
    }
  }
}
