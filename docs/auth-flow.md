# Authentication & Authorization Flow

This document describes the guard hierarchy, routing structure, and `AuthInterceptor` behaviour introduced in the July 2025 refactor. Use it as a reference when adding new features or debugging auth–related issues.

---

## Overview Diagram

```
Client Request ─► SessionGuard ─► UserDocGuard ─► VerifiedGuard ─► ApprovedGuard ─► (optional) RoleGuard ─► Feature Component
                                                            ▲
                                                            │
                                             AuthRedirectGuard (for /auth/* routes)
```

## Guard Responsibilities

| Guard | Purpose | Redirect On Failure |
|-------|---------|---------------------|
| **SessionGuard** | Ensures a Firebase Auth session exists (no Firestore call). | `/auth/login` |
| **UserDocGuard** | Waits for *user document* to load. Logs out if missing. | `/auth/login` |
| **VerifiedGuard** | Requires `user.emailVerified === true`. | `/auth/verify-email` |
| **ApprovedGuard** | Requires `userDoc.approved === true` **and** `blocked === false`. | `/auth/pending-approval` or `/auth/blocked` |
| **RoleGuard** | Accepts `string | string[]` of allowed roles; generic replacement for `AdminGuard`. | `/not-authorised` |
| **AuthRedirectGuard** | Applied to `/auth/*` pages; redirects *already signed-in* users to `/dashboard`. | `/dashboard` |

### Negation Examples
A page that must be shown **only** to unapproved users (e.g. *Pending Approval*) simply omits `ApprovedGuard`, or includes a small check in the component’s `ngOnInit` to redirect away when `approved === true`.

## Route Configuration Patterns

### Shell-Level Protection
```ts
// main-shell.routes.ts
{
  path: '',
  component: MainShellComponent,
  canActivateChild: [
    SessionGuard,
    UserDocGuard,
    VerifiedGuard,
    ApprovedGuard,
  ],
  children: [
    { path: 'dashboard', loadComponent: () => import('...').then(m => m.DashboardPage) },
    { path: 'profile', loadChildren: () => import('...').then(m => m.ProfileRoutes) },
  ],
}
```

### Admin Area
```ts
{
  path: 'admin',
  component: AdminShellComponent,
  canActivateChild: [
    SessionGuard,
    UserDocGuard,
    VerifiedGuard,
    ApprovedGuard,
    RoleGuard.withRoles('admin'),
  ],
  loadChildren: () => import('./admin/routes').then(m => m.adminRoutes),
}
```

### Auth Pages
```ts
{
  path: 'auth',
  component: AuthShellComponent,
  canActivateChild: [AuthRedirectGuard],
  children: [
    { path: 'login', component: LoginPageComponent },
    { path: 'register', component: RegisterPageComponent },
    { path: 'verify-email', component: VerifyEmailPageComponent },
    { path: 'pending-approval', component: PendingApprovalPageComponent },
    { path: 'blocked', component: BlockedAccountPageComponent },
  ],
}
```

## AuthInterceptor

1. **Attaches** the current Firebase *ID token* to outgoing API requests, except:
   - Static asset URLs (e.g. `/assets/`)
   - Legal pages (privacy, imprint) – the shells render without auth.
2. **Last-Active Ping** – on successful requests, throttles a Firestore update that stores `lastActiveAt` for the user.
3. **401 / 403 Handling**
   - When an API responds with *401 Unauthorised* or *403 Forbidden* the interceptor calls `user.getIdToken(/* forceRefresh */ true)` **once**, then retries the original request.
   - If the retry fails → propagate error to caller (session is likely invalid; guards will handle redirect).

## Adding a New Protected Feature

1. Place it under the *main shell* or another protected shell.
2. If the feature requires a specific role, add `RoleGuard.withRoles('myRole')` in `canActivateChild` (or directly on the route).
3. Keep your component logic clean – do **not** duplicate checks that guards already cover.

## Migration Notes

• `AdminGuard`, `AuthGuard`, and `EmailVerifiedGuard` are **removed** – use the new hierarchy instead.

• Any component that previously assumed guards ran both *AuthGuard* and *EmailVerifiedGuard* still receives the same guarantees; the check order is just more granular.

## Maintenance Tips

• Centralised **redirect URLs** live in `AuthNavigationService` – update there when UX flows change.

• When changing guard order, remember caches: `SessionGuard` must always run first (it owns the Firebase subscription).

• Prefer extending the *RoleGuard*’s roles list rather than creating a new specialised guard.

---

_Last updated: 2025-07-10_
