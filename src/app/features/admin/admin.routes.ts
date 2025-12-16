import { Routes } from '@angular/router';
import { FeatureFlagGuard } from '@core/auth/guards/feature-flag.guard';

export const adminRoutes: Routes = [
  {
    path: 'users',
    canActivate: [FeatureFlagGuard],
    data: { featureFlag: 'adminUsers', fallback: '/admin/settings' },
    loadComponent: () =>
      import('./users/users.page').then(m => m.UsersPage),
  },
  {
    path: 'users/:uid',
    canActivate: [FeatureFlagGuard],
    data: { featureFlag: 'adminUsers', fallback: '/admin/settings' },
    loadComponent: () => import('./users/user-detail/user-detail.page').then(m => m.UserDetailPage),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./settings/settings.page').then((m) => m.SettingsPage),
  },
  { path: '', redirectTo: 'users', pathMatch: 'full' }
];
