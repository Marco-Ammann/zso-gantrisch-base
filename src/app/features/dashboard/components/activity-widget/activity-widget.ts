import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * ActivityWidgetComponent
 * A compact rectangular widget showing an activity metric (label + number + icon).
 * Designed for the dashboard second row under quick-links.
 * Glass-card style, fully responsive.
 */
@Component({
  selector: 'zso-activity-widget',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      class="glass-card w-full h-full min-h-[120px] sm:min-h-[140px] text-left p-4 flex items-center gap-4 hover:bg-white/15 active:bg-white/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
      (click)="select.emit()"
    >
      <span class="material-symbols-outlined text-3xl shrink-0" [ngClass]="color">{{ icon }}</span>
      <div class="flex flex-col min-w-0">
        <span class="text-2xl font-semibold text-white leading-tight whitespace-pre-line">{{ value }}</span>
        <span class="text-sm text-white/70 truncate">{{ label }}</span>
      </div>
    </button>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `]
})
export class ActivityWidgetComponent {
  /** Material icon name */
  @Input() icon: string = 'history';
  /** Main numeric value */
  @Input() value: number | string = 0;
  /** Label below the value */
  @Input() label: string = '';
  /** Tailwind / custom text-color utility (e.g., 'text-green-400') */
  @Input() color: string = 'text-cp-orange';

  /** Emits when the card is clicked */
  @Output() readonly select = new EventEmitter<void>();
}
