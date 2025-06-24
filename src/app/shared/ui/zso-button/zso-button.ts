// src/app/shared/ui/zso-button/zso-button.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'zso-button',
  standalone: true,
  imports: [NgClass],
  template: `
    <button
      [attr.type]="htmlType"
      [disabled]="disabled || loading"
      (click)="click.emit()"
      [ngClass]="classes"
      class="px-5 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold transition-all animate-pop-in"
    >
      @if (loading) {
        <svg class="animate-spin h-5 w-5 text-current" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" class="opacity-25"/>
          <path  fill="currentColor" class="opacity-75" d="M4 12a8 8 0 0 1 8-8v8H4z"/>
        </svg>
        <span>Lade …</span>
      } @else {
        @if (icon) { <span [ngClass]="icon" class="h-5 w-5"></span> }
        <ng-content />
      }
    </button>
  `,
})
export class ZsoButton {
  @Input() type: 'primary' | 'danger' | 'neutral' = 'primary';
  @Input() htmlType: 'button' | 'submit' | 'reset' = 'button';
  @Input() fullWidth = false;
  @Input() size: 'xs' | 'sm' | 'md' | 'lg' = 'md';
  @Input() loading = false;
  @Input() disabled = false;
  @Input() icon?: string;
  @Output() click = new EventEmitter<void>();

  get classes(): string {
    const c: string[] = [];
    switch (this.type) {
      case 'primary': c.push('glass-btn-primary', 'glass-btn-glow'); break;
      case 'danger':  c.push('glass-btn-danger'); break;
      case 'neutral': c.push('glass-btn-neutral'); break;
    }
    if (this.fullWidth) c.push('w-full');
    if (this.disabled || this.loading) c.push('opacity-50', 'cursor-not-allowed');
    switch (this.size) {
      case 'xs': c.push('text-xs py-1.5 px-3'); break;
      case 'sm': c.push('text-sm py-2 px-4'); break;
      case 'md': c.push('text-base py-3 px-5'); break;
      case 'lg': c.push('text-lg py-4 px-6'); break;
    }
    return c.join(' ');
  }
}
