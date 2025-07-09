import { Routes } from '@angular/router';
import { AuthRedirectGuard } from './guards/auth-redirect.guard';

export const authRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login').then((m) => m.ZsoLogin),
    canActivate: [AuthRedirectGuard],
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register').then((m) => m.ZsoRegister),
    canActivate: [AuthRedirectGuard],
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password').then(
        (m) => m.ForgotPassword
      ),
    canActivate: [AuthRedirectGuard],
  },
  {
    path: 'pending-approval',
    loadComponent: () =>
      import('./pages/pending-approval/pending-approval').then(
        (m) => m.PendingApproval
      ),
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./pages/verify-email/verify-email').then(
        (m) => m.VerifyEmail
      ),
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
