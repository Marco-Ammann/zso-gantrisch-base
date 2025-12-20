// src/app/features/dashboard/dashboard.page.ts
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { AsyncPipe, DatePipe, NgComponentOutlet } from '@angular/common';
import { StatHintComponent } from './components/stat-hint/stat-hint';
import { RouterModule, Router } from '@angular/router';
import {
  Subject,
  interval,
  takeUntil,
  combineLatest,
  startWith,
  catchError,
  of,
  from,
} from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { trigger, transition, style, animate, stagger, query } from '@angular/animations';

import { UserService } from '@core/services/user.service';
import { AuthService } from '@core/auth/services/auth.service';
import { PersonService } from '@core/services/person.service';
import { LoggerService } from '@core/services/logger.service';
import { Stats } from './dashboard.model';
import { FeatureFlagKey, FeatureFlagsService } from '@core/services/feature-flags.service';
import { APP_SETTINGS } from '@config/app-settings';
import {
  DASHBOARD_WIDGETS,
  DashboardWidgetDefinition,
} from '@core/dashboard/dashboard-widgets';
import { ActivityFeedItem } from './activity-feed.model';
import { ActivityFeedService } from './services/activity-feed.service';
import { ZsoSkeleton } from '@shared/ui/zso-skeleton/zso-skeleton';
import { ZsoStateMessage } from '@shared/ui/zso-state-message/zso-state-message';

interface QuickLink {
  icon: string;
  label: string;
  description: string;
  route: string;
  color: string;
  requiresAdmin?: boolean;
  featureFlag?: FeatureFlagKey;
}

interface ExtendedStats extends Stats {
  persons?: number;
  activePersons?: number;
}

@Component({
  selector: 'zso-dashboard',
  standalone: true,
  imports: [
    AsyncPipe,
    RouterModule,
    DatePipe,
    NgComponentOutlet,
    StatHintComponent,
    ZsoSkeleton,
    ZsoStateMessage,
  ],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('staggerIn', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger(100, [
            animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class DashboardPage implements OnInit, OnDestroy {
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly personService = inject(PersonService);
  private readonly logger = inject(LoggerService);
  private readonly router = inject(Router);
  private readonly featureFlags = inject(FeatureFlagsService);
  private readonly activityFeed = inject(ActivityFeedService);
  readonly settings = inject(APP_SETTINGS);
  private readonly destroy$ = new Subject<void>();

  // State
  currentDate = new Date();



  // Observables
  appUser$ = this.authService.appUser$;
  featureFlags$ = this.featureFlags.flags$;

  private readonly widgetDefs: DashboardWidgetDefinition[] =
    ((inject(DASHBOARD_WIDGETS, { optional: true }) as unknown) as
      | DashboardWidgetDefinition[]
      | null) ?? [];

  widgets$ = combineLatest([this.appUser$, this.featureFlags$]).pipe(
    map(([appUser, flags]) => {
      const roles = appUser?.doc.roles ?? [];

      return this.widgetDefs
        .filter((w) => {
          if (w.featureFlag && flags?.[w.featureFlag] === false) return false;
          if (w.roles && w.roles.length > 0) {
            return w.roles.some((r) => roles.includes(r));
          }
          return true;
        })
        .sort((a, b) => a.order - b.order);
    }),
    switchMap((defs) => {
      if (defs.length === 0) return of([] as Array<{ id: string; title: string; component: any }>);

      return from(Promise.all(defs.map((d) => d.loadComponent()))).pipe(
        map((components) =>
          defs.map((def, i) => ({
            id: def.id,
            title: def.title,
            component: components[i],
          }))
        )
      );
    })
  );

  stats$ = combineLatest([
    this.userService.getStats().pipe(
      catchError(err => {
        this.logger.error('Dashboard', 'Failed to load user stats', err);
        return of({ total: 0, active: 0, pending: 0, blocked: 0 });
      })
    ),
    this.personService.getStats().pipe(
      catchError(err => {
        this.logger.error('Dashboard', 'Failed to load person stats', err);
        return of({ total: 0, active: 0, new: 0, inactive: 0 });
      })
    )
  ]).pipe(
    map(([userStats, personStats]) => ({
      ...userStats,
      persons: personStats.total,
      activePersons: personStats.active
    } as ExtendedStats)),
    startWith({ total: 0, active: 0, pending: 0, blocked: 0, persons: 0, activePersons: 0 })
  );

  latestActivities$ = this.activityFeed
    .activities$(5)
    .pipe(startWith(null as ActivityFeedItem[] | null));

  // Quick Links Configuration
  quickLinks: QuickLink[] = [
    {
      icon: 'event_note',
      label: 'Einsatz',
      description: 'Einsätze planen und verwalten',
      route: '/planning',
      color: 'bg-gray-500/20 hover:bg-gray-500/30 text-orange-400',
      requiresAdmin: true,
      featureFlag: 'planning',
    },
    {
      icon: 'group',
      label: 'AdZS Verwaltung',
      description: 'Angehörige des Zivilschutzes verwalten',
      route: '/adsz',
      color: 'bg-gray-500/20 hover:bg-gray-500/30 text-blue-400',
      featureFlag: 'adsz',
    },
    {
      icon: 'place',
      label: 'Orte',
      description: 'WK-Heime und Anlagen verwalten',
      route: '/places',
      color: 'bg-gray-500/20 hover:bg-gray-500/30 text-emerald-400',
      featureFlag: 'places',
    },
    {
      icon: 'admin_panel_settings',
      label: 'Benutzer verwalten',
      description: 'Systembenutzer administrieren',
      route: '/admin/users',
      color: 'bg-gray-500/20 hover:bg-gray-500/30 text-purple-400',
      requiresAdmin: true,
      featureFlag: 'adminUsers',
    }
  ];

  ngOnInit(): void {
    this.logger.log('Dashboard', 'Component initialized');

    // Start live clock
    interval(1000).pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.currentDate = new Date();
    });

    this.prefetchRoutes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.logger.log('Dashboard', 'Component destroyed');
  }

  // Helper methods
  getFilteredQuickLinks(
    isAdmin: boolean,
    enabledFlags: Partial<Record<FeatureFlagKey, boolean>> | null | undefined
  ): QuickLink[] {
    return this.quickLinks.filter((link) => {
      if (link.requiresAdmin && !isAdmin) return false;
      if (link.featureFlag && enabledFlags?.[link.featureFlag] === false) return false;
      return true;
    });
  }

  getRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
    if (hours > 0) return `vor ${hours} Stunde${hours > 1 ? 'n' : ''}`;
    return 'vor wenigen Minuten';
  }

  navigate(path: string) {
    this.router.navigate([path]);
  }

  private prefetchRoutes(): void {
    const run = () => {
      void import('../planning/planning-overview/planning-overview.page');
      void import('../adsz/adsz-overview/adsz-overview.page');
      void import('../places/places-overview/places-overview.page');
      void import('../admin/users/users.page');
      void import('./activities/activities.page');
    };

    const ric = (window as any).requestIdleCallback as
      | ((cb: () => void) => void)
      | undefined;

    if (ric) ric(run);
    else setTimeout(run, 1200);
  }
}