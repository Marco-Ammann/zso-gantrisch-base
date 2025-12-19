// src/app/features/legal/legal.routes.ts
import { Routes } from '@angular/router';

export const legalRoutes: Routes = [
  {
    path: 'datenschutz',
    loadComponent: () =>
      import('./privacy-policy/privacy-policy').then(m => m.PrivacyPolicyPage),
  },
  {
    path: 'changelog',
    loadComponent: () =>
      import('./changelog/changelog').then(m => m.ChangelogPage),
  },
  {
    path: 'impressum',
    loadComponent: () =>
      import('./imprint/imprint').then(m => m.ImprintPage),
  }
];