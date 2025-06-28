import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent
} from '@angular/common/http';
import { from, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from '../auth/services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  private lastUpdate = 0;

  intercept(
    req: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    // getToken liefert nun ein Promise<string>
    return from(this.authService.getToken()).pipe(
      switchMap(token => {
        if (!token) {
          return next.handle(req);
        }
        const authReq = req.clone({
          setHeaders: { Authorization: `Bearer ${token}` }
        });
        const now = Date.now();
            if (now - this.lastUpdate > 5 * 60 * 1000) {
              this.lastUpdate = now;
              this.authService.appUser$.subscribe(user => {
                if (user?.doc.uid) {
                  // fire and forget
                  this.authService['userService']?.updateLastActiveAt(user.doc.uid).subscribe({});
                }
              });
            }
            return next.handle(authReq);
      })
    );
  }
}