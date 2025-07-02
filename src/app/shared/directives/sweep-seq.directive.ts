import { Directive, ElementRef, AfterViewInit, Renderer2 } from '@angular/core';

@Directive({
  selector: '[zsoSweepSeq]',
  standalone: true,
})
export class SweepSeqDirective implements AfterViewInit {
  constructor(private host: ElementRef<HTMLElement>, private r: Renderer2) {}

  ngAfterViewInit() {
    // Alle Gruppen mit .field-stack--tight im Host
    const groups = this.host.nativeElement.querySelectorAll<HTMLElement>(
      '.field-stack--tight'
    );
    groups.forEach((grp) => {
      // Wandelt NodeList<Element> in echtes HTMLElement-Array um
      const fields = Array.from(
        grp.querySelectorAll('zso-input-field')
      ) as HTMLElement[];
      fields.forEach((fld, idx) => {
        this.r.setStyle(fld, '--sweep-delay', `${idx * 150}ms`);
        this.r.addClass(fld, 'underline-sweep');
      });
    });
  }
}
