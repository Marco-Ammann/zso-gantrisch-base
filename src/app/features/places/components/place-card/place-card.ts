// src/app/features/places/components/place-card/place-card.ts
// Displays a short summary of a PlaceDoc.

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlaceDoc } from '@core/models/place.model';

@Component({
  selector: 'zso-place-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="glass-card p-5 cursor-pointer hover:bg-white/10 transition-colors rounded-lg h-full flex flex-col justify-between gap-3"
    >
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-white">
          {{ place.name }}
        </h3>
        <span
          class="px-2 py-0.5 text-xs rounded-md border"
          [ngClass]="typeBadgeClass"
          >{{ typeLabel }}</span
        >
      </div>

      <div class="text-sm text-gray-300 flex flex-wrap gap-3 mt-1">
        <span
          ><span class="material-symbols-outlined text-sm mr-1"
            >location_on</span
          >{{ place.address.city }}</span
        >
        <ng-container *ngIf="place.capacity?.maxPersons as cap">
          <span
            ><span class="material-symbols-outlined text-sm mr-1"
              >groups</span
            >{{ cap }} Pers.</span
          >
        </ng-container>
              <ng-container *ngIf="place.address.street as street">
          <span class="w-full block text-gray-400 text-xs truncate">
            {{ street }}
          </span>
        </ng-container>
      </div>

      <!-- Footer: contact person -->
      <div *ngIf="place.contactPerson as cp" class="mt-3 flex items-center gap-2 text-xs text-gray-400">
        <span class="material-symbols-outlined text-sm">person</span>
        <span class="truncate">{{ cp.firstName }} {{ cp.lastName }}</span>
      </div>
    </div>
  `,
  styleUrls: ['./place-card.scss'],
})
export class PlaceCard {
  @Input() place!: PlaceDoc;

  get typeLabel(): string {
    switch (this.place.type) {
      case 'accommodation':
        return 'Heim';
      case 'civil_protection_facility':
        return 'Zivilschutzanlage';
      case 'training_room':
        return 'Schulungsraum';
      default:
        return 'Sonstiges';
    }
  }

  get typeBadgeClass(): string {
    return {
      accommodation: 'border-green-500/30 bg-green-500/20 text-green-400',
      civil_protection_facility:
        'border-blue-500/30 bg-blue-500/20 text-blue-400',
      training_room: 'border-amber-500/30 bg-amber-500/20 text-amber-400',
      other: 'border-gray-500/30 bg-gray-500/20 text-gray-400',
    }[this.place.type];
  }
}
