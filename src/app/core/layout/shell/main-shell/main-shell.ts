import { Component, inject, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from '@core/auth/services/auth.service';

@Component({
  selector   : 'zso-main-shell',
  standalone : true,
  imports    : [CommonModule, RouterModule],
  templateUrl: './main-shell.html',
  styleUrls  : ['./main-shell.scss']
})
export class MainShell {
  private auth   = inject(AuthService);
  private router = inject(Router);

  showLinks   = false;
  showProfile = false;

  isAdmin$   = this.auth.appUser$.pipe(map(u => u?.doc.roles?.includes('admin') ?? false));
  initials$  = this.auth.appUser$.pipe(map(u => u?.doc.email?.[0].toUpperCase() ?? 'U'));

  @ViewChild('profileDrop', { static: true }) profileDrop!: ElementRef;

  @HostListener('document:click', ['$event'])
  closeOnOutside(e: MouseEvent) {
    const tgt = e.target as HTMLElement;
    if (!this.profileDrop.nativeElement.contains(tgt)) this.showProfile = false;
  }

  toggleMobile() { this.showLinks = !this.showLinks; }
  logout()       { this.auth.logout().subscribe(() => this.router.navigate(['/auth/login'])); }
}
