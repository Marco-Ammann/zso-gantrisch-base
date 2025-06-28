import { Injectable, OnDestroy } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent
} from '@angular/common/http';
import { from, Observable, Subject } from 'rxjs';
import { switchMap, takeUntil, first } from 'rxjs/operators';
import { AuthService } from '../auth/services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor, OnDestroy {
  private destroy$ = new Subject<void>();
  private lastUpdate = 0;

  constructor(private authService: AuthService) {}

  intercept(
    req: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    return from(this.authService.getToken()).pipe(
      switchMap(token => {
        if (!token) {
          return next.handle(req);
        }

        const authReq = req.clone({
          setHeaders: { Authorization: `Bearer ${token}` }
        });

        // Update last active at if needed
        this.updateLastActiveIfNeeded();

        return next.handle(authReq);
      })
    );
  }

  private updateLastActiveIfNeeded(): void {
    const now = Date.now();
    if (now - this.lastUpdate > 5 * 60 * 1000) {
      this.lastUpdate = now;
      
      this.authService.appUser$.pipe(
        first(),
        takeUntil(this.destroy$)
      ).subscribe({
        next: user => {
          if (user?.doc.uid) {
            this.authService['userService']?.updateLastActiveAt(user.doc.uid)
              .pipe(takeUntil(this.destroy$))
              .subscribe();
          }
        },
        error: (error) => {
          console.error('Error in auth interceptor:', error);
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}