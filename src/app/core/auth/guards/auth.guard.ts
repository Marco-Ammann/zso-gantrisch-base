// src/app/core/auth/guards/auth.guard.ts
import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
  UrlTree
} from '@angular/router';
import { Observable } from 'rxjs';
import { LoggerService } from '@core/services/logger.service';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
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
      take(1),
      map(user => {
        this.logger.log('AuthGuard', 'Checking access', { 
          uid: user?.auth.uid, 
          approved: user?.doc.approved, 
          blocked: user?.doc.blocked 
        });

        // Not logged in
        if (!user) {
          return this.router.createUrlTree(['/auth/login'], {
            queryParams: { returnUrl: state.url }
          });
        }

        // User is blocked
        if (user.doc.blocked) {
          this.logger.warn('AuthGuard', 'User is blocked', user.auth.uid);
          return this.router.createUrlTree(['/auth/login']);
        }

        // User not approved
        if (!user.doc.approved) {
          return this.router.createUrlTree(['/auth/pending-approval']);
        }

        // All checks passed
        return true;
      })
    );
  }
}