// src/app/shared/components/user-edit-dialog/user-edit-dialog.ts
import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ZsoInputField } from '../../ui/zso-input-field/zso-input-field';
import { ZsoButton } from '../../ui/zso-button/zso-button';
import { UserDoc } from '@core/models/user-doc';
import { ScrollLockService } from '@core/services/scroll-lock.service';

@Component({
  selector: 'zso-user-edit-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ZsoInputField, ZsoButton],
  template: `
    <!-- Backdrop ----------------------------------------------------------- -->
    <div
      class="fixed inset-0 bg-black/60 backdrop-blur-glass flex items-center justify-center z-50 p-4 opacity-0 pointer-events-none transition-opacity duration-200"
      [class.opacity-100]="visible"
      [class.pointer-events-auto]="visible"
      (click)="onBackdrop($event)"
    >
      <!-- Dialog Card ------------------------------------------------------ -->
      <div
        class="glass-card p-6 max-w-md w-full mx-auto transform transition-all scale-95"
        [class.scale-100]="visible"
        (click)="$event.stopPropagation()"
      >
        <h3
          class="text-lg font-semibold text-white mb-4 flex items-center gap-2"
        >
          <span class="material-symbols-outlined text-base">person</span>
          Profil bearbeiten
        </h3>

        <div class="space-y-4">
          <zso-input-field
            label="Vorname"
            [(ngModel)]="firstName"
          ></zso-input-field>
          <zso-input-field
            label="Nachname"
            [(ngModel)]="lastName"
          ></zso-input-field>
          <zso-input-field
            label="E-Mail"
            type="email"
            [(ngModel)]="email"
          ></zso-input-field>
          <zso-input-field
            label="Telefon"
            type="text"
            [(ngModel)]="phoneNumber"
          ></zso-input-field>
          <label class="block text-sm text-gray-300"
            >Geburtsdatum
            <input
              type="date"
              class="mt-1 w-full rounded bg-white/10 text-white p-2 outline-none"
              [(ngModel)]="birthDateStr"
            />
          </label>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <zso-button type="neutral" size="sm" (click)="cancel()"
            >Abbrechen</zso-button
          >
          <zso-button type="primary" size="sm" icon="save" (click)="save()"
            >Speichern</zso-button
          >
        </div>
      </div>
    </div>
  `,
})
export class UserEditDialogComponent implements OnChanges, OnDestroy {
  private readonly scrollLock = inject(ScrollLockService);
  private scrollLocked = false;

  @Input() visible = false;
  @Input() set user(u: UserDoc | null) {
    if (u) {
      this.firstName = u.firstName;
      this.lastName = u.lastName;
      this.email = u.email;
      this.phoneNumber = u.phoneNumber || '';
      this.birthDateStr = u.birthDate
        ? new Date(u.birthDate).toISOString().substring(0, 10)
        : '';
      this._uid = u.uid;
    }
  }

  @Output() saved = new EventEmitter<{
    uid: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    birthDate: number | null;
  }>();
  @Output() closed = new EventEmitter<void>();

  /* form model */
  firstName = '';
  lastName = '';
  email = '';
  phoneNumber = '';
  birthDateStr = '';
  private _uid = '';

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

  onBackdrop(_e: MouseEvent) {
    this.cancel();
  }

  save() {
    const birthDateTs = this.birthDateStr
      ? new Date(this.birthDateStr).getTime()
      : null;
    this.saved.emit({
      uid: this._uid,
      firstName: this.firstName.trim(),
      lastName: this.lastName.trim(),
      email: this.email.trim(),
      phoneNumber: this.phoneNumber.trim(),
      birthDate: birthDateTs,
    });
    if (this.scrollLocked) {
      this.scrollLock.unlock();
      this.scrollLocked = false;
    }
    this.visible = false;
    this.closed.emit();
  }

  cancel() {
    if (this.scrollLocked) {
      this.scrollLock.unlock();
      this.scrollLocked = false;
    }
    this.visible = false;
    this.closed.emit();
  }
}
