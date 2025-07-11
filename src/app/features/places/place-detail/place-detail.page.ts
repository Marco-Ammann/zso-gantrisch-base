// src/app/features/places/place-detail/place-detail.page.ts
// Detail- & Bearbeitungsseite für einen Ort (Place).
// Alle Klassen/Dateinamen Englisch, sichtbare Texte Deutsch.

import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { PlacesService } from '../services/places.service';
import { PlaceDoc, PlaceType } from '@core/models/place.model';
import { LoggerService } from '@core/services/logger.service';

@Component({
  selector: 'zso-place-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './place-detail.page.html',
  styleUrls: ['./place-detail.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceDetailPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly placesService = inject(PlacesService);
  private readonly logger = inject(LoggerService);
  private readonly cdr = inject(ChangeDetectorRef);

  placeId: string | null = null;
  isNew = false;
  isSaving = false;
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

  ngOnInit(): void {
    this.placeId = this.route.snapshot.paramMap.get('id');
    this.isNew = !this.placeId || this.placeId === 'new';

    if (!this.isNew && this.placeId) {
      this.loadPlace(this.placeId);
    }
  }

  async loadPlace(id: string): Promise<void> {
    try {
      const place = await firstValueFrom(this.placesService.getById(id));
      if (place) {
        this.form.patchValue(place as any);
        this.logger.log('PlaceDetailPage', 'Place loaded', id);
      } else {
        this.errorMsg = 'Ort nicht gefunden';
      }
    } catch (err) {
      this.logger.error('PlaceDetailPage', 'loadPlace failed', err);
      this.errorMsg = 'Fehler beim Laden des Ortes';
    } finally {
      this.cdr.markForCheck();
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.errorMsg = null;
    this.cdr.markForCheck();

    const data = this.form.value as any;

    try {
      if (this.isNew) {
        const newId = await firstValueFrom(this.placesService.create(data));
        this.logger.log('PlaceDetailPage', 'Place created', newId);
        await this.router.navigate(['/places', newId]);
      } else if (this.placeId) {
        await firstValueFrom(this.placesService.update(this.placeId, data));
        this.logger.log('PlaceDetailPage', 'Place updated', this.placeId);
        await this.router.navigate(['/places']);
      }
    } catch (err) {
      this.logger.error('PlaceDetailPage', 'save failed', err);
      this.errorMsg = 'Speichern fehlgeschlagen';
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  cancel(): void {
    this.router.navigate(['/places']);
  }
}
