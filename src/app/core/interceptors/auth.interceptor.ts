// src/app/core/interceptors/auth.interceptor.ts
import { Injectable, OnDestroy, inject } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent
} from '@angular/common/http';
import { from, Observable, Subject, EMPTY, throwError } from 'rxjs';
import { switchMap, takeUntil, first, catchError } from 'rxjs/operators';
import { AuthService } from '../auth/services/auth.service';
import { LoggerService } from '../services/logger.service';
import { UserService } from '../services/user.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly logger = inject(LoggerService);
  private readonly userService = inject(UserService);
  private lastUpdate = 0;
  private readonly UPDATE_INTERVAL = 5 * 60 * 1000; // 5 Minuten

  constructor(private authService: AuthService) { }

  intercept(
    req: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    // Prevent endless retry loops
    const alreadyRetried = req.headers.has('x-auth-retried');
    // Skip auth for legal pages and non-API requests
    if (this.shouldSkipAuth(req.url)) {
      return next.handle(req);
    }

    return from(this.authService.getToken()).pipe(
      switchMap(token => {
        if (!token) {
          return next.handle(req);
        }

        const authReq = req.clone({
          setHeaders: { Authorization: `Bearer ${token}` }
        });

        // Update last active at if needed (throttled)
        this.updateLastActiveIfNeeded();

        return next.handle(authReq);
      }),
      catchError((error) => {
        // Attempt one retry on 401/403 if we haven't retried yet
        if (
          !alreadyRetried &&
          error.status &&
          (error.status === 401 || error.status === 403)
        ) {
          this.logger.warn(
            'AuthInterceptor',
            'Received',
            error.status,
            '– attempting token refresh'
          );
          return from(this.authService.getToken(true)).pipe(
            switchMap((newToken) => {
              if (!newToken) {
                return throwError(() => error);
              }
              const retryReq = req.clone({
                setHeaders: { Authorization: `Bearer ${newToken}` },
                headers: req.headers.set('x-auth-retried', 'true'),
              });
              return next.handle(retryReq);
            })
          );
        }

        this.logger.error('AuthInterceptor', 'Request failed:', error);
        return throwError(() => error);
      }),
      takeUntil(this.destroy$)
    );
  }

  private shouldSkipAuth(url: string): boolean {
    const skipPatterns = [
      '/datenschutz',
      '/impressum',
      '/changelog',
      'assets/',
      '.css',
      '.js',
      '.ico',
      '.png',
      '.jpg',
      '.jpeg',
      '.svg'
    ];

    return skipPatterns.some(pattern => url.includes(pattern));
  }

  private updateLastActiveIfNeeded(): void {
    const now = Date.now();
    if (now - this.lastUpdate > this.UPDATE_INTERVAL) {
      this.lastUpdate = now;

      this.authService.appUser$.pipe(
        first(),
        takeUntil(this.destroy$),
        catchError(error => {
          this.logger.error('AuthInterceptor', 'Error updating last active:', error);
          return EMPTY;
        })
      ).subscribe({
        next: user => {
          if (user?.doc.uid) {
            // Use a simple service call without complex subscription management
            this.userService
              .updateLastActiveAt(user.doc.uid)
              .pipe(
                first(),
                catchError(() => EMPTY) // Silent fail for last active updates
              )
              .subscribe();
          }
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.logger.log('AuthInterceptor', 'Interceptor destroyed');
  }
}