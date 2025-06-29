// src/app/features/admin/users/users.page.ts
import { Component, inject, OnDestroy, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, BehaviorSubject } from 'rxjs';

import { UserService } from '@core/services/user.service';
import { LoggerService } from '@core/services/logger.service';
import { AuthService } from '@core/auth/services/auth.service';
import { UserDoc } from '@core/models/user-doc';
import { ZsoButton } from '@shared/ui/zso-button/zso-button';
import { ZsoRoleSelect } from '@shared/ui/zso-role-select/zso-role-select';

@Component({
  selector: 'zso-users-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ZsoButton,
    ZsoRoleSelect
  ],
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss'],
  animations: [
    trigger('itemFade', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('250ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersPage implements OnInit, OnDestroy {
  private readonly userService = inject(UserService);
  private readonly logger = inject(LoggerService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();
  private readonly searchTerm$ = new BehaviorSubject<string>('');

  // State
  allUsers: UserDoc[] = [];
  pendingUsers: UserDoc[] = [];
  approvedUsers: UserDoc[] = [];
  searchQuery = '';
  isLoading = false;
  errorMsg: string | null = null;

  // Current user UID for highlighting
  currentUid: string | null = null;

  ngOnInit(): void {
    this.logger.log('UsersPage', 'Initializing');

    // Get current user UID
    this.authService.appUser$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      this.currentUid = user?.auth.uid || null;
    });

    // Set up search debounce
    this.searchTerm$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.filterUsers();
    });

    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.searchTerm$.complete();
    this.logger.log('UsersPage', 'Component destroyed');
  }

  private loadUsers(): void {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.errorMsg = null;
    
    this.userService.getAll().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (users) => {
        this.allUsers = users;
        this.filterUsers();
        this.isLoading = false;
        this.cdr.markForCheck();
        this.logger.log('UsersPage', `Loaded ${users.length} users`);
      },
      error: (error) => {
        this.logger.error('UsersPage', 'Failed to load users:', error);
        this.errorMsg = 'Fehler beim Laden der Benutzer.';
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private filterUsers(): void {
    let filtered = [...this.allUsers];

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
    }

    // Split into pending and approved
    this.pendingUsers = filtered.filter(u => !u.approved);
    this.approvedUsers = filtered.filter(u => u.approved);

    // Sort by creation date (newest first)
    this.pendingUsers.sort((a, b) => b.createdAt - a.createdAt);
    this.approvedUsers.sort((a, b) => b.createdAt - a.createdAt);
  }

  // Event handlers
  onSearchChange(value: string): void {
    this.searchQuery = value;
    this.searchTerm$.next(value);
  }

  refresh(): void {
    this.logger.log('UsersPage', 'Manual refresh triggered');
    this.loadUsers();
  }

  // User actions
  approve(user: UserDoc): void {
    this.isLoading = true;
    this.userService.approve(user.uid).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.logger.log('UsersPage', `User ${user.firstName} ${user.lastName} approved`);
        this.loadUsers();
      },
      error: (error) => {
        this.logger.error('UsersPage', 'Approve failed:', error);
        this.errorMsg = `Fehler beim Genehmigen von ${user.firstName} ${user.lastName}`;
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  unapprove(user: UserDoc): void {
    this.isLoading = true;
    this.userService.unapprove(user.uid).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.logger.log('UsersPage', `User ${user.firstName} ${user.lastName} unapproved`);
        this.loadUsers();
      },
      error: (error) => {
        this.logger.error('UsersPage', 'Unapprove failed:', error);
        this.errorMsg = `Fehler beim Zurückziehen der Genehmigung von ${user.firstName} ${user.lastName}`;
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  updateRoles(user: UserDoc, roles: string[]): void {
    if (!roles || roles.length === 0) {
      this.errorMsg = 'Mindestens eine Rolle muss ausgewählt werden.';
      return;
    }

    this.userService.setRoles(user.uid, roles).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.logger.log('UsersPage', `Roles updated for ${user.firstName} ${user.lastName}`);
        this.loadUsers();
      },
      error: (error) => {
        this.logger.error('UsersPage', 'Role change failed:', error);
        this.errorMsg = `Fehler beim Ändern der Rolle für ${user.firstName} ${user.lastName}`;
      }
    });
  }

  viewDetails(user: UserDoc): void {
    this.router.navigate(['/admin/users', user.uid]);
  }

  // Utility methods
  isCurrentUser(uid: string): boolean {
    return uid === this.currentUid;
  }

  getUserInitials(user: UserDoc): string {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
  }

  // Computed properties
  get stats() {
    return {
      total: this.allUsers.length,
      pending: this.allUsers.filter(u => !u.approved).length,
      approved: this.allUsers.filter(u => u.approved).length
    };
  }

  get hasResults(): boolean {
    return this.pendingUsers.length > 0 || this.approvedUsers.length > 0;
  }
}