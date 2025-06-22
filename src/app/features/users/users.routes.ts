import { Routes } from '@angular/router';

export const usersRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/users-list/users-list').then((m) => m.UsersList),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/user-detail/user-detail').then((m) => m.UserDetail),
  },
];
