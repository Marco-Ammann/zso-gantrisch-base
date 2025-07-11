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
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-white">
      <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 class="text-2xl font-semibold">Orte</h1>
        <zso-button type="primary" (click)="createNew()">Neuer Ort</zso-button>
      </div>

      <div *ngIf="places$ | async as places; else loading">
        <div *ngIf="places.length === 0" class="text-gray-400">
          Keine Orte vorhanden.
        </div>
        <div class="grid gap-6 mt-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 place-items-center">
          <zso-place-card *ngFor="let place of places; trackBy: trackById" class="w-full max-w-[320px]" [place]="place" (click)="viewDetails(place)"></zso-place-card>
        </div>
      </div>
      <ng-template #loading>
        <p>Lade Orte…</p>
      </ng-template>
    </div>

    <!-- Create Modal -->
    <zso-place-create-modal
      [visible]="showCreateModal"
      (created)="onCreated($event)"
      (closed)="showCreateModal = false"
    ></zso-place-create-modal>
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
