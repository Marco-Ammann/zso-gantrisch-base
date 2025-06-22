import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.auth.appUser$.pipe(
      take(1),
      map(u => {
        if (!u) {
          console.log('[AdminGuard] no user');
          return this.router.parseUrl('/');
        }
        const rolesArr = u.doc.roles ?? (u.doc as any).role ? [ (u.doc as any).role ] : [];
        const isAdmin = rolesArr.includes('admin');
        console.log('[AdminGuard]', { uid: u.auth.uid, roles: rolesArr, isAdmin });
        return isAdmin ? true : this.router.parseUrl('/');
      })
    );
  }
}
