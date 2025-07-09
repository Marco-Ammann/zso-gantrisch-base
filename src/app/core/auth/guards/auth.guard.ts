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
import { map, take, filter } from 'rxjs/operators';
import { AppUserCombined } from '../services/auth.service';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private router: Router,
    private logger: LoggerService
  ) {
    this.logger.log('AuthGuard', 'constructor');
    this.auth.appUser$.subscribe(user => {
      this.logger.log('AuthGuard', 'appUser$', user);
    });
  }

  canActivate(
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    return this.auth.appUser$.pipe(
      filter((u): u is AppUserCombined => u !== null),
      take(1),
      map(user => {
        this.logger.log('AuthGuard', 'Checking access', { 
          uid: user?.auth.uid, 
          approved: user?.doc.approved, 
          blocked: user?.doc.blocked,
          roles: user?.doc.roles,
          isAdmin: user?.doc.roles.includes('admin'),
          isUser: user?.doc.roles.includes('user'),
          isSessionExpired: user?.doc.lastLogoutAt ? user?.doc.lastLogoutAt < Date.now() - 1000 * 60 * 60 * 24 : false
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