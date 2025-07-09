import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ZsoButton } from '@shared/ui/zso-button/zso-button';
import { ZsoInputField } from '@shared/ui/zso-input-field/zso-input-field';
import { PersonService } from '@core/services/person.service';
import { NotfallkontaktDoc } from '@core/models/person.model';
import { take } from 'rxjs';

@Component({
  selector: 'zso-notfallkontakt-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ZsoButton, ZsoInputField],
  templateUrl: './notfallkontakt-modal.html',
  styleUrls: ['./notfallkontakt-modal.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotfallkontaktModal implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly personService = inject(PersonService);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() personId!: string;
  @Input() kontakt: NotfallkontaktDoc | null = null;
  @Input() visible = false;

  @Output() saved = new EventEmitter<NotfallkontaktDoc>();
  @Output() closed = new EventEmitter<void>();

  isSaving = false;

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    beziehung: ['', Validators.required],
    telefonnummer: ['', Validators.required],
    prioritaet: [1, [Validators.required, Validators.min(1)]],
  });

  get isEditMode() {
    return !!this.kontakt?.id;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['kontakt'] && this.kontakt) {
      this.form.patchValue({
        name: this.kontakt.name,
        beziehung: this.kontakt.beziehung,
        telefonnummer: this.kontakt.telefonnummer,
        prioritaet: this.kontakt.prioritaet,
      });
      this.cdr.markForCheck();
    }
    if (changes['kontakt'] && !this.kontakt) {
      this.form.reset({ prioritaet: 1 });
    }

    // When modal becomes visible for creating new, clear form
    if (changes['visible'] && this.visible && !this.isEditMode) {
      this.form.reset({ prioritaet: 1 });
      this.cdr.markForCheck();
    }
  }

  cancel() {
    this.closed.emit();
  }

  save() {
    if (this.isSaving) return;
    // lock immediately
    this.isSaving = true;

    if (!this.form.valid) {
      console.warn('NotfallkontaktModal: Form invalid', this.form.value, this.form.errors);
      this.form.markAllAsTouched();
      this.isSaving = false;
      return;
    }

    console.log('NotfallkontaktModal: Saving', this.isEditMode ? 'edit' : 'create', this.form.getRawValue());

    const value = this.form.getRawValue(); // all controls non-nullable
    this.cdr.markForCheck();

    if (this.isEditMode && this.kontakt) {
      this.personService
        .updateNotfallkontakt(this.kontakt.id, value)
        .pipe(take(1))
        .subscribe({
          next: () => {
            this.isSaving = false;
            this.saved.emit({ ...this.kontakt!, ...value } as NotfallkontaktDoc);
            this.closed.emit();
          },
          error: () => {
            this.isSaving = false;
            this.cdr.markForCheck();
          },
        });
    } else {
      const data = {
        ...value,
        personId: this.personId,
        erstelltAm: Date.now(),
      } as Omit<NotfallkontaktDoc, 'id'>;
      this.personService
        .createNotfallkontakt(data)
        .pipe(take(1))
        .subscribe({
          next: (id) => {
            this.isSaving = false;
            this.saved.emit({ ...data, id });
            this.closed.emit();
          },
          error: () => {
            this.isSaving = false;
            this.cdr.markForCheck();
          },
        });
    }
  }
}
