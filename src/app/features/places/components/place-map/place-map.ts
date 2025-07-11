// src/app/features/places/components/place-map/place-map.ts
// Simple Google Maps embed for a place. Accepts either coordinates or full address string.
// Uses public Google Maps embed (no API key required). For private deployments, replace with Maps JS SDK.

import { Component, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'zso-place-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full h-64 rounded-lg overflow-hidden bg-gray-700/40">
      <iframe
        class="w-full h-full border-0"
        [src]="mapUrl"
        loading="lazy"
      ></iframe>
    </div>
  `,
  styles: [`:host { display: block;}`],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceMap {
  /** Address string (fallback if no coordinates). */
  @Input() address: string | null = null;
  /** Latitude */
  @Input() lat: number | null = null;
  /** Longitude */
  @Input() lng: number | null = null;

  private readonly sanitizer = inject(DomSanitizer);

  get mapUrl(): SafeResourceUrl {
    let raw = 'about:blank';
    if (this.lat !== null && this.lng !== null) {
      raw = `https://maps.google.com/maps?q=${this.lat},${this.lng}&hl=de&z=15&output=embed`;
    } else if (this.address) {
      raw = `https://maps.google.com/maps?q=${encodeURIComponent(this.address)}&hl=de&z=15&output=embed`;
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(raw);
  }
}
