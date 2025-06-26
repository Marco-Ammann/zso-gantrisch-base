import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take, skipWhile } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { LoggerService } from '@shared/services/logger.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router, private logger: LoggerService) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.auth.appUser$.pipe(
      skipWhile(u => !u || u.doc.roles === undefined),
      take(1),
      map(u => {
        if (!u) {
          this.logger.warn('AdminGuard', 'no user');
          return this.router.parseUrl('/');
        }
        let rolesArr: string[] = [];
        if (Array.isArray(u.doc.roles)) {
          rolesArr = u.doc.roles;
        } else if ((u.doc as any).role) {
          rolesArr = [ (u.doc as any).role ];
        }
        const isAdmin = rolesArr.includes('admin');
        this.logger.info('AdminGuard', { uid: u.auth.uid, roles: rolesArr, isAdmin });
        return isAdmin ? true : this.router.parseUrl('/');
      })
    );
  }
}
