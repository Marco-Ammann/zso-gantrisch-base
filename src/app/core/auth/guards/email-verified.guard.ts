// src/app/core/auth/guards/email-verified.guard.ts
import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree
} from '@angular/router';
import { map, take, switchMap, filter } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { LoggerService } from '@core/services/logger.service';

@Injectable({ providedIn: 'root' })
export class EmailVerifiedGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private router: Router,
    private logger: LoggerService
  ) {}

  canActivate(
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    return this.auth.appUser$.pipe(
      filter((u) => u !== undefined),
      take(1),
      switchMap((appUser) => {
        // No signed-in user – redirect to login (avoid infinite loop if already on login)
        if (!appUser) {
          this.logger.warn('EmailVerifiedGuard', 'No user, redirecting to login');
          return of(
            this.router.createUrlTree(['/auth/login'], {
              queryParams: { returnUrl: state.url },
            })
          );
        }

        // Already verified
        if (appUser.auth.emailVerified) {
          return of(true);
        }

        // Refresh and check again
        return this.auth.refreshAndCheckEmail().pipe(
          map((isVerified) =>
            isVerified
              ? true
              : this.router.createUrlTree(['/auth/verify-email'], {
                  queryParams: { returnUrl: state.url },
                })
          )
        );
      })
    );
  }
}