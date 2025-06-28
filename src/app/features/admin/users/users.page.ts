// src/app/features/admin/users/users.page.ts
import { Component, inject, ViewChild, OnDestroy, OnInit } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { BehaviorSubject, Subject, takeUntil, take, map, startWith, debounceTime, distinctUntilChanged } from 'rxjs';

import { UserService } from '@core/services/user.service';
import { LoggerService } from '@core/services/logger.service';
import { AuthService } from '@core/auth/services/auth.service';
import { UserDoc } from '@core/models/user-doc';
import { ZsoButton } from '@shared/ui/zso-button/zso-button';
import { ZsoCheckbox } from '@shared/ui/zso-checkbox/zso-checkbox';
import { ZsoRoleSelect } from '@shared/ui/zso-role-select/zso-role-select';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog';

interface UsersPageState {
  search: string;
  sortBy: 'newest' | 'oldest' | 'name' | 'blocked';
  showOnlyBlocked: boolean;
  selectedUsers: Set<string>;
  pendingRoles: Record<string, string[]>;
}

@Component({
  selector: 'zso-users-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,

    ZsoButton,
    ZsoCheckbox,
    ZsoRoleSelect,
    ConfirmationDialogComponent,
  ],
  templateUrl: './users.page.html',
  animations: [
    trigger('itemFade', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('250ms cubic-bezier(0.22,1,0.36,1)', style({ opacity: 1, transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'scale(0.95)' }))
      ])
    ]),
    // Slide in from bottom for bulk actions bar
    trigger('slideBottom', [
      transition(':enter', [
        style({ transform: 'translateY(100%)', opacity: 0 }),
        animate('300ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('250ms ease-in', style({ transform: 'translateY(100%)', opacity: 0 }))
      ])
    ]),

  ],
  styleUrls: ['./users.page.scss'],
})
export class UsersPage implements OnInit, OnDestroy {
  private readonly COMPONENT_NAME = 'UsersPage';
  
  // Services
  private readonly userService = inject(UserService);
  private readonly logger = inject(LoggerService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  // Currently logged-in user UID (used for highlighting own card)
  currentUid: string | null = null;

  // Cleanup
  private readonly destroy$ = new Subject<void>();

  /* ----------------------------- Demo Data */
  public readonly dummyUsers: UserDoc[] = [
    {
      uid: '1', email: 'alpha@example.com', firstName: '(d) Alice', lastName: 'Altenburg',
      roles: ['user'], approved: true, blocked: false, createdAt: 1702406400000, updatedAt: 1702406400000,
    },
    {
      uid: '2', email: 'bravo@example.com', firstName: '(d) Bob', lastName: 'Bergmann',
      roles: ['admin'], approved: true, blocked: false, createdAt: 1703119200000, updatedAt: 1705701200000,
    },
    {
      uid: '3', email: 'carla@example.com', firstName: '(d) Carla', lastName: 'Carlsen',
      roles: ['user'], approved: false, blocked: false, createdAt: 1706488800000, updatedAt: 1706488800000,
    },
    {
      uid: '4', email: 'david@example.com', firstName: '(d) David', lastName: 'Döbeli',
      roles: ['user'], approved: true, blocked: true, createdAt: 1704328800000, updatedAt: 1704415200000,
    },
    {
      uid: '5', email: 'emma@example.com', firstName: '(d) Emma', lastName: 'Egli',
      roles: ['user'], approved: true, blocked: false, createdAt: 1705279200000, updatedAt: 1705279200000,
    },
    {
      uid: '6', email: 'felix@example.com', firstName: '(d) Felix', lastName: 'Felder',
      roles: ['user'], approved: false, blocked: false, createdAt: 1706049600000, updatedAt: 1706049600000,
    }
  ];

  /* ----------------------------- Component State */
  private readonly pageState$ = new BehaviorSubject<UsersPageState>({
    search: '',
    sortBy: 'newest',
    showOnlyBlocked: false,
    selectedUsers: new Set(),
    pendingRoles: {}
  });

  // Simple State Properties
  allUsers: UserDoc[] = [];
  filteredUsers: { pending: UserDoc[], rest: UserDoc[], all: UserDoc[] } = {
    pending: [],
    rest: [],
    all: []
  };
  isLoading = false;
  errorMsg: string | null = null;

  // Search and Filter
  private readonly searchTerm$ = new BehaviorSubject<string>('');

  /* ----------------------------- UI Properties */
  get search(): string { return this.pageState$.value.search; }
  set search(value: string) { 
    this.updateState({ search: value });
    this.searchTerm$.next(value);
  }

  get sortBy() { return this.pageState$.value.sortBy; }
  set sortBy(value: 'newest' | 'oldest' | 'name' | 'blocked') { 
    this.updateState({ sortBy: value });
    this.applyFiltersAndSort();
  }

  get showOnlyBlocked() { return this.pageState$.value.showOnlyBlocked; }
  set showOnlyBlocked(value: boolean) { 
    this.updateState({ showOnlyBlocked: value });
    this.applyFiltersAndSort();
  }

  @ViewChild(ConfirmationDialogComponent) confirmation!: ConfirmationDialogComponent;

  /* ----------------------------- Template Helper Methods */
  
  areAllUsersSelected(users: UserDoc[]): boolean {
    if (!users || users.length === 0) return false;
    const selectedUsers = this.pageState$.value.selectedUsers;
    return users.every(u => selectedUsers.has(u.uid));
  }

  isUserSelected(uid: string): boolean {
    return this.pageState$.value.selectedUsers.has(uid);
  }

  getCleanFirstName(firstName: string): string {
    return firstName.replace('(d) ', '');
  }

  isDemoUser(firstName: string): boolean {
    return firstName.startsWith('(d)');
  }

  getUserRoles(user: UserDoc): string[] {
    return this.pageState$.value.pendingRoles[user.uid] || user.roles;
  }

  wasUserUpdated(user: UserDoc): boolean {
    return user.updatedAt !== user.createdAt;
  }

  /* ----------------------------- Lifecycle */
  ngOnInit(): void {
    this.logger.log(this.COMPONENT_NAME, 'Component initialized');
    
    // Setup search with debounce
    this.searchTerm$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.applyFiltersAndSort();
    });

    // Load initial data
    this.loadUsers();

    // Fetch current user UID once
    this.authService.appUser$.pipe(take(1)).subscribe(u => this.currentUid = u?.auth.uid ?? null);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.pageState$.complete();
    this.searchTerm$.complete();
    this.logger.log(this.COMPONENT_NAME, 'Component destroyed');
  }

  /* ----------------------------- Data Loading */
  private loadUsers(): void {
    this.isLoading = true;
    this.errorMsg = null;

    this.userService.getAll().pipe(
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (realUsers) => {
        // Merge real users with dummy data
        this.allUsers = [
          ...realUsers,
          ...this.dummyUsers.filter(d => !realUsers.some(u => u.uid === d.uid))
        ];
        this.applyFiltersAndSort();
        this.isLoading = false;
        this.logger.log(this.COMPONENT_NAME, 'Users loaded successfully', this.allUsers.length);
      },
      error: (error) => {
        this.logger.error(this.COMPONENT_NAME, 'Failed to load users:', error);
        this.allUsers = [...this.dummyUsers]; // Fallback to dummy data
        this.applyFiltersAndSort();
        this.errorMsg = 'Fehler beim Laden der Benutzer';
        this.isLoading = false;
      }
    });
  }

  /* ----------------------------- Data Processing */
  private applyFiltersAndSort(): void {
    let filtered = [...this.allUsers];

    // Search filter
    const searchTerm = this.pageState$.value.search.trim();
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(u =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
      );
    }

    // Block filter
    if (this.showOnlyBlocked) {
      filtered = filtered.filter(u => u.blocked);
    }

    // Sorting
    switch (this.sortBy) {
      case 'name':
        filtered.sort((a, b) => (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName, 'de'));
        break;
      case 'oldest':
        filtered.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case 'blocked':
        filtered.sort((a, b) => (a.blocked ? -1 : 1) - (b.blocked ? -1 : 1));
        break;
      default: // newest
        filtered.sort((a, b) => b.createdAt - a.createdAt);
    }

    this.filteredUsers = {
      pending: filtered.filter(u => !u.approved),
      rest: filtered.filter(u => u.approved),
      all: filtered
    };
  }

  /* ----------------------------- Event Handlers */
  onSearchChange(value: string): void {
    this.search = value;
  }

  onSortChange(value: 'newest' | 'oldest' | 'name' | 'blocked'): void {
    this.sortBy = value;
    this.logger.log(this.COMPONENT_NAME, 'Sort changed:', value);
  }

  refresh(): void {
    this.logger.log(this.COMPONENT_NAME, 'Manual refresh triggered');
    this.loadUsers();
  }

  /** Entfernt Genehmigung für einen Benutzer */
  unapprove(user: UserDoc): void {
    this.isLoading = true;
    this.userService.unapprove(user.uid).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.logger.log(this.COMPONENT_NAME, `User ${user.firstName} ${user.lastName} unapproved`);
        this.loadUsers();
      },
      error: (error) => {
        this.logger.error(this.COMPONENT_NAME, 'Unapprove failed:', error);
        this.errorMsg = `Fehler beim Zurückziehen der Genehmigung von ${user.firstName} ${user.lastName}`;
        this.isLoading = false;
      }
    });
  }

  /* ----------------------------- User Actions */
  approve(user: UserDoc): void {
    this.isLoading = true;
    this.userService.approve(user.uid).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.logger.log(this.COMPONENT_NAME, `User ${user.firstName} ${user.lastName} approved`);
        this.loadUsers(); // Reload data
      },
      error: (error) => {
        this.logger.error(this.COMPONENT_NAME, 'Approve failed:', error);
        this.errorMsg = `Fehler beim Genehmigen von ${user.firstName} ${user.lastName}`;
        this.isLoading = false;
      }
    });
  }

  toggleActive(user: UserDoc): void {
    const action = user.blocked ? 'entsperren' : 'blockieren';
    const message = `Benutzer ${user.firstName} ${user.lastName} ${action}?`;
    const type = user.blocked ? 'primary' : 'danger';

    this.showConfirmation(message, type, () => {
      this.isLoading = true;
      this.userService.block(user.uid, !user.blocked).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          this.logger.log(this.COMPONENT_NAME, `User ${user.firstName} ${user.lastName} ${action}ed`);
          this.loadUsers(); // Reload data
        },
        error: (error) => {
          this.logger.error(this.COMPONENT_NAME, 'Toggle active failed:', error);
          this.errorMsg = `Fehler beim ${action} von ${user.firstName} ${user.lastName}`;
          this.isLoading = false;
        }
      });
    });
  }

  askRoleChange(user: UserDoc, roles: string[]): void {
    if (!roles || roles.length === 0) {
      this.errorMsg = 'Mindestens eine Rolle muss ausgewählt werden.';
      return;
    }

    this.updateState({
      pendingRoles: { ...this.pageState$.value.pendingRoles, [user.uid]: roles }
    });

    const message = `Rolle von „${user.roles[0]}" auf „${roles[0]}" ändern?`;
    this.showConfirmation(message, 'primary', () => {
      this.isLoading = true;
      this.userService.setRoles(user.uid, roles).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          this.logger.log(this.COMPONENT_NAME, `Roles updated for ${user.firstName} ${user.lastName}`);
          // Cleanup pending role after success
          const updated = { ...this.pageState$.value.pendingRoles };
          delete updated[user.uid];
          this.updateState({ pendingRoles: updated });
          this.loadUsers(); // Reload data
        },
        error: (error) => {
          this.logger.error(this.COMPONENT_NAME, 'Role change failed:', error);
          this.errorMsg = `Fehler beim Ändern der Rolle für ${user.firstName} ${user.lastName}`;
          this.isLoading = false;
        }
      });
    });
  }

  details(user: UserDoc): void {
    this.logger.log(this.COMPONENT_NAME, 'Navigate to user details:', user.uid);
    this.router.navigate(['/admin/users', user.uid]);
  }

  /* ----------------------------- Bulk Operations */
  selectUser(uid: string, selected: boolean): void {
    const selectedUsers = new Set(this.pageState$.value.selectedUsers);
    if (selected) {
      selectedUsers.add(uid);
    } else {
      selectedUsers.delete(uid);
    }
    this.updateState({ selectedUsers });
  }

  /* ----------------------------- Utility */
  isCurrentUser(uid: string): boolean {
    return uid === this.currentUid;
  }

  selectAll(users: UserDoc[], selected: boolean): void {
    const selectedUsers = selected ? new Set(users.map(u => u.uid)) : new Set<string>();
    this.updateState({ selectedUsers });
  }

  bulkApprove(): void {
    const selectedIds = Array.from(this.pageState$.value.selectedUsers);
    if (selectedIds.length === 0) return;

    this.showConfirmation(`${selectedIds.length} Benutzer genehmigen?`, 'primary', () => {
      this.executeBulkAction(selectedIds, 'approve');
    });
  }

  bulkBlock(): void {
    const selectedIds = Array.from(this.pageState$.value.selectedUsers);
    if (selectedIds.length === 0) return;

    this.showConfirmation(`${selectedIds.length} Benutzer blockieren?`, 'danger', () => {
      this.executeBulkAction(selectedIds, 'block');
    });
  }

  /* ----------------------------- Helper Methods */
  private updateState(partial: Partial<UsersPageState>): void {
    this.pageState$.next({ ...this.pageState$.value, ...partial });
  }

  private executeBulkAction(userIds: string[], action: 'approve' | 'block'): void {
    this.isLoading = true;
    this.logger.log(this.COMPONENT_NAME, `Bulk ${action}ing ${userIds.length} users`);

    // Simple approach: execute actions sequentially
    // In production, you might want to do this in parallel or use a batch API
    let completedActions = 0;
    const totalActions = userIds.length;

    userIds.forEach(uid => {
      const operation = action === 'approve' 
        ? this.userService.approve(uid) 
        : this.userService.block(uid, true);

      operation.pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          completedActions++;
          if (completedActions === totalActions) {
            this.logger.log(this.COMPONENT_NAME, `Bulk ${action} completed`);
            this.updateState({ selectedUsers: new Set() });
            this.loadUsers(); // Reload data
          }
        },
        error: (error) => {
          this.logger.error(this.COMPONENT_NAME, `Bulk ${action} failed for user ${uid}:`, error);
          this.errorMsg = `Fehler bei Bulk-Aktion für einige Benutzer`;
          this.isLoading = false;
        }
      });
    });
  }

  private showConfirmation(
    message: string,
    type: 'primary' | 'danger',
    onConfirm: () => void
  ): void {
    this.confirmation.title = 'Bitte bestätigen';
    this.confirmation.message = message;
    this.confirmation.confirmText = 'Bestätigen';
    this.confirmation.confirmType = type;
    this.confirmation.visible = true;

    this.confirmation.confirmed.pipe(
      takeUntil(this.destroy$)
    ).subscribe((confirmed) => {
      if (confirmed) onConfirm();
    });
  }

  /* ----------------------------- Computed Properties for Template */
  get stats() {
    return {
      total: this.allUsers.length,
      pending: this.allUsers.filter(u => !u.approved).length,
      blocked: this.allUsers.filter(u => u.blocked).length,
      active: this.allUsers.filter(u => u.approved && !u.blocked).length,
      realUsers: this.allUsers.filter(u => !u.firstName.startsWith('(d)')).length,
      demoUsers: this.allUsers.filter(u => u.firstName.startsWith('(d)')).length
    };
  }

  get selectedUsersCount(): number {
    return this.pageState$.value.selectedUsers.size;
  }
}