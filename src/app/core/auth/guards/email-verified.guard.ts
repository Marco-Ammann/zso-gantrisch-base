// src/app/core/auth/guards/email-verified.guard.ts
import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree
} from '@angular/router';
import { map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Blocks access to routes until the user's email has been verified.
 * If not verified yet, redirects to /auth/verify-email.
 */
@Injectable({ providedIn: 'root' })
export class EmailVerifiedGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    return this.auth.user$.pipe(
      take(1),
      map(user => {
        if (user && user.emailVerified) {
          return true;
        }
        // Not verified – store original URL so we can come back after verification
        return this.router.createUrlTree(['/auth/verify-email'], {
          queryParams: { returnUrl: state.url }
        });
      })
    );
  }
}
