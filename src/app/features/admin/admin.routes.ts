import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: 'users',
    loadComponent: () =>
      import('./users/users.page').then(m => m.UsersPage),
  },
  { path: '', redirectTo: 'users', pathMatch: 'full' },
];
