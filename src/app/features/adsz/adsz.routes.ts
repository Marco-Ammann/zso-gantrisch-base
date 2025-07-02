// src/app/features/adsz/adsz.routes.ts
import { Routes } from '@angular/router';

export const adzsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./adsz-overview/adsz-overview.page').then(m => m.AdzsOverviewPage),
  },
//   {
//     path: 'new',
//     loadComponent: () =>
//       import('./adsz-detail/adsz-detail.page').then(m => m.AdzsDetailPage),
//   },
//   {
//     path: ':id',
//     loadComponent: () =>
//       import('./adsz-detail/adsz-detail.page').then(m => m.AdzsDetailPage),
//   }
];