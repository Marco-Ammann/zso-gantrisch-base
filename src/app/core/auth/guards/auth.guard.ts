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
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  /**
   * Verhindert den Zugriff auf geschützte Routen, wenn kein User eingeloggt ist.
   * Leitet in diesem Fall auf /auth/login um und übergibt die ursprüngliche URL als returnUrl.
   */
  canActivate(
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    return this.auth.user$.pipe(
      take(1),
      map(user =>
        user
          ? true
          : this.router.createUrlTree(['/auth/login'], {
              queryParams: { returnUrl: state.url }
            })
      )
    );
  }
}
