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
import { LoggerService } from '@shared/services/logger.service';
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

  /**
   * Verhindert den Zugriff auf geschützte Routen, wenn kein User eingeloggt ist.
   * Leitet in diesem Fall auf /auth/login um und übergibt die ursprüngliche URL als returnUrl.
   */
  canActivate(
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    return this.auth.appUser$.pipe(
      take(1),
      map(u => {
        const isLoggedIn = !!u && !u.doc.blocked && u.doc.approved; // used only for logging
        this.logger.info('[AuthGuard]', { uid: u?.auth.uid, blocked: u?.doc.blocked, approved: u?.doc.approved, isLoggedIn });
        if (!u) {
          // not logged in at all
          return this.router.createUrlTree(['/auth/login'], {
            queryParams: { returnUrl: state.url }
          });
        }
        if (u.doc.blocked) {
          return this.router.createUrlTree(['/auth/login']);
        }
        if (!u.doc.approved) {
          return this.router.createUrlTree(['/auth/pending-approval']);
        }
        return true;
      })
    );
  }
}
