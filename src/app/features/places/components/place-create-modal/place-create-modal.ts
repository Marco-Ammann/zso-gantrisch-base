// src/app/features/places/components/place-create-modal/place-create-modal.ts
// Simplified create modal for Orte (places). Only essential fields.
// Component names in English, UI text in German.

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  inject,
  OnChanges,
  OnInit,
  ChangeDetectorRef,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
} from '@angular/forms';

import { ZsoButton } from '@shared/ui/zso-button/zso-button';
import { ZsoInputField } from '@shared/ui/zso-input-field/zso-input-field';
import { PlaceDoc, PlaceType } from '@core/models/place.model';
import { PlacesService } from '../../services/places.service';
import { firstValueFrom } from 'rxjs';
import { LoggerService } from '@core/services/logger.service';
import { ScrollLockService } from '@core/services/scroll-lock.service';

@Component({
  selector: 'zso-place-create-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ZsoButton, ZsoInputField],
  templateUrl: './place-create-modal.html',
  styleUrls: ['./place-create-modal.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceCreateModal implements OnInit, OnChanges, OnDestroy {
  /** Sichtbarkeit steuern */
  @Input() visible = false;
  /** Emits neu erstelltes PlaceDoc (inklusive ID) */
  @Output() created = new EventEmitter<PlaceDoc>();
  /** Emits bei Schließen ohne Speichern */
  @Output() closed = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly placesService = inject(PlacesService);
  private readonly logger = inject(LoggerService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly scrollLock = inject(ScrollLockService);
  private scrollLocked = false;

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
    // Nothing to init yet
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['visible']) return;

    if (this.visible && !this.scrollLocked) {
      this.scrollLock.lock();
      this.scrollLocked = true;
    }

    if (!this.visible && this.scrollLocked) {
      this.scrollLock.unlock();
      this.scrollLocked = false;
    }
  }

  ngOnDestroy(): void {
    if (this.scrollLocked) {
      this.scrollLock.unlock();
      this.scrollLocked = false;
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

    const data = this.form.value as any;

    try {
      const id = await firstValueFrom(this.placesService.create(data));
      this.logger.log('PlaceCreateModal', 'Ort erstellt', id);
      this.created.emit({ ...data, id } as PlaceDoc);
      this.reset();
    } catch (err) {
      this.logger.error('PlaceCreateModal', 'Fehler beim Erstellen', err);
      this.errorMsg = 'Fehler beim Erstellen';
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  cancel(): void {
    if (this.isSaving) return;
    this.reset();
    this.closed.emit();
  }

  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget && !this.isSaving) {
      this.cancel();
    }
  }

  private reset(): void {
    this.form.reset({
      type: 'accommodation',
      address: { country: 'Schweiz' },
    });
    this.errorMsg = null;
  }
}
