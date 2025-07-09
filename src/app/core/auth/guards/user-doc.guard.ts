// src/app/core/auth/guards/user-doc.guard.ts
// Ensures a Firestore user document exists and is loaded. If not, the user is logged out.

import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree,
  ActivatedRouteSnapshot,
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, switchMap, take, timeout, catchError, filter } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { LoggerService } from '@core/services/logger.service';

@Injectable({ providedIn: 'root' })
export class UserDocGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly logger: LoggerService
  ) {}

  canActivate(
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    return this.auth.appUser$.pipe(
      filter((u): u is any => u !== null),
      take(1),
      timeout({ first: 5000 }),
      catchError(() => of(null)),
      switchMap((appUser) => {
        if (!appUser) {
          // No user or still null after timeout
          this.logger.warn('UserDocGuard', 'No auth user');
          return of(
            this.router.createUrlTree(['/auth/login'], {
              queryParams: { returnUrl: state.url },
            })
          );
        }

        const docExists = !!appUser.doc;
        if (!docExists) {
          this.logger.error(
            'UserDocGuard',
            `No Firestore user doc for uid ${appUser.auth.uid} – signing out`
          );
          // Sign out the user and redirect to login
          this.auth.logout().subscribe();
          return of(
            this.router.createUrlTree(['/auth/login'], {
              queryParams: { returnUrl: state.url },
            })
          );
        }
        return of(true);
      })
    );
  }
}
