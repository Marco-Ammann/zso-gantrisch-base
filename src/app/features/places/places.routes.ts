// src/app/features/places/places.routes.ts
import { Routes } from '@angular/router';

export const placesRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./places-overview/places-overview.page').then(
        (m) => m.PlacesOverviewPage
      ),
    title: 'Orte',
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./place-detail/place-detail.page').then(
        (m) => m.PlaceDetailPage
      ),
    title: 'Neuer Ort',
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./place-detail/place-detail.page').then(
        (m) => m.PlaceDetailPage
      ),
    title: 'Ort Details',
  },
];
