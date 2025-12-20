import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
    selector: 'zso-state-message',
    standalone: true,
    imports: [NgClass],
    template: `
    <div class="glass-card p-6 sm:p-8 text-center">
      <span
        class="material-symbols-outlined text-4xl sm:text-5xl mb-3 block"
        [ngClass]="iconClass"
      >
        {{ icon }}
      </span>
      <h3 class="text-lg sm:text-xl font-medium text-white mb-2">{{ title }}</h3>
      <p class="text-sm text-gray-400">{{ text }}</p>
    </div>
  `,
})
export class ZsoStateMessage {
    @Input() icon = 'info';
    @Input() title = '';
    @Input() text = '';
    @Input() tone: 'neutral' | 'info' | 'warning' | 'danger' = 'neutral';

    get iconClass(): string {
        switch (this.tone) {
            case 'info':
                return 'text-sky-300';
            case 'warning':
                return 'text-amber-300';
            case 'danger':
                return 'text-rose-300';
            default:
                return 'text-gray-400';
        }
    }
}
