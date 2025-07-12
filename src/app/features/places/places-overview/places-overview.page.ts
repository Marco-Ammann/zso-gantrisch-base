// src/app/features/places/places-overview/places-overview.page.ts
// Minimal scaffold – will be extended iteratively.

import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ZsoButton } from '@shared/ui/zso-button/zso-button';

import { PlacesService } from '../services/places.service';
import { PlaceDoc, PlaceType } from '@core/models/place.model';
import { PlaceCard } from '../components/place-card/place-card';
import { PlaceCreateModal } from '../components/place-create-modal/place-create-modal';

interface Section {
  type: PlaceType;
  label: string;
  icon: string;
  items: PlaceDoc[];
}

@Component({
  selector: 'zso-places-overview',
  standalone: true,
  imports: [CommonModule, RouterModule, ZsoButton, PlaceCard, PlaceCreateModal],
  template: `
    <div class="min-h-[calc(100vh-64px)] p-3 sm:p-4 md:p-6 lg:p-8 text-white">
      <div class="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <!-- Header Card -->
        <div class="glass-card p-4 sm:p-6 flex items-center justify-between gap-4">
          <h1 class="text-xl sm:text-2xl font-semibold">Orte</h1>
          <zso-button type="primary" size="sm" (click)="createNew()">
            <span class="material-symbols-outlined text-base mr-1">add_location</span>
            Neuer Ort
          </zso-button>
        </div>

        <!-- Sections -->
        <ng-container *ngIf="sections$ | async as sections; else loading">
          <p *ngIf="sections.length === 0" class="text-gray-400">Keine Orte vorhanden.</p>

          <ng-container *ngFor="let sec of sections">
            <div class="flex items-center gap-2 mt-6 mb-2">
              <span class="material-symbols-outlined text-lg text-cp-orange">{{ sec.icon }}</span>
              <h2 class="text-lg font-semibold">{{ sec.label }}</h2>
            </div>

            <div class="grid gap-4 sm:gap-5 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <zso-place-card
                *ngFor="let place of sec.items; trackBy: trackById"
                [place]="place"
                class="w-full max-w-[320px] hover:scale-[1.01] transition-transform"
                (click)="viewDetails(place)"
              ></zso-place-card>
            </div>
          </ng-container>
        </ng-container>
        <ng-template #loading>
          <div class="flex justify-center py-10">
            <div class="spinner-lg"></div>
          </div>
        </ng-template>
      </div>

      <!-- Create Modal -->
      <zso-place-create-modal
        [visible]="showCreateModal"
        (created)="onCreated($event)"
        (closed)="showCreateModal = false"
      ></zso-place-create-modal>
    </div>
  `,
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlacesOverviewPage implements OnInit {
  private readonly placesService = inject(PlacesService);
  private readonly router = inject(Router);

  sections$!: Observable<Section[]>;
  showCreateModal = false;

  ngOnInit(): void {
    this.sections$ = this.placesService.getAll().pipe(
      map((places) => {
        const sections: Section[] = [
          { type: 'accommodation', label: 'Heime', icon: 'home', items: [] },
          { type: 'civil_protection_facility', label: 'Zivilschutzanlagen', icon: 'shield', items: [] },
          { type: 'training_room', label: 'Schulungsräume', icon: 'school', items: [] },
          { type: 'other', label: 'Sonstige', icon: 'location_city', items: [] },
        ];
        for (const p of places) {
          const sec = sections.find((s) => s.type === p.type);
          if (sec) sec.items.push(p);
        }
        return sections.filter((s) => s.items.length > 0);
      })
    );
  }

  createNew(): void {
    this.showCreateModal = true;
  }

  onCreated(place: PlaceDoc): void {
    this.showCreateModal = false;
    this.router.navigate(['/places', place.id]);
  }

  trackById(index: number, place: PlaceDoc): string {
    return place.id;
  }

  viewDetails(place: PlaceDoc): void {
    this.router.navigate(['/places', place.id]);
  }
}
