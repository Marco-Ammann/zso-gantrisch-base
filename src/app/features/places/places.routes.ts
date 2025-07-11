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
      import('./place-edit/place-edit.page').then(
        (m) => m.PlaceEditPage
      ),
    title: 'Neuer Ort',
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./place-detail-view/place-detail-view.page').then(
        (m) => m.PlaceDetailViewPage
      ),
    title: 'Ort Details',
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./place-edit/place-edit.page').then(
        (m) => m.PlaceEditPage
      ),
    title: 'Ort bearbeiten',
  }
];
