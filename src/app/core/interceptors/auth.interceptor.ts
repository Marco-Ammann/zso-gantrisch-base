// src/app/core/interceptors/auth.interceptor.ts
import { Injectable, OnDestroy, inject } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent
} from '@angular/common/http';
import { from, Observable, Subject, EMPTY } from 'rxjs';
import { switchMap, takeUntil, first, catchError } from 'rxjs/operators';
import { AuthService } from '../auth/services/auth.service';
import { LoggerService } from '../services/logger.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly logger = inject(LoggerService);
  private lastUpdate = 0;
  private readonly UPDATE_INTERVAL = 5 * 60 * 1000; // 5 Minuten

  constructor(private authService: AuthService) {}

  intercept(
    req: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
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
      catchError(error => {
        this.logger.error('AuthInterceptor', 'Request failed:', error);
        return next.handle(req); // Fallback to original request
      }),
      takeUntil(this.destroy$)
    );
  }

  private shouldSkipAuth(url: string): boolean {
    const skipPatterns = [
      '/datenschutz',
      '/impressum',
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
            this.authService['userService']?.updateLastActiveAt(user.doc.uid)
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