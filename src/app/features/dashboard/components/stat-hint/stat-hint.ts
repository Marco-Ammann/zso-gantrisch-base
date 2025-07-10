import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * A very small pill-style hint showing an icon, a numeric value and an (optional) tooltip label.
 * Designed for mobile dashboards where space is tight.
 */
@Component({
  selector: 'zso-stat-hint',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stat-hint glass-card flex items-center gap-1 px-3 py-1 cursor-pointer select-none hover:bg-white/5 transition">
      <span class="material-symbols-outlined text-base" [ngClass]="color">{{ icon }}</span>
      <span class="text-sm font-semibold text-white">{{ value }}</span>
    </div>
  `,
  styles: [
    `:host{display:inline-block}`
  ]
})
export class StatHintComponent {
  @Input() icon!: string;
  @Input() value: number | string = 0;
  @Input() color = 'text-gray-400';

  @Output() select = new EventEmitter<void>();

  @HostListener('click')
  handleClick() {
    this.select.emit();
  }
}
