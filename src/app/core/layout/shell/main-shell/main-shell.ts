import { Component, inject, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { map, take, filter, takeUntil } from 'rxjs/operators';
import { Subject, combineLatest } from 'rxjs';

import { OverlayModule } from '@angular/cdk/overlay';
import { CdkConnectedOverlay, ConnectedPosition } from '@angular/cdk/overlay';

import { AuthService } from '@core/auth/services/auth.service';
import { FeatureFlagsService } from '@core/services/feature-flags.service';
import { AppFooter } from '@shared/components/app-footer/app-footer';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'zso-main-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, OverlayModule, AppFooter],
  templateUrl: './main-shell.html',
  styleUrls: ['./main-shell.scss'],
  animations: [
    trigger('mobileSlide', [
      state('closed', style({ height: '0px', opacity: 0 })),
      state('open', style({ height: '*', opacity: 1 })),
      transition('closed => open', [
        animate('300ms cubic-bezier(0.4, 0.0, 0.2, 1)')
      ]),
      transition('open => closed', [
        animate('250ms cubic-bezier(0.4, 0.0, 1, 1)')
      ])
    ]),
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'scale(0.95)' }))
      ])
    ])
  ]
})
export class MainShell implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  private readonly featureFlags = inject(FeatureFlagsService);
  appUser$ = this.auth.appUser$;
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  showLinks = false;
  isAdmin$ = this.auth.appUser$.pipe(map(u => u?.doc.roles?.includes('admin') ?? false));
  initials$ = this.auth.appUser$.pipe(map(u => u?.doc.email?.[0].toUpperCase() ?? 'U'));
  showAdzs$ = this.featureFlags.isEnabled$('adsz');
  showPlaces$ = this.featureFlags.isEnabled$('places');
  showAdminUsers$ = combineLatest([
    this.isAdmin$,
    this.featureFlags.isEnabled$('adminUsers'),
  ]).pipe(map(([isAdmin, enabled]) => isAdmin && enabled));

  /* ---------- Overlay für Avatar ---------- */
  @ViewChild(CdkConnectedOverlay) overlay?: CdkConnectedOverlay;
  overlayOpen = false;
  positions: ConnectedPosition[] = [
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -8 }
  ];

  toggleProfile() { this.overlayOpen = !this.overlayOpen; }
  myProfile() {
    this.auth.appUser$.pipe(take(1)).subscribe(u => {
      if (u) {
        this.router.navigate(['/admin/users', u.auth.uid]);
      }
      this.overlayOpen = false;
    });
  }
  toggleMobile() { this.showLinks = !this.showLinks; }

  /* Auto-close menus on navigation change */
  ngOnInit() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.showLinks = false;
      this.overlayOpen = false;
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  logout() {
    this.auth.logout().subscribe(() => this.router.navigate(['/auth/login']));
    this.overlayOpen = false;
  }
}
