// src/app/app.routes.ts - Updated with AdZS routes

import { Routes } from '@angular/router';
import { SessionGuard } from './core/auth/guards/session.guard';
import { UserDocGuard } from './core/auth/guards/user-doc.guard';
import { VerifiedGuard } from './core/auth/guards/verified.guard';
import { ApprovedGuard } from './core/auth/guards/approved.guard';
import { RoleGuard } from './core/auth/guards/role.guard';
import { FeatureFlagGuard } from './core/auth/guards/feature-flag.guard';
import { authRoutes } from './core/auth/auth.routes';
import { dashboardRoutes } from './features/dashboard/dashboard.routes';
import { adminRoutes } from './features/admin/admin.routes';
import { placesRoutes } from './features/places/places.routes';
import { adzsRoutes } from './features/adsz/adsz.routes';
import { legalRoutes } from './features/legal/legal.routes';
import { planningRoutes } from './features/planning/planning.routes';

export const appRoutes: Routes = [
  // 1. Redirect root to auth/login
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },

  // 2. Legal pages (publicly accessible via Legal Shell)
  {
    path: '',
    loadComponent: () =>
      import('./core/layout/shell/legal-shell/legal-shell').then(
        (m) => m.LegalShell
      ),
    children: legalRoutes,
  },

  // 3. Auth routes under Auth Shell
  {
    path: 'auth',
    loadComponent: () =>
      import('./core/layout/shell/auth-shell/auth-shell').then(
        (m) => m.AuthShell
      ),
    children: authRoutes,
  },

  // 4. Protected routes under Main Shell
  {
    path: '',
    loadComponent: () =>
      import('./core/layout/shell/main-shell/main-shell').then(
        (m) => m.MainShell
      ),
    canActivate: [SessionGuard, UserDocGuard, VerifiedGuard, ApprovedGuard],
    children: [
      { path: 'dashboard', children: dashboardRoutes },
      {
        path: 'adsz',
        canActivate: [FeatureFlagGuard],
        data: { featureFlag: 'adsz' },
        children: adzsRoutes,
      }, // AdZS routes für alle User
      {
        path: 'places',
        canActivate: [FeatureFlagGuard],
        data: { featureFlag: 'places' },
        children: placesRoutes,
      }, // Orte-Routen
      {
        path: 'planning',
        canActivate: [FeatureFlagGuard, RoleGuard],
        data: { featureFlag: 'planning', roles: ['admin'], fallback: '/dashboard' },
        children: planningRoutes,
      },
      { path: 'admin', canActivate: [RoleGuard], data: { roles: ['admin'] }, children: adminRoutes },
    ],
  },

  // 5. Fallback
  { path: '**', redirectTo: '' },
];
