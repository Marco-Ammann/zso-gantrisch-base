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
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { ZsoButton } from '@shared/ui/zso-button/zso-button';
import { ZsoSkeleton } from '@shared/ui/zso-skeleton/zso-skeleton';

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
  imports: [
    CommonModule,
    RouterModule,
    ZsoButton,
    ZsoSkeleton,
    PlaceCard,
    PlaceCreateModal,
  ],
  template: `
    <div class="min-h-[calc(100vh-64px)] text-white">
      <div class="layout-container py-6 sm:py-8 space-y-6">
        <!-- Page Header - aligned with AdZS overview style -->
        <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <!-- Title + Icon -->
          <div class="flex items-center gap-3">
            <div class="auth-icon-wrapper">
              <span class="material-symbols-outlined text-2xl text-cp-orange">map</span>
            </div>
            <div>
              <h1 class="text-2xl lg:text-3xl font-bold text-white">Orte</h1>
              <p class="text-sm text-gray-400">Einsatzorte verwalten</p>
            </div>
          </div>

          <!-- Action Button -->
          <zso-button type="primary" size="sm" (click)="createNew()">
            <span class="material-symbols-outlined text-base mr-1">add_location</span>
            Neuer Ort
          </zso-button>
        </div>

        <!-- Search & Filters -->
        <div class="glass-card p-4 space-y-4">
          <!-- Search bar -->
          <div class="relative">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              search
            </span>
            <input
              type="search"
              placeholder="Ortsname suchen..."
              class="form-input pl-10 pr-4"
              (input)="onSearch($any($event.target).value)"
            />
          </div>
          <!-- Filter row -->
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1">Typ</label>
              <select
                (change)="onTypeFilterChange($any($event.target).value)"
                class="w-full sort-select"
              >
                <option value="all">Alle</option>
                <option value="accommodation">Heime</option>
                <option value="civil_protection_facility">Zivilschutzanlagen</option>
                <option value="training_room">Schulungsräume</option>
                <option value="other">Sonstige</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Sections -->
        <ng-container *ngIf="sections$ | async as sections; else loading">
          <p *ngIf="sections.length === 0" class="text-gray-400">Keine Orte vorhanden.</p>

          <ng-container *ngFor="let sec of sections">
            <div class="glass-card p-6">
            <div class="section-header flex items-center gap-2 mb-4">
              <span class="material-symbols-outlined text-lg text-cp-orange">{{ sec.icon }}</span>
              <h2 class="text-lg font-semibold">{{ sec.label }}</h2>
              <span class="section-count">{{ sec.items.length }}</span>
            </div>

            <div class="grid gap-4 sm:gap-5 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <zso-place-card
                *ngFor="let place of sec.items; trackBy: trackById"
                [place]="place"
                class="w-full max-w-[320px] hover:scale-[1.01] transition-transform"
                (click)="viewDetails(place)"
              ></zso-place-card>
            </div>
            </div>
          </ng-container>
        </ng-container>
        <ng-template #loading>
          <div class="glass-card p-6">
            <div class="flex items-center gap-2 mb-4">
              <zso-skeleton width="8rem" height="1rem" />
              <zso-skeleton width="3rem" height="1rem" className="opacity-60" />
            </div>

            <div class="grid gap-4 sm:gap-5 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <div *ngFor="let _ of skeletonCards" class="glass-card p-6">
                <div class="flex items-center gap-3 mb-4">
                  <zso-skeleton shape="circle" width="2.75rem" height="2.75rem" />
                  <div class="flex-1 space-y-2">
                    <zso-skeleton width="65%" height="0.95rem" />
                    <zso-skeleton width="45%" height="0.8rem" className="opacity-70" />
                  </div>
                </div>
                <zso-skeleton width="90%" height="0.75rem" className="opacity-60" />
              </div>
            </div>
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
  styleUrls: ['./places-overview.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlacesOverviewPage implements OnInit {
  private readonly placesService = inject(PlacesService);
  private readonly router = inject(Router);

  readonly skeletonCards = [0, 1, 2, 3, 4, 5];

  sections$!: Observable<Section[]>;
  showCreateModal = false;

  // Observables for search and type filter controls
  private readonly searchTerm$ = new BehaviorSubject<string>('');
  private readonly typeFilter$ = new BehaviorSubject<'all' | PlaceType>('all');

  ngOnInit(): void {
    this.sections$ = combineLatest([
      this.placesService.getAll(),
      this.searchTerm$,
      this.typeFilter$,
    ]).pipe(
      map(([places, searchTerm, typeFilter]) => {
        const sections: Section[] = [
          { type: 'accommodation', label: 'Heime', icon: 'home', items: [] },
          { type: 'civil_protection_facility', label: 'Zivilschutzanlagen', icon: 'shield', items: [] },
          { type: 'training_room', label: 'Schulungsräume', icon: 'school', items: [] },
          { type: 'other', label: 'Sonstige', icon: 'location_city', items: [] },
        ];
        const filtered = places.filter((p) => {
          const matchesType = typeFilter === 'all' || p.type === typeFilter;
          const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
          return matchesType && matchesSearch;
        });
        for (const p of filtered) {
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

  onSearch(term: string): void {
    this.searchTerm$.next(term);
  }

  onTypeFilterChange(value: string): void {
    this.typeFilter$.next(value as 'all' | PlaceType);
  }

  viewDetails(place: PlaceDoc): void {
    this.router.navigate(['/places', place.id]);
  }
}
