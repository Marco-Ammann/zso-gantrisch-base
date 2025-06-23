import { Directive, ElementRef, AfterViewInit, Renderer2 } from '@angular/core';

@Directive({
  selector: '[zsoCardShimmer]',
  standalone: true
})
export class CardShimmerDirective implements AfterViewInit {
  constructor(private el: ElementRef, private r: Renderer2) {}

  ngAfterViewInit() {
    const card = this.el.nativeElement as HTMLElement;
    // fixe Klassen für einmaliges Shimmer und Sparkle
    this.r.addClass(card, 'shimmer-once');
    this.r.addClass(card, 'sparkle');
  }
}
