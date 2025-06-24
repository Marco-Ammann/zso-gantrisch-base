import { Component, inject, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { map } from 'rxjs/operators';

import { AuthService } from '@core/auth/services/auth.service';

@Component({
  selector  : 'zso-main-shell',
  standalone: true,
  imports   : [CommonModule, RouterModule],
  templateUrl: './main-shell.html',
  styleUrls : ['./main-shell.scss']
})
export class MainShell {
  private auth   = inject(AuthService);
  private router = inject(Router);

  isProfileOpen   = false;
  isMobileMenuOpen = false;

  isAdmin$ = this.auth.appUser$.pipe(
    map(u => u?.doc.roles?.includes('admin') ?? false)
  );

  userInitials$ = this.auth.appUser$.pipe(
    map(u => u?.doc.email?.charAt(0).toUpperCase() ?? 'U')
  );

  @ViewChild('profileDropdown', { static: true }) profileDropdown!: ElementRef;

  isLinkActive = (path: string) => this.router.url.includes(path);

  @HostListener('document:click', ['$event'])
  closeMenus(ev: MouseEvent) {
    const t = ev.target as HTMLElement;
    if (!this.profileDropdown.nativeElement.contains(t)) this.isProfileOpen = false;
    if (t.closest('a') && this.isMobileMenuOpen) this.isMobileMenuOpen = false;
  }

  toggleMobile() { this.isMobileMenuOpen = !this.isMobileMenuOpen; }
  logout()       { this.auth.logout().subscribe(() => this.router.navigate(['/auth/login'])); }
}
