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

import { PlacesService } from '../services/places.service';
import { PlaceDoc } from '@core/models/place.model';
import { PlaceCard } from '../components/place-card/place-card';

@Component({
  selector: 'zso-places-overview',
  standalone: true,
  imports: [CommonModule, RouterModule, PlaceCard],
  template: `
    <div class="p-4 text-white">
      <h1 class="text-2xl font-semibold mb-4">Orte</h1>
      <button class="btn btn-primary mb-4" (click)="createNew()">
        Neuer Ort
      </button>

      <div *ngIf="places$ | async as places; else loading">
        <div *ngIf="places.length === 0" class="text-gray-400">
          Keine Orte vorhanden.
        </div>
        <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <zso-place-card *ngFor="let place of places" [place]="place" (click)="viewDetails(place)"></zso-place-card>
        </div>
      </div>
      <ng-template #loading>
        <p>Lade Orte…</p>
      </ng-template>
    </div>
  `,
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlacesOverviewPage implements OnInit {
  private readonly placesService = inject(PlacesService);
  private readonly router = inject(Router);

  places$!: Observable<PlaceDoc[]>;

  ngOnInit(): void {
    this.places$ = this.placesService.getAll();
  }

  createNew(): void {
    this.router.navigate(['/places', 'new']);
  }

  viewDetails(place: PlaceDoc): void {
    this.router.navigate(['/places', place.id]);
  }
}
