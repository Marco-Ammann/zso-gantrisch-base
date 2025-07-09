// src/app/core/auth/guards/session.guard.ts
// Checks only if a Firebase auth session exists. Does NOT depend on Firestore.
// Redirects unauthenticated users to /auth/login and preserves the desired return URL.

import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree,
  ActivatedRouteSnapshot,
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, take, switchMap, filter, timeout, catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { LoggerService } from '@core/services/logger.service';

@Injectable({ providedIn: 'root' })
export class SessionGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly logger: LoggerService
  ) {}

  canActivate(
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    return this.auth.authInitialized$.pipe(
      filter(Boolean),
      take(1),
      switchMap(() =>
        this.auth.user$.pipe(
          filter((u) => u !== null),
          take(1),
          timeout({ first: 5000 }),
          catchError(() => of(null))
        )
      ),
      map((user) => {
        if (user) {
          return true;
        }
        this.logger.warn('SessionGuard', 'No active session – redirecting');
        return this.router.createUrlTree(['/auth/login'], {
          queryParams: { returnUrl: state.url },
        });
      })
    );
  }
}
