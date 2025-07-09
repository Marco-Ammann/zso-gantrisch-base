// src/app/core/auth/guards/approved.guard.ts
// Ensures the user's account is approved and not blocked.
// Redirects accordingly:
//   - Not approved -> /auth/pending-approval
//   - Blocked      -> /auth/login

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
export class ApprovedGuard implements CanActivate {
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
          return this.router.createUrlTree(['/auth/login'], {
            queryParams: { returnUrl: state.url },
          });
        }

        if (appUser.doc.blocked) {
          this.logger.warn('ApprovedGuard', 'User is blocked');
          return this.router.createUrlTree(['/auth/login']);
        }

        if (!appUser.doc.approved) {
          this.logger.info(
            'ApprovedGuard',
            'User not approved – redirecting to pending-approval'
          );
          return this.router.createUrlTree(['/auth/pending-approval']);
        }

        return true;
      })
    );
  }
}
