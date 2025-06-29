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
      take(1),
      map(user => {
        const verified = !!user && user.auth.emailVerified;
        
        this.logger.log('EmailVerifiedGuard', 'Checking email verification', { 
          uid: user?.auth.uid, 
          verified 
        });

        if (verified) {
          return true;
        }

        // Store original URL for redirect after verification
        return this.router.createUrlTree(['/auth/verify-email'], {
          queryParams: { returnUrl: state.url }
        });
      })
    );
  }
}