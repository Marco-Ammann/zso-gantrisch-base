// src/app/core/services/state-management.service.ts
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, distinctUntilChanged, shareReplay } from 'rxjs/operators';
import { LoggerService } from './logger.service';

export interface LoadingState {
  [key: string]: boolean;
}

export interface ErrorState {
  [key: string]: string | null;
}

export interface AppState {
  loading: LoadingState;
  errors: ErrorState;
  lastUpdated: { [key: string]: number };
}

@Injectable({ providedIn: 'root' })
export class StateManagementService {
  private logger = inject(LoggerService);

  // Separate State Subjects für bessere Performance
  private loadingState$ = new BehaviorSubject<LoadingState>({});
  private errorState$ = new BehaviorSubject<ErrorState>({});
  private lastUpdatedState$ = new BehaviorSubject<{ [key: string]: number }>({});

  // Combined App State
  readonly appState$: Observable<AppState> = combineLatest([
    this.loadingState$,
    this.errorState$,
    this.lastUpdatedState$
  ]).pipe(
    map(([loading, errors, lastUpdated]) => ({
      loading,
      errors,
      lastUpdated
    })),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  // Convenience Observables
  readonly isAnyLoading$ = this.loadingState$.pipe(
    map(state => Object.values(state).some(loading => loading)),
    distinctUntilChanged()
  );

  readonly hasAnyError$ = this.errorState$.pipe(
    map(state => Object.values(state).some(error => error !== null)),
    distinctUntilChanged()
  );

  readonly globalError$ = this.errorState$.pipe(
    map(state => {
      const errors = Object.values(state).filter(error => error !== null);
      return errors.length > 0 ? errors[0] : null;
    }),
    distinctUntilChanged()
  );

  /**
   * Loading State Management
   */
  setLoading(key: string, isLoading: boolean): void {
    const current = this.loadingState$.value;
    this.loadingState$.next({
      ...current,
      [key]: isLoading
    });
    
    this.logger.log('StateManagement', `Loading ${key}:`, isLoading);
  }

  isLoading$(key: string): Observable<boolean> {
    return this.loadingState$.pipe(
      map(state => state[key] || false),
      distinctUntilChanged()
    );
  }

  isLoading(key: string): boolean {
    return this.loadingState$.value[key] || false;
  }

  /**
   * Error State Management
   */
  setError(key: string, error: string | null): void {
    const current = this.errorState$.value;
    this.errorState$.next({
      ...current,
      [key]: error
    });

    if (error) {
      this.logger.error('StateManagement', `Error in ${key}:`, error);
    } else {
      this.logger.log('StateManagement', `Cleared error for ${key}`);
    }
  }

  getError$(key: string): Observable<string | null> {
    return this.errorState$.pipe(
      map(state => state[key] || null),
      distinctUntilChanged()
    );
  }

  getError(key: string): string | null {
    return this.errorState$.value[key] || null;
  }

  clearError(key: string): void {
    this.setError(key, null);
  }

  clearAllErrors(): void {
    this.errorState$.next({});
    this.logger.log('StateManagement', 'All errors cleared');
  }

  /**
   * Last Updated Tracking
   */
  updateTimestamp(key: string): void {
    const current = this.lastUpdatedState$.value;
    this.lastUpdatedState$.next({
      ...current,
      [key]: Date.now()
    });
  }

  getLastUpdated$(key: string): Observable<number | null> {
    return this.lastUpdatedState$.pipe(
      map(state => state[key] || null),
      distinctUntilChanged()
    );
  }

  getLastUpdated(key: string): number | null {
    return this.lastUpdatedState$.value[key] || null;
  }

  /**
   * Combined Operations
   */
  startOperation(key: string): void {
    this.setLoading(key, true);
    this.clearError(key);
  }

  completeOperation(key: string, error?: string): void {
    this.setLoading(key, false);
    if (error) {
      this.setError(key, error);
    } else {
      this.updateTimestamp(key);
    }
  }

  /**
   * Bulk Operations
   */
  setMultipleLoading(keys: string[], isLoading: boolean): void {
    const current = this.loadingState$.value;
    const updates = keys.reduce((acc, key) => ({
      ...acc,
      [key]: isLoading
    }), {});
    
    this.loadingState$.next({
      ...current,
      ...updates
    });
  }

  /**
   * State Reset
   */
  resetState(key?: string): void {
    if (key) {
      // Reset specific key
      const loading = this.loadingState$.value;
      const errors = this.errorState$.value;
      const timestamps = this.lastUpdatedState$.value;

      delete loading[key];
      delete errors[key];
      delete timestamps[key];

      this.loadingState$.next({ ...loading });
      this.errorState$.next({ ...errors });
      this.lastUpdatedState$.next({ ...timestamps });
      
      this.logger.log('StateManagement', `State reset for key: ${key}`);
    } else {
      // Reset all state
      this.loadingState$.next({});
      this.errorState$.next({});
      this.lastUpdatedState$.next({});
      
      this.logger.log('StateManagement', 'All state reset');
    }
  }

  /**
   * Debug Helpers
   */
  getCurrentState(): AppState {
    return {
      loading: this.loadingState$.value,
      errors: this.errorState$.value,
      lastUpdated: this.lastUpdatedState$.value
    };
  }

  logCurrentState(): void {
    this.logger.log('StateManagement', 'Current State:', this.getCurrentState());
  }

  /**
   * Performance Monitoring
   */
  getStateMetrics() {
    const state = this.getCurrentState();
    return {
      loadingCount: Object.keys(state.loading).length,
      activeLoadingCount: Object.values(state.loading).filter(Boolean).length,
      errorCount: Object.keys(state.errors).length,
      activeErrorCount: Object.values(state.errors).filter(error => error !== null).length,
      trackedKeysCount: new Set([
        ...Object.keys(state.loading),
        ...Object.keys(state.errors),
        ...Object.keys(state.lastUpdated)
      ]).size
    };
  }
}