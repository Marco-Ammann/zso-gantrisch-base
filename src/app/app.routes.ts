// src/app/app.routes.ts

import { Routes } from '@angular/router';
import { AuthGuard } from './core/auth/guards/auth.guard';
import { EmailVerifiedGuard } from './core/auth/guards/email-verified.guard';
import { AdminGuard } from './core/auth/guards/admin.guard';
import { authRoutes } from './core/auth/auth.routes';
import { dashboardRoutes } from './features/dashboard/dashboard.routes';
import { adminRoutes } from './features/admin/admin.routes';
import { legalRoutes } from './features/legal/legal.routes';

export const appRoutes: Routes = [
  // 1. Redirect root to auth/login
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },

  // 2. Legal pages (publicly accessible via Legal Shell)
  {
    path: '',
    loadComponent: () =>
      import('./core/layout/shell/legal-shell/legal-shell').then(m => m.LegalShell),
    children: legalRoutes,
  },

  // 3. Auth routes under Auth Shell
  {
    path: 'auth',
    loadComponent: () =>
      import('./core/layout/shell/auth-shell/auth-shell').then(m => m.AuthShell),
    children: authRoutes,
  },

  // 4. Protected routes under Main Shell
  {
    path: '',
    loadComponent: () =>
      import('./core/layout/shell/main-shell/main-shell').then(m => m.MainShell),
    canActivate: [AuthGuard, EmailVerifiedGuard],
    children: [
      { path: 'dashboard', children: dashboardRoutes },
      { path: 'users', children: adminRoutes },
      { path: 'admin', canActivate: [AdminGuard], children: adminRoutes }
    ],
  },

  // 5. Fallback
  { path: '**', redirectTo: '' },
];