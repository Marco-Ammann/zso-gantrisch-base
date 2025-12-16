// src/app/features/dashboard/dashboard.page.ts
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { StatHintComponent } from './components/stat-hint/stat-hint';
import { ActivityWidgetComponent } from './components/activity-widget/activity-widget';
import { RouterModule, Router } from '@angular/router';
import { Subject, interval, takeUntil, combineLatest, startWith, catchError, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { trigger, transition, style, animate, stagger, query } from '@angular/animations';

import { UserService } from '@core/services/user.service';
import { PlacesService } from '../places/services/places.service';
import { AuthService } from '@core/auth/services/auth.service';
import { PersonService } from '@core/services/person.service';
import { LoggerService } from '@core/services/logger.service';
import { UserDoc } from '@core/models/user-doc';
import { Stats } from './dashboard.model';
import { FeatureFlagKey, FeatureFlagsService } from '@core/services/feature-flags.service';
import { APP_SETTINGS } from '@config/app-settings';

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

// Unified item for activity feed entries
export interface ActivityFeedItem {
  id: string;
  name: string;
  text: string;
  icon: string;
  color: string;
  timestamp: number;
  route: string;
  avatarText?: string; // e.g. user initials or first letter of place
}

@Component({
  selector: 'zso-dashboard',
  standalone: true,
  imports: [AsyncPipe, RouterModule, DatePipe, StatHintComponent, ActivityWidgetComponent],
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
  private readonly placesService = inject(PlacesService);
  private readonly logger = inject(LoggerService);
  private readonly router = inject(Router);
  private readonly featureFlags = inject(FeatureFlagsService);
  readonly settings = inject(APP_SETTINGS);
  private readonly destroy$ = new Subject<void>();

  // State
  loading = true;
  error: string | null = null;
  currentDate = new Date();



  // Observables
  appUser$ = this.authService.appUser$;
  featureFlags$ = this.featureFlags.flags$;

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

  latestUsers$ = this.userService.getAllUsers().pipe(
    map(users => users
      .sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt))
      .slice(0, 5)
    ),
    catchError(err => {
      this.logger.error('Dashboard', 'Failed to load latest users', err);
      return of([]);
    })
  );

  recentPlaces$ = this.placesService.getAll().pipe(
    map(places => places
      .sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt))
      .slice(0, 5)
    ),
    catchError(err => {
      this.logger.error('Dashboard', 'Failed to load recent places', err);
      return of([]);
    })
  );

  latestActivities$ = combineLatest([this.latestUsers$, this.recentPlaces$]).pipe(
    map(([users, places]) => {
      const userItems: ActivityFeedItem[] = users.map(u => ({
        id: u.uid,
        name: `${u.firstName} ${u.lastName}`,
        text: this.getActivityText(u),
        icon: this.getActivityIcon(u),
        color: this.getActivityColor(u),
        timestamp: u.updatedAt ?? u.createdAt,
        route: '/admin/users',
        avatarText: this.getUserInitials(u),
      }));

      const placeItems: ActivityFeedItem[] = places.map(p => ({
        id: p.id,
        name: p.name,
        text: p.updatedAt && p.updatedAt > p.createdAt ? 'Ort aktualisiert' : 'Neuer Ort',
        icon: 'place',
        color: 'text-emerald-400',
        timestamp: p.updatedAt ?? p.createdAt,
        route: `/places/${p.id}`,
        avatarText: p.name.charAt(0).toUpperCase(),
      }));

      return [...userItems, ...placeItems]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5);
    })
  );

  // Quick Links Configuration
  quickLinks: QuickLink[] = [
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

    // Simulate loading
    setTimeout(() => {
      this.loading = false;
    }, 800);
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

  getUserInitials(user: UserDoc): string {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
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

  getActivityText(user: UserDoc): string {
    if (!user.approved) return 'Registrierung ausstehend';
    if (user.blocked) return 'Benutzer gesperrt';
    if (user.updatedAt && user.updatedAt > user.createdAt) return 'Profil aktualisiert';
    return 'Neu registriert';
  }

  getActivityIcon(user: UserDoc): string {
    if (!user.approved) return 'schedule';
    if (user.blocked) return 'block';
    if (user.updatedAt && user.updatedAt > user.createdAt) return 'edit';
    return 'person_add';
  }

  navigate(path: string) {
    this.router.navigate([path]);
  }

  getActivityColor(user: UserDoc): string {
    if (!user.approved) return 'text-amber-400';
    if (user.blocked) return 'text-rose-400';
    return 'text-green-400';
  }
}