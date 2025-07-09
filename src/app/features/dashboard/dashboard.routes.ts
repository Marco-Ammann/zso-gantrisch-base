import { Routes } from '@angular/router';
import { AuthGuard } from '@core/auth/guards/auth.guard';
import { EmailVerifiedGuard } from '@core/auth/guards/email-verified.guard';

export const dashboardRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./dashboard.page').then((m) => m.DashboardPage),
    canActivate: [AuthGuard, EmailVerifiedGuard],
    canLoad: [AuthGuard, EmailVerifiedGuard],
  },
];
