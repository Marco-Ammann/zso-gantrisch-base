// src/app/core/auth/guards/auth-redirect.guard.ts
// Prevents authenticated & fully authorised users from returning to /auth routes.
// Redirects them to the returnUrl query param (if provided) or /dashboard.

import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
  Router,
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthRedirectGuard implements CanActivate {
  constructor(private readonly auth: AuthService, private readonly router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    return this.auth.appUser$.pipe(
      take(1),
      map((appUser) => {
        if (!appUser) {
          // Not authenticated – allow access to auth pages
          return true;
        }
        // Already verified & approved & not blocked => redirect away
        if (
          appUser.auth.emailVerified &&
          appUser.doc.approved &&
          !appUser.doc.blocked
        ) {
          const returnUrl = route.queryParamMap.get('returnUrl') || '/dashboard';
          return this.router.parseUrl(returnUrl);
        }
        // Otherwise (e.g. pending approval / unverified) allow staying on auth pages
        return true;
      })
    );
  }
}
