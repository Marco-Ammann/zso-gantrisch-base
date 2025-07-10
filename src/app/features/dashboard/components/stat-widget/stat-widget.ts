import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'zso-stat-widget',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stat-widget glass-card cursor-pointer hover:scale-105 transition-transform"
         [ngClass]="size === 'sm' ? 'p-3 sm:p-3' : 'p-4 sm:p-5'">
      <div class="flex items-center justify-between mb-1" [ngClass]="size === 'sm' ? 'mb-1' : 'mb-2'">
        <span class="material-symbols-outlined" [ngClass]="[color, size === 'sm' ? 'text-lg' : 'text-2xl']">{{ icon }}</span>
        <span class="uppercase tracking-wider" [ngClass]="size === 'sm' ? 'text-[10px]' : 'text-xs text-gray-500'">{{ label }}</span>
      </div>
      <p class="font-bold text-white" [ngClass]="size === 'sm' ? 'text-2xl' : 'text-3xl'">{{ value }}</p>
    </div>
  `,
  styles: [
    `:host{display:block;width:100%;}`
  ]
})
export class StatWidgetComponent {
  @Input() icon!: string;
  @Input() label!: string;
  @Input() value: number | string = 0;
  @Input() color = 'text-gray-400';
  @Input() size: 'sm' | 'md' = 'md';
  @Output() select = new EventEmitter<void>();

  @HostListener('click')
  handleClick() {
    this.select.emit();
  }
}
