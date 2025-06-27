import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: 'users',
    loadComponent: () =>
      import('./users/users.page').then(m => m.UsersPage),
  },
  {
    path: 'users/:uid',
    loadComponent: () => import('./users/user-detail/user-detail.page').then(m => m.UserDetailPage),
  },
  { path: '', redirectTo: 'users', pathMatch: 'full' }
];
