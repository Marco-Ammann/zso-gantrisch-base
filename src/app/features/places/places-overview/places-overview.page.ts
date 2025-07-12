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
import { ZsoButton } from '@shared/ui/zso-button/zso-button';

import { PlacesService } from '../services/places.service';
import { PlaceDoc } from '@core/models/place.model';
import { PlaceCard } from '../components/place-card/place-card';
import { PlaceCreateModal } from '../components/place-create-modal/place-create-modal';

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

        <!-- Places List -->
        <ng-container *ngIf="places$ | async as places; else loading">
          <p *ngIf="places.length === 0" class="text-gray-400">Keine Orte vorhanden.</p>
          <div *ngIf="places.length > 0" class="grid gap-4 sm:gap-5 lg:gap-6 mt-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <zso-place-card
              *ngFor="let place of places; trackBy: trackById"
              [place]="place"
              class="w-full max-w-[320px] hover:scale-[1.01] transition-transform"
              (click)="viewDetails(place)"
            ></zso-place-card>
          </div>
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

  places$!: Observable<PlaceDoc[]>;
  showCreateModal = false;

  ngOnInit(): void {
    this.places$ = this.placesService.getAll();
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
