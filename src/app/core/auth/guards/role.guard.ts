// src/app/core/auth/guards/role.guard.ts
// Generic role-based guard. Accepts one or multiple roles via Route `data.roles`.
// If the user lacks any required role, redirect to /dashboard by default or to a custom `data.fallback`.

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
import { LoggerService } from '@core/services/logger.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly logger: LoggerService
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    const required = route.data['roles'] as string[] | string | undefined;
    if (!required || (Array.isArray(required) && required.length === 0)) {
      // Nothing to check – allow
      return of(true);
    }

    const requiredRoles: string[] = Array.isArray(required) ? required : [required];
    const fallback: string = route.data['fallback'] || '/dashboard';

    return this.auth.appUser$.pipe(
      take(1),
      map((appUser) => {
        if (!appUser) {
          // Should be handled by SessionGuard earlier
          return this.router.createUrlTree(['/auth/login'], {
            queryParams: { returnUrl: state.url },
          });
        }

        const roles = appUser.doc.roles || [];
        const hasRole = requiredRoles.some((r) => roles.includes(r));
        if (!hasRole) {
          this.logger.warn('RoleGuard', 'Missing required roles', {
            requiredRoles,
            userRoles: roles,
          });
          return this.router.parseUrl(fallback);
        }
        return true;
      })
    );
  }
}
