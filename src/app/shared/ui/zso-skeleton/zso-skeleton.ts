import { Component, Input } from '@angular/core';
import { NgClass, NgStyle } from '@angular/common';

@Component({
    selector: 'zso-skeleton',
    standalone: true,
    imports: [NgClass, NgStyle],
    template: `
    <div
      [ngClass]="classes"
      [ngStyle]="style"
      aria-hidden="true"
    ></div>
  `,
})
export class ZsoSkeleton {
    @Input() shape: 'line' | 'circle' | 'block' = 'line';
    @Input() width: string | null = null;
    @Input() height: string | null = null;
    @Input() className = '';

    get style(): Record<string, string> {
        const baseSize = this.shape === 'circle' ? '2.5rem' : '1rem';
        const w = this.width ?? (this.shape === 'line' ? '100%' : baseSize);
        const h = this.height ?? baseSize;

        return {
            width: w,
            height: h,
        };
    }

    get classes(): string {
        const classes: string[] = [
            'animate-pulse',
            'bg-white/10',
            'border',
            'border-white/5',
        ];

        if (this.shape === 'circle') classes.push('rounded-full');
        else classes.push('rounded-md');

        if (this.className) classes.push(this.className);

        return classes.join(' ');
    }
}
