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
    <div
      class="glass-card p-4 flex items-center gap-4 hover:bg-white/5 transition-all cursor-pointer"
      (click)="select.emit()"
    >
      <span class="material-symbols-outlined text-4xl" [ngClass]="color">{{ icon }}</span>
      <div class="flex flex-col">
        <span class="text-2xl font-semibold text-white leading-none">{{ value }}</span>
        <span class="text-sm text-gray-400">{{ label }}</span>
      </div>
    </div>
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
