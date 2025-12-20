import { Routes } from '@angular/router';
import { SessionGuard } from '@core/auth/guards/session.guard';
import { UserDocGuard } from '@core/auth/guards/user-doc.guard';
import { VerifiedGuard } from '@core/auth/guards/verified.guard';
import { ApprovedGuard } from '@core/auth/guards/approved.guard';

export const dashboardRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./dashboard.page').then((m) => m.DashboardPage),
    canActivate: [SessionGuard, UserDocGuard, VerifiedGuard, ApprovedGuard],
    canLoad: [SessionGuard, UserDocGuard, VerifiedGuard, ApprovedGuard],
  },
  {
    path: 'activities',
    loadComponent: () =>
      import('./activities/activities.page').then((m) => m.ActivitiesPage),
    canActivate: [SessionGuard, UserDocGuard, VerifiedGuard, ApprovedGuard],
    canLoad: [SessionGuard, UserDocGuard, VerifiedGuard, ApprovedGuard],
  },
];
