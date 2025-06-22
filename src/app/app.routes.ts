// src/app/app.routes.ts

import { Routes } from '@angular/router';
import { AuthGuard } from './core/auth/guards/auth.guard';
import { EmailVerifiedGuard } from './core/auth/guards/email-verified.guard';
import { AdminGuard } from './core/auth/guards/admin.guard';
import { authRoutes } from './core/auth/auth.routes';
import { dashboardRoutes } from './features/dashboard/dashboard.routes';
import { usersRoutes } from './features/users/users.routes';
import { adminRoutes } from './features/admin/admin.routes';

export const appRoutes: Routes = [
  // 1. Wenn der Benutzer nur "/" aufruft, direkt auf /auth/login weiterleiten
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },

  // 2. Alle Auth-Routen unter dem Auth-Shell
  {
    path: 'auth',
    loadComponent: () =>
      import('./core/layout/shell/auth-shell/auth-shell').then(m => m.AuthShell),
    children: authRoutes,
  },

  // 3. Geschützter Bereich (Dashboard, Users) unter MainShell
  {
    path: '',
    loadComponent: () =>
      import('./core/layout/shell/main-shell/main-shell').then(m => m.MainShell),
    canActivate: [AuthGuard, EmailVerifiedGuard], // added EmailVerifiedGuard
    children: [
      // Kein leerer Redirect mehr hier
      { path: 'dashboard', children: dashboardRoutes },
      { path: 'users', children: usersRoutes },
      { path: 'admin', canActivate: [AdminGuard], children: adminRoutes }
    ],
  },

  // 4. Wildcard-Fallback: alles, was nicht passt, geht zurück zu "/"
  { path: '**', redirectTo: '' },
];
