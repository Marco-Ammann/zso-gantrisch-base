import { Directive, ElementRef, AfterViewInit, Renderer2 } from '@angular/core';

@Directive({
  selector: '[zsoGlowSeq]',
  standalone: true
})
export class GlowSeqDirective implements AfterViewInit {
  constructor(private host: ElementRef<HTMLElement>, private r: Renderer2) {}

  ngAfterViewInit() {
    const items = this.host.nativeElement.querySelectorAll('.field-stack--tight > *');
    items.forEach((el, i) => {
      setTimeout(() => this.r.addClass(el, 'glow-once'), i * 250);
    });
  }
}
