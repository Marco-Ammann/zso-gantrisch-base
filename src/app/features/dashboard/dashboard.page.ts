// src/app/features/dashboard/dashboard.page.ts
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, AsyncPipe, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil, combineLatest, startWith, catchError, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { trigger, transition, style, animate, stagger, query } from '@angular/animations';

import { UserService } from '@core/services/user.service';
import { AuthService } from '@core/auth/services/auth.service';
import { PersonService } from '@core/services/person.service';
import { LoggerService } from '@core/services/logger.service';
import { UserDoc } from '@core/models/user-doc';
import { Stats } from './dashboard.model';

interface QuickLink {
  icon: string;
  label: string;
  description: string;
  route: string;
  color: string;
  requiresAdmin?: boolean;
}

interface ExtendedStats extends Stats {
  persons?: number;
  activePersons?: number;
}

@Component({
  selector: 'zso-dashboard',
  standalone: true,
  imports: [CommonModule, AsyncPipe, RouterModule, DatePipe],
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
  private readonly destroy$ = new Subject<void>();

  // State
  loading = true;
  error: string | null = null;
  currentDate = new Date();

  // Observables
  appUser$ = this.authService.appUser$;
  
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

  // Quick Links Configuration
  quickLinks: QuickLink[] = [
    {
      icon: 'group',
      label: 'AdZS Verwaltung',
      description: 'Angehörige des Zivilschutzes verwalten',
      route: '/adsz',
      color: 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400'
    },
    {
      icon: 'school',
      label: 'Ausbildungen',
      description: 'Kurse und Trainings planen',
      route: '/training',
      color: 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
    },
    {
      icon: 'emergency',
      label: 'Notfallkontakte',
      description: 'Wichtige Kontakte verwalten',
      route: '/emergency',
      color: 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400'
    },
    {
      icon: 'admin_panel_settings',
      label: 'Benutzer verwalten',
      description: 'Systembenutzer administrieren',
      route: '/admin/users',
      color: 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-400',
      requiresAdmin: true
    }
  ];

  ngOnInit(): void {
    this.logger.log('Dashboard', 'Component initialized');
    
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
  getFilteredQuickLinks(isAdmin: boolean): QuickLink[] {
    return this.quickLinks.filter(link => !link.requiresAdmin || isAdmin);
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

  getActivityColor(user: UserDoc): string {
    if (!user.approved) return 'text-amber-400';
    if (user.blocked) return 'text-rose-400';
    return 'text-green-400';
  }
}