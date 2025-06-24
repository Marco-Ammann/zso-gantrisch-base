import { Component, inject, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { AsyncPipe, NgIf, NgClass } from '@angular/common';
import { AuthService } from '@core/auth/services/auth.service';
import { map, take } from 'rxjs/operators';
import { CardShimmerDirective } from '@shared/directives/card-shimmer.directive';

interface AppUser {
  doc: {
    email?: string;
    roles?: string[];
  };
}

@Component({
  selector: 'zso-main-shell',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    RouterLink,
    AsyncPipe, 
    NgIf,
    CardShimmerDirective
  ],
  templateUrl: './main-shell.html',
})
export class MainShell {
  private auth = inject(AuthService);
  private router = inject(Router);

  isProfileOpen = false;
  isMobileMenuOpen = false;
  currentYear = new Date().getFullYear();

  readonly isAdmin$ = this.auth.appUser$.pipe(
    map(user => user?.doc?.roles?.includes('admin') || false)
  );
  
  readonly appUser$ = this.auth.appUser$;
  readonly userInitials$ = this.appUser$.pipe(
    map(user => user?.doc?.email?.charAt(0).toUpperCase() || 'U')
  );
  readonly userEmail$ = this.appUser$.pipe(
    map(user => user?.doc?.email || '')
  );

  @ViewChild('profileDropdown') profileDropdown!: ElementRef;
  
  isLinkActive(url: string): boolean {
    return this.router.url.includes(url);
  }

  @HostListener('document:click', ['$event'])
  onClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const clickedInsideProfile = this.profileDropdown?.nativeElement.contains(target);
    
    if (!clickedInsideProfile) {
      this.isProfileOpen = false;
    }
    
    // Close mobile menu when clicking on a link
    if (target.closest('a') && this.isMobileMenuOpen) {
      this.isMobileMenuOpen = false;
    }
  }

  logout() {
    this.auth.logout().pipe(take(1)).subscribe({
      next: () => {
        this.router.navigate(['/auth/login']);
      },
      error: (err) => {
        console.error('Logout error:', err);
        // Force navigation even if there's an error
        this.router.navigate(['/auth/login']);
      }
    });
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }
}
