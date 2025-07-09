// src/app/core/auth/guards/verified.guard.ts
// Requires the signed-in user to have a verified e-mail.
// Assumes SessionGuard and UserDocGuard already ran (user + doc are present).

import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree,
  ActivatedRouteSnapshot,
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { LoggerService } from '@core/services/logger.service';

@Injectable({ providedIn: 'root' })
export class VerifiedGuard implements CanActivate {
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
      take(1),
      map((appUser) => {
        if (!appUser) {
          // Safety fallback – should be impossible here
          return this.router.createUrlTree(['/auth/login'], {
            queryParams: { returnUrl: state.url },
          });
        }

        if (!appUser.auth.emailVerified) {
          this.logger.warn('VerifiedGuard', 'E-mail not verified');
          return this.router.createUrlTree(['/auth/verify-email'], {
            queryParams: { returnUrl: state.url },
          });
        }

        return true;
      })
    );
  }
}
