import { Component, Input } from '@angular/core';
import { NgClass, CommonModule } from '@angular/common';

/**
 * ZsoCard – wiederverwendbare Glassmorphism-Karte.
 * Nutzt globale Tokens/Utility-Klassen.
 *
 * Usage:
 * <zso-card [padding]="'lg'" [hover]="true">
 *   <h1 cardHeader>Title</h1>
 *   <p>Content</p>
 *   <div cardFooter>Footer</div>
 * </zso-card>
 */
@Component({
  selector: 'zso-card',
  standalone: true,
  imports: [NgClass, CommonModule],
  template: `
    <article [ngClass]="classes" class="glass-card w-full animate-pop-in">
      <!-- optional header slot -->
      <header *ngIf="hasHeader">
        <ng-content select="[cardHeader]"></ng-content>
      </header>

      <section class="flex-1">
        <ng-content></ng-content>
      </section>

      <!-- optional footer slot -->
      <footer *ngIf="hasFooter" class="pt-4">
        <ng-content select="[cardFooter]"></ng-content>
      </footer>
    </article>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      header,
      section,
      footer {
        width: 100%;
      }
    `,
  ],
})
export class ZsoCard {
  /** Padding size token */
  @Input() padding: 'none' | 'sm' | 'md' | 'lg' = 'md';
  /** Optional hover effect */
  @Input() hover = false;

  get classes(): string {
    const arr: string[] = [];
    // base glass styles are via .glass-card class
    switch (this.padding) {
      case 'none':
        arr.push('p-0');
        break;
      case 'sm':
        arr.push('p-4');
        break;
      case 'md':
        arr.push('p-6');
        break;
      case 'lg':
        arr.push('p-8');
        break;
    }
    if (this.hover) arr.push('hover:bg-white/20 transition-colors');
    return arr.join(' ');
  }

  get hasHeader(): boolean {
    // simplistic check using querySelector not available yet; slot detection handled by *ngIf via content projection; assume true if element present at runtime
    return true;
  }

  get hasFooter(): boolean {
    return true;
  }
}
