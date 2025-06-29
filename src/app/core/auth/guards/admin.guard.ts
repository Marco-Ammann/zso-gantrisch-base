// src/app/core/auth/guards/admin.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { LoggerService } from '@core/services/logger.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(
    private auth: AuthService, 
    private router: Router, 
    private logger: LoggerService
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.auth.appUser$.pipe(
      take(1),
      map(user => {
        if (!user) {
          this.logger.warn('AdminGuard', 'No user found');
          return this.router.parseUrl('/');
        }

        const isAdmin = user.doc.roles?.includes('admin') ?? false;
        
        this.logger.log('AdminGuard', 'Checking admin access', { 
          uid: user.auth.uid, 
          roles: user.doc.roles, 
          isAdmin 
        });

        return isAdmin ? true : this.router.parseUrl('/dashboard');
      })
    );
  }
}