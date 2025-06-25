import { Component, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { map } from 'rxjs/operators';

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
  private auth   = inject(AuthService);
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
  toggleMobile () { this.showLinks   = !this.showLinks; }
  logout() {
    this.auth.logout().subscribe(()=>this.router.navigate(['/auth/login']));
    this.overlayOpen = false;
  }
}
