// src/app/core/services/subscription.service.ts
import { Injectable, inject, OnDestroy } from '@angular/core';
import {
  Observable,
  Subject,
  BehaviorSubject,
  Subscription,
  EMPTY,
  timer,
} from 'rxjs';
import {
  catchError,
  finalize,
  retry,
  retryWhen,
  delay,
  take,
  takeUntil,
  tap,
} from 'rxjs/operators';
import { LoggerService } from '@core/services/logger.service';

export interface SubscriptionConfig {
  /** Automatische Retry-Versuche bei Fehlern */
  retryAttempts?: number;
  /** Delay zwischen Retry-Versuchen (ms) */
  retryDelay?: number;
  /** Loading State automatisch verwalten */
  manageLoading?: boolean;
  /** Error State automatisch verwalten */
  manageError?: boolean;
  /** Debug-Name für Logging */
  debugName?: string;
  /** Komponenten-Context für Cleanup */
  component?: string;
}

export interface SubscriptionState {
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

@Injectable({ providedIn: 'root' })
export class SubscriptionService implements OnDestroy {
  private logger = inject(LoggerService);
  private destroy$ = new Subject<void>();

  // Globale State-Tracker
  private subscriptions = new Map<string, Subscription>();
  private componentCleanup = new Map<string, Subject<void>>();
  private globalState$ = new BehaviorSubject<Map<string, SubscriptionState>>(
    new Map()
  );

  // Performance Metrics
  private metrics = {
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    errors: 0,
    successfulOperations: 0,
  };

  constructor() {
    // Performance Monitoring
    timer(0, 10000)
      .pipe(
        takeUntil(this.destroy$),
        tap(() => this.logMetrics())
      )
      .subscribe();
  }

  /**
   * Zentrale Subscription-Methode mit erweiterten Features
   */
  subscribe<T>(
    observable$: Observable<T>,
    config: SubscriptionConfig = {}
  ): {
    data$: Observable<T>;
    state$: Observable<SubscriptionState>;
    unsubscribe: () => void;
  } {
    const {
      retryAttempts = 3,
      retryDelay = 1000,
      manageLoading = true,
      manageError = true,
      debugName = 'anonymous',
      component = 'global',
    } = config;

    const subscriptionId = this.generateId(debugName, component);

    // State für diese Subscription
    const state$ = new BehaviorSubject<SubscriptionState>({
      isLoading: false,
      error: null,
      lastUpdated: null,
    });

    // Component Cleanup Subject erstellen falls nicht vorhanden
    if (!this.componentCleanup.has(component)) {
      this.componentCleanup.set(component, new Subject<void>());
    }
    const componentDestroy$ = this.componentCleanup.get(component)!;

    // Enhanced Observable mit allen Features
    const data$ = observable$.pipe(
      tap(() => {
        if (manageLoading) {
          state$.next({ ...state$.value, isLoading: true, error: null });
        }
        this.logger.log('SubscriptionService', `Started: ${debugName}`, {
          component,
          subscriptionId,
        });
      }),
      retryWhen((errors) =>
        errors.pipe(
          tap((error) => {
            this.metrics.errors++;
            this.logger.error(
              'SubscriptionService',
              `Error in ${debugName}:`,
              error
            );
            if (manageError) {
              state$.next({
                ...state$.value,
                error: error.message || 'Unbekannter Fehler',
                isLoading: false,
              });
            }
          }),
          delay(retryDelay),
          take(retryAttempts)
        )
      ),
      catchError((error) => {
        this.logger.error(
          'SubscriptionService',
          `Final error in ${debugName}:`,
          error
        );
        if (manageError) {
          state$.next({
            ...state$.value,
            error: `Endgültiger Fehler: ${error.message}`,
            isLoading: false,
          });
        }
        return EMPTY;
      }),
      finalize(() => {
        if (manageLoading) {
          state$.next({
            ...state$.value,
            isLoading: false,
            lastUpdated: Date.now(),
          });
        }
        this.metrics.successfulOperations++;
        this.logger.log('SubscriptionService', `Completed: ${debugName}`);
        this.cleanupSubscription(subscriptionId);
      }),
      takeUntil(componentDestroy$),
      takeUntil(this.destroy$)
    );

    // Subscription registrieren
    const subscription = data$.subscribe();
    this.subscriptions.set(subscriptionId, subscription);
    this.metrics.totalSubscriptions++;
    this.metrics.activeSubscriptions++;

    // Manual unsubscribe Funktion
    const unsubscribe = () => {
      this.cleanupSubscription(subscriptionId);
      state$.complete();
    };

    return {
      data$,
      state$: state$.asObservable(),
      unsubscribe,
    };
  }

  /**
   * Component-spezifisches Cleanup
   */
  destroyComponent(componentName: string): void {
    const componentDestroy$ = this.componentCleanup.get(componentName);
    if (componentDestroy$) {
      componentDestroy$.next();
      componentDestroy$.complete();
      this.componentCleanup.delete(componentName);
      this.logger.log(
        'SubscriptionService',
        `Component destroyed: ${componentName}`
      );
    }
  }

  /**
   * Einfache Subscription ohne State Management
   */
  simpleSubscribe<T>(
    observable$: Observable<T>,
    next?: (value: T) => void,
    error?: (error: any) => void,
    component = 'global'
  ): () => void {
    const { data$, unsubscribe } = this.subscribe(observable$, {
      manageLoading: false,
      manageError: false,
      component,
      debugName: 'simple',
    });

    data$.subscribe({
      next,
      error:
        error ||
        ((err) =>
          this.logger.error(
            'SubscriptionService',
            'Simple subscription error:',
            err
          )),
    });

    return unsubscribe;
  }

  /**
   * Batch-Operation für mehrere Observables
   */
  batchSubscribe<T>(
    observables: { name: string; observable$: Observable<T> }[],
    component = 'global'
  ): {
    states$: Observable<Map<string, SubscriptionState>>;
    unsubscribeAll: () => void;
  } {
    const unsubscribeFunctions: (() => void)[] = [];
    const states = new Map<string, SubscriptionState>();
    const states$ = new BehaviorSubject(states);

    observables.forEach(({ name, observable$ }) => {
      const { state$, unsubscribe } = this.subscribe(observable$, {
        debugName: name,
        component,
      });

      state$.subscribe((state) => {
        states.set(name, state);
        states$.next(new Map(states));
      });

      unsubscribeFunctions.push(unsubscribe);
    });

    return {
      states$: states$.asObservable(),
      unsubscribeAll: () => unsubscribeFunctions.forEach((fn) => fn()),
    };
  }

  /**
   * Globale Metriken abrufen
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeSubscriptions: this.subscriptions.size,
      componentCount: this.componentCleanup.size,
    };
  }

  /**
   * Alle aktiven Subscriptions anzeigen (Debug)
   */
  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  private generateId(debugName: string, component: string): string {
    return `${component}_${debugName}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }

  private cleanupSubscription(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription && !subscription.closed) {
      subscription.unsubscribe();
    }
    this.subscriptions.delete(subscriptionId);
    this.metrics.activeSubscriptions = Math.max(
      0,
      this.metrics.activeSubscriptions - 1
    );
  }

  private logMetrics(): void {
    const metrics = this.getMetrics();
    if (metrics.activeSubscriptions > 0) {
      this.logger.log('SubscriptionService', 'Performance Metrics:', metrics);
    }
  }

  ngOnDestroy(): void {
    // Alle Subscriptions cleanup
    this.subscriptions.forEach((sub) => {
      if (!sub.closed) sub.unsubscribe();
    });

    // Alle Component Subjects cleanup
    this.componentCleanup.forEach((subject) => {
      subject.next();
      subject.complete();
    });

    this.destroy$.next();
    this.destroy$.complete();

    this.logger.log(
      'SubscriptionService',
      'Service destroyed. Final metrics:',
      this.getMetrics()
    );
  }
}
