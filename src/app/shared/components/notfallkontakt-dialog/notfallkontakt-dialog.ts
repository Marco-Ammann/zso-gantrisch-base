// src/app/shared/components/notfallkontakt-dialog/notfallkontakt-dialog.ts
import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { ZsoInputField } from '../../ui/zso-input-field/zso-input-field';
import { ZsoButton } from '../../ui/zso-button/zso-button';
import { NotfallkontaktDoc } from '@core/models/person.model';

@Component({
  selector: 'zso-notfallkontakt-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ZsoInputField, ZsoButton],
  template: `
    <!-- Backdrop -->
    <div
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 opacity-0 pointer-events-none transition-opacity duration-200"
      [class.opacity-100]="visible"
      [class.pointer-events-auto]="visible"
      (click)="onBackdrop($event)"
    >
      <!-- Dialog Card -->
      <div
        class="glass-card p-6 max-w-md w-full mx-auto transform transition-all scale-95"
        [class.scale-100]="visible"
        (click)="$event.stopPropagation()"
      >
        <h3
          class="text-lg font-semibold text-white mb-4 flex items-center gap-2"
        >
          <span class="material-symbols-outlined text-base"
            >contact_emergency</span
          >
          {{
            isEditing
              ? 'Notfallkontakt bearbeiten'
              : 'Notfallkontakt hinzufügen'
          }}
        </h3>

        <form [formGroup]="form" (ngSubmit)="save()" class="space-y-4">
          <zso-input-field
            formControlName="name"
            label="Name"
            placeholder="Vollständiger Name"
          >
          </zso-input-field>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1"
                >Beziehung</label
              >
              <select formControlName="beziehung" class="sort-select w-full">
                <option value="">Beziehung wählen</option>
                <option
                  *ngFor="let beziehung of beziehungOptions"
                  [value]="beziehung"
                >
                  {{ beziehung }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1"
                >Priorität</label
              >
              <select formControlName="prioritaet" class="sort-select w-full">
                <option *ngFor="let prio of prioritaetOptions" [value]="prio">
                  {{ prio }}
                </option>
              </select>
            </div>
          </div>

          <zso-input-field
            formControlName="telefonnummer"
            label="Telefonnummer"
            type="text"
            placeholder="079 123 45 67"
          >
          </zso-input-field>

          <!-- Error Message -->
          @if (errorMsg) {
          <div class="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-rose-400 text-sm"
                >error</span
              >
              <p class="text-sm text-rose-300">{{ errorMsg }}</p>
            </div>
          </div>
          }

          <div class="flex justify-end gap-3 pt-4">
            <zso-button type="neutral" size="sm" (click)="cancel()">
              Abbrechen
            </zso-button>
            <zso-button
              type="primary"
              size="sm"
              htmlType="submit"
              [loading]="isSaving"
            >
              {{ isEditing ? 'Aktualisieren' : 'Hinzufügen' }}
            </zso-button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class NotfallkontaktDialogComponent implements OnInit {
  @Input() visible = false;
  @Input() kontakt: NotfallkontaktDoc | null = null;
  @Input() personId = '';

  @Output() saved = new EventEmitter<any>();
  @Output() closed = new EventEmitter<void>();

  form!: FormGroup;
  isSaving = false;
  errorMsg: string | null = null;

  readonly beziehungOptions = [
    'Partner/in',
    'Ehepartner/in',
    'Lebenspartner/in',
    'Mutter',
    'Vater',
    'Eltern',
    'Sohn',
    'Tochter',
    'Kind',
    'Bruder',
    'Schwester',
    'Geschwister',
    'Freund/in',
    'Arbeitskollege/in',
    'Nachbar/in',
    'Andere',
  ];

  readonly prioritaetOptions = [1, 2, 3, 4, 5];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initForm();
  }

  ngOnChanges(): void {
    if (this.form && this.kontakt) {
      this.populateForm();
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      name: ['', Validators.required],
      beziehung: ['', Validators.required],
      telefonnummer: ['', Validators.required],
      prioritaet: [1, Validators.required],
    });
  }

  private populateForm(): void {
    if (this.kontakt) {
      this.form.patchValue({
        name: this.kontakt.name,
        beziehung: this.kontakt.beziehung,
        telefonnummer: this.kontakt.telefonnummer,
        prioritaet: this.kontakt.prioritaet,
      });
    }
  }

  get isEditing(): boolean {
    return !!this.kontakt;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMsg = 'Bitte alle Pflichtfelder ausfüllen';
      return;
    }

    this.isSaving = true;
    this.errorMsg = null;

    const formData = {
      ...this.form.value,
      personId: this.personId,
      erstelltAm: this.isEditing ? this.kontakt!.erstelltAm : Date.now(),
      id: this.isEditing ? this.kontakt!.id : undefined,
    };

    this.saved.emit(formData);
  }

  cancel(): void {
    this.form.reset();
    this.errorMsg = null;
    this.isSaving = false;
    this.closed.emit();
  }

  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.cancel();
    }
  }

  onSaveComplete(): void {
    this.isSaving = false;
    this.form.reset();
    this.closed.emit();
  }

  onSaveError(error: string): void {
    this.isSaving = false;
    this.errorMsg = error;
  }
}
