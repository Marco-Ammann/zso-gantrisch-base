// src/app/shared/components/confirmation-dialog/confirmation-dialog.ts
import {
  Component,
  EventEmitter,
  Input,
  Output,
  ElementRef,
  ViewChild,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ZsoButton } from '../../ui/zso-button/zso-button';
import { ScrollLockService } from '@core/services/scroll-lock.service';

@Component({
  selector: 'zso-confirmation-dialog',
  standalone: true,
  imports: [CommonModule, ZsoButton],
  template: `
    <div
      #backdrop
      class="fixed inset-0 bg-black/60 backdrop-blur-glass flex items-center justify-center z-50 p-4 opacity-0 pointer-events-none transition-opacity duration-200"
      [class.opacity-100]="visible"
      [class.pointer-events-auto]="visible"
    >
      <div
        class="glass-card p-6 max-w-md w-full mx-auto transform transition-all scale-95"
        [class.scale-100]="visible"
      >
        <div class="text-center">
          <!-- Icon -->
          <div
            class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 mb-4"
          >
            <svg
              class="h-6 w-6 text-orange-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <!-- Title & Message -->
          <h3 class="text-lg font-medium text-white mb-2">{{ title }}</h3>
          <p class="text-sm text-gray-300 mb-6">{{ message }}</p>

          <!-- Actions -->
          <div class="flex justify-center gap-3">
            <zso-button
              type="neutral"
              size="sm"
              (click)="onCancel()"
              class="px-4"
            >
              Abbrechen
            </zso-button>
            <zso-button
              [type]="confirmType"
              size="sm"
              (click)="onConfirm()"
              class="px-4"
            >
              {{ confirmText }}
            </zso-button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class ConfirmationDialogComponent implements OnChanges, OnDestroy {
  private readonly scrollLock = inject(ScrollLockService);
  private scrollLocked = false;

  @ViewChild('backdrop') backdrop!: ElementRef<HTMLDivElement>;
  @Input() visible = false;
  @Input() title = 'Bestätigung';
  @Input() message =
    'Sind Sie sicher, dass Sie diese Aktion durchführen möchten?';
  @Input() confirmText = 'Bestätigen';
  @Input() confirmType: 'primary' | 'danger' | 'neutral' = 'primary';

  @Output() confirmed = new EventEmitter<boolean>();

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

  // Handle click outside to close
  onClickOutside(event: MouseEvent) {
    if (this.backdrop.nativeElement === event.target) {
      this.onCancel();
    }
  }

  onConfirm() {
    this.confirmed.emit(true);
    this.close();
  }

  onCancel() {
    this.confirmed.emit(false);
    this.close();
  }

  private close() {
    if (this.scrollLocked) {
      this.scrollLock.unlock();
      this.scrollLocked = false;
    }
    this.visible = false;
  }
}
