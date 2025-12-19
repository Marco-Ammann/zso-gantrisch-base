# Authentication & Authorization Flow

This document describes the current guard chain, routing structure, and `AuthInterceptor` behaviour as implemented in `src/app/app.routes.ts` and `src/app/core/auth/auth.routes.ts`.

---

## Overview Diagram

```
Client Request ─► SessionGuard ─► UserDocGuard ─► VerifiedGuard ─► ApprovedGuard ─► (optional) RoleGuard / FeatureFlagGuard ─► Feature Component
                                                            ▲
                                                            │
                                             AuthRedirectGuard (for selected /auth/* routes)
```

## Guard Responsibilities

| Guard                 | Purpose                                                                                                         | Redirect On Failure                                               |
| --------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------- |
| **SessionGuard**      | Ensures a Firebase Auth session exists (no Firestore call).                                                     | `/auth/login`                                                     |
| **UserDocGuard**      | Waits for _user document_ to load. Logs out if missing.                                                         | `/auth/login`                                                     |
| **VerifiedGuard**     | Requires `user.emailVerified === true`.                                                                         | `/auth/verify-email`                                              |
| **ApprovedGuard**     | Requires `userDoc.approved === true` **and** `blocked === false`.                                               | `/auth/pending-approval` (not approved) / `/auth/login` (blocked) |
| **RoleGuard**         | Reads `data.roles` (`string                                                                                     | string[]`); optional `data.fallback`(defaults to`/dashboard`).    | `data.fallback` or `/dashboard` |
| **FeatureFlagGuard**  | Reads `data.featureFlag` and blocks navigation when a feature is disabled.                                      | `data.fallback` or `/dashboard`                                   |
| **AuthRedirectGuard** | Applied to login/register/forgot-password; redirects _fully authorised_ users away (returnUrl or `/dashboard`). | returnUrl or `/dashboard`                                         |

### Negation Examples

A page that must be shown **only** to unapproved users (e.g. _Pending Approval_) simply omits `ApprovedGuard`, or includes a small check in the component’s `ngOnInit` to redirect away when `approved === true`.

## Route Configuration Patterns

### Shell-Level Protection (current)

```ts
// app.routes.ts
{
  path: '',
  loadComponent: () => import('./core/layout/shell/main-shell/main-shell').then(m => m.MainShell),
  canActivate: [SessionGuard, UserDocGuard, VerifiedGuard, ApprovedGuard],
  children: [
    { path: 'dashboard', children: dashboardRoutes },
    {
      path: 'adsz',
      canActivate: [FeatureFlagGuard],
      data: { featureFlag: 'adsz' },
      children: adzsRoutes,
    },
    {
      path: 'places',
      canActivate: [FeatureFlagGuard],
      data: { featureFlag: 'places' },
      children: placesRoutes,
    },
    { path: 'admin', canActivate: [RoleGuard], data: { roles: ['admin'] }, children: adminRoutes },
  ],
}
```

### Admin Area

```ts
{
  path: 'admin',
  canActivate: [RoleGuard],
  data: { roles: ['admin'] },
  children: adminRoutes,
}
```

### Auth Pages

```ts
{
  path: 'auth',
  loadComponent: () => import('./core/layout/shell/auth-shell/auth-shell').then(m => m.AuthShell),
  children: [
    { path: 'login', canActivate: [AuthRedirectGuard], loadComponent: () => import('./pages/login/login').then(m => m.ZsoLogin) },
    { path: 'register', canActivate: [AuthRedirectGuard], loadComponent: () => import('./pages/register/register').then(m => m.ZsoRegister) },
    { path: 'forgot-password', canActivate: [AuthRedirectGuard], loadComponent: () => import('./pages/forgot-password/forgot-password').then(m => m.ForgotPassword) },
    { path: 'pending-approval', loadComponent: () => import('./pages/pending-approval/pending-approval').then(m => m.PendingApproval) },
    { path: 'verify-email', loadComponent: () => import('./pages/verify-email/verify-email').then(m => m.VerifyEmail) },
  ],
}
```

## AuthInterceptor

1. **Attaches** the current Firebase _ID token_ to outgoing requests (adds `Authorization: Bearer <token>`), except for:
   - Static assets (e.g. `assets/`, `*.css`, `*.js`, `*.svg`, ...)
   - Legal pages (e.g. `/datenschutz`, `/impressum`, `/changelog`)
2. **Last-Active Ping** – throttles a Firestore update that stores `lastActiveAt` for the user.
3. **401 / 403 Handling**
   - When an API responds with _401 Unauthorised_ or _403 Forbidden_ the interceptor calls `user.getIdToken(/* forceRefresh */ true)` **once**, then retries the original request.
   - If the retry fails → propagate error to caller (session is likely invalid; guards will handle redirect).

## Adding a New Protected Feature

1. Place it under the _main shell_ or another protected shell.
2. If the feature requires a specific role, add `canActivate: [RoleGuard]` and `data: { roles: ['myRole'] }` on the route.
3. Keep your component logic clean – do **not** duplicate checks that guards already cover.

## Migration Notes

• `AdminGuard` still exists in the codebase but routing currently uses `RoleGuard` + route `data.roles`.

• Any component that previously assumed guards ran both _AuthGuard_ and _EmailVerifiedGuard_ still receives the same guarantees; the check order is just more granular.

## Maintenance Tips

• Redirects are implemented directly inside guards via `Router.createUrlTree()` / `Router.parseUrl()`.

• When changing guard order, remember caches: `SessionGuard` must always run first (it owns the Firebase subscription).

• Prefer extending the _RoleGuard_’s roles list rather than creating a new specialised guard.

---

_Last updated: 2025-12-19_
