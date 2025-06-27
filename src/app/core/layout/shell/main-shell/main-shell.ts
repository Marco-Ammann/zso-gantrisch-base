import { Component, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { map, take } from 'rxjs/operators';

import { OverlayModule } from '@angular/cdk/overlay';
import { CdkConnectedOverlay, ConnectedPosition } from '@angular/cdk/overlay';

import { AuthService } from '@core/auth/services/auth.service';

@Component({
  selector   : 'zso-main-shell',
  standalone : true,
  imports    : [CommonModule, RouterModule, OverlayModule],
  templateUrl: './main-shell.html',
  styleUrls  : ['./main-shell.scss']
})
export class MainShell {
  readonly auth   = inject(AuthService);
  appUser$ = this.auth.appUser$;
  private router = inject(Router);

  showLinks = false;
  isAdmin$  = this.auth.appUser$.pipe(map(u => u?.doc.roles?.includes('admin') ?? false));
  initials$ = this.auth.appUser$.pipe(map(u => u?.doc.email?.[0].toUpperCase() ?? 'U'));

  /* ---------- Overlay für Avatar ---------- */
  @ViewChild(CdkConnectedOverlay) overlay?: CdkConnectedOverlay;
  overlayOpen = false;
  positions: ConnectedPosition[] = [
    { originX:'end', originY:'bottom', overlayX:'end', overlayY:'top', offsetY: 8 },
    { originX:'end', originY:'top',    overlayX:'end', overlayY:'bottom', offsetY:-8 }
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
  toggleMobile () { this.showLinks   = !this.showLinks; }
  logout() {
    this.auth.logout().subscribe(()=>this.router.navigate(['/auth/login']));
    this.overlayOpen = false;
  }
}
