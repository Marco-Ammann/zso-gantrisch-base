// src/app/features/admin/users/users.page.ts
import { Component, inject, ViewChild, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { BehaviorSubject, of, combineLatest, Subject } from 'rxjs';
import { map, switchMap, shareReplay, startWith, debounceTime, distinctUntilChanged, tap, catchError } from 'rxjs/operators';

import { UserService } from '@core/services/user.service';
import { SubscriptionService } from '@core/services/subscription.service';
import { StateManagementService } from '@core/services/state-management.service';
import { LoggerService } from '@core/services/logger.service';
import { UserDoc } from '@core/models/user-doc';
import { ZsoButton } from '@shared/ui/zso-button/zso-button';
import { ZsoInputField } from '@shared/ui/zso-input-field/zso-input-field';
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
    AsyncPipe,
    ZsoButton,
    ZsoInputField,
    ZsoCheckbox,
    ZsoRoleSelect,
    ConfirmationDialogComponent,
  ],
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss'],
})
export class UsersPage implements OnInit, OnDestroy {
  private readonly COMPONENT_NAME = 'UsersPage';
  
  // Service Injection
  private readonly userService = inject(UserService);
  private readonly subscriptionService = inject(SubscriptionService);
  readonly stateService = inject(StateManagementService); // public für Template
  private readonly logger = inject(LoggerService);
  private readonly router = inject(Router);

  // State Keys
  private readonly STATE_KEYS = {
    LOAD_USERS: 'users_load',
    APPROVE_USER: 'users_approve',
    BLOCK_USER: 'users_block',
    SET_ROLES: 'users_roles',
    BULK_OPERATIONS: 'users_bulk'
  } as const;

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

  // UI State Selectors
  readonly search$ = this.pageState$.pipe(map(state => state.search), distinctUntilChanged());
  readonly sortBy$ = this.pageState$.pipe(map(state => state.sortBy), distinctUntilChanged());
  readonly selectedUsers$ = this.pageState$.pipe(map(state => state.selectedUsers));
  readonly pendingRoles$ = this.pageState$.pipe(map(state => state.pendingRoles));

  /* ----------------------------- Data Streams */
  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  // Enhanced data loading with automatic state management
  private readonly usersSubscription = this.subscriptionService.subscribe(
    this.refresh$.pipe(
      tap(() => this.logger.log(this.COMPONENT_NAME, 'Loading users...')),
      switchMap(() => this.userService.getAll().pipe(
        map(realUsers => [
          ...realUsers,
          ...this.dummyUsers.filter(d => !realUsers.some(u => u.uid === d.uid))
        ]),
        catchError(error => {
          this.logger.error(this.COMPONENT_NAME, 'Failed to load users:', error);
          return of(this.dummyUsers); // Fallback to dummy data
        })
      ))
    ),
    {
      debugName: 'loadUsers',
      component: this.COMPONENT_NAME,
      retryAttempts: 3,
      retryDelay: 2000,
      manageLoading: true,
      manageError: true
    }
  );

  readonly allUsers$ = this.usersSubscription.data$;
  readonly usersState$ = this.usersSubscription.state$;

  // Enhanced filtered users with performance optimization
  readonly users$ = combineLatest([
    this.allUsers$,
    this.search$.pipe(debounceTime(300), distinctUntilChanged(), startWith('')),
    this.sortBy$.pipe(startWith('newest' as const))
  ]).pipe(
    map(([users, searchTerm, sortBy]) => this.processUsers(users, searchTerm, sortBy)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  // Statistics with caching
  readonly stats$ = this.allUsers$.pipe(
    map(users => ({
      total: users.length,
      pending: users.filter(u => !u.approved).length,
      blocked: users.filter(u => u.blocked).length,
      active: users.filter(u => u.approved && !u.blocked).length,
      realUsers: users.filter(u => !u.firstName.startsWith('(d)')).length,
      demoUsers: users.filter(u => u.firstName.startsWith('(d)')).length
    })),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  // Loading and Error States from StateManagementService
  readonly isLoading$ = this.stateService.isAnyLoading$;
  readonly globalError$ = this.stateService.globalError$;
  readonly usersLoading$ = this.stateService.isLoading$(this.STATE_KEYS.LOAD_USERS);

  /* ----------------------------- UI Properties */
  get search(): string { return this.pageState$.value.search; }
  set search(value: string) { this.updateState({ search: value }); }

  get sortBy() { return this.pageState$.value.sortBy; }
  set sortBy(value: 'newest' | 'oldest' | 'name' | 'blocked') { this.updateState({ sortBy: value }); }

  get showOnlyBlocked() { return this.pageState$.value.showOnlyBlocked; }
  set showOnlyBlocked(value: boolean) { this.updateState({ showOnlyBlocked: value }); }

  get pendingRole() { return this.pageState$.value.pendingRoles; }

  @ViewChild(ConfirmationDialogComponent) confirmation!: ConfirmationDialogComponent;

  /* ----------------------------- Template Hilfsmethoden */
  
  /**
   * Prüft ob alle Benutzer einer Liste ausgewählt sind
   * WICHTIG: Diese Methode ist für das Template - keine Arrow Functions!
   */
  areAllUsersSelected(users: UserDoc[]): boolean {
    if (!users || users.length === 0) return false;
    const selectedUsers = this.pageState$.value.selectedUsers;
    return users.every(u => selectedUsers.has(u.uid));
  }

  /**
   * Prüft ob ein Benutzer ausgewählt ist
   */
  isUserSelected(uid: string): boolean {
    return this.pageState$.value.selectedUsers.has(uid);
  }

  /**
   * Bereinigt Demo-Präfix aus Namen
   */
  getCleanFirstName(firstName: string): string {
    return firstName.replace('(d) ', '');
  }

  /**
   * Prüft ob Name mit Demo-Präfix beginnt
   */
  isDemoUser(firstName: string): boolean {
    return firstName.startsWith('(d)');
  }

  /**
   * Holt Rollen für Benutzer (pending oder aktuelle)
   */
  getUserRoles(user: UserDoc): string[] {
    return this.pageState$.value.pendingRoles[user.uid] || user.roles;
  }

  /**
   * Prüft ob Datum geändert wurde
   */
  wasUserUpdated(user: UserDoc): boolean {
    return user.updatedAt !== user.createdAt;
  }

  /**
   * Sichere boolean conversion für loading states
   */
  getLoadingState(loading: boolean | null): boolean {
    return loading ?? false;
  }

  /* ----------------------------- Lifecycle */
  ngOnInit(): void {
    this.logger.log(this.COMPONENT_NAME, 'Component initialized');
    // Initial load wird automatisch durch refresh$ triggered
  }

  ngOnDestroy(): void {
    this.subscriptionService.destroyComponent(this.COMPONENT_NAME);
    this.stateService.resetState(); // Optional: Reset global state
    this.pageState$.complete();
    this.refresh$.complete();
    this.logger.log(this.COMPONENT_NAME, 'Component destroyed');
  }

  /* ----------------------------- Data Processing */
  private processUsers(users: UserDoc[], searchTerm: string, sortBy: string) {
    let filtered = [...users];

    // Search filter
    if (searchTerm.trim()) {
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
    switch (sortBy) {
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

    return {
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
    this.refresh$.next();
  }

  /* ----------------------------- User Actions */
  approve(user: UserDoc): void {
    this.executeUserAction(
      () => this.userService.approve(user.uid),
      `Benutzer ${user.firstName} ${user.lastName} genehmigen`,
      this.STATE_KEYS.APPROVE_USER
    );
  }

  toggleActive(user: UserDoc): void {
    const action = user.blocked ? 'entsperren' : 'blockieren';
    const message = `Benutzer ${user.firstName} ${user.lastName} ${action}?`;
    const type = user.blocked ? 'primary' : 'danger';

    this.showConfirmation(message, type, () => {
      this.executeUserAction(
        () => this.userService.block(user.uid, !user.blocked),
        `Benutzer ${action}`,
        this.STATE_KEYS.BLOCK_USER
      );
    });
  }

  askRoleChange(user: UserDoc, roles: string[]): void {
    if (!roles || roles.length === 0) {
      this.stateService.setError('roles', 'Mindestens eine Rolle muss ausgewählt werden.');
      return;
    }

    this.updateState({
      pendingRoles: { ...this.pageState$.value.pendingRoles, [user.uid]: roles }
    });

    const message = `Rolle von „${user.roles[0]}" auf „${roles[0]}" ändern?`;
    this.showConfirmation(message, 'primary', () => {
      this.executeUserAction(
        () => this.userService.setRoles(user.uid, roles),
        `Rolle für ${user.firstName} ${user.lastName} ändern`,
        this.STATE_KEYS.SET_ROLES,
        () => {
          // Cleanup pending role after success
          const updated = { ...this.pageState$.value.pendingRoles };
          delete updated[user.uid];
          this.updateState({ pendingRoles: updated });
        }
      );
    });
  }

  details(user: UserDoc): void {
    this.logger.log(this.COMPONENT_NAME, 'Navigate to user details:', user.uid);
    this.router.navigate(['/admin/users', user.uid, 'edit']);
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

  private executeUserAction(
    action: () => any,
    description: string,
    stateKey: string,
    onSuccess?: () => void
  ): void {
    this.stateService.startOperation(stateKey);

    this.subscriptionService.simpleSubscribe(
      action(),
      () => {
        this.stateService.completeOperation(stateKey);
        this.logger.log(this.COMPONENT_NAME, `Success: ${description}`);
        this.refresh$.next();
        onSuccess?.();
      },
      (error) => {
        this.stateService.completeOperation(stateKey, `Fehler bei ${description}: ${error.message}`);
      },
      this.COMPONENT_NAME
    );
  }

  private executeBulkAction(userIds: string[], action: 'approve' | 'block'): void {
    this.stateService.startOperation(this.STATE_KEYS.BULK_OPERATIONS);

    const operations = userIds.map(uid => 
      action === 'approve' ? this.userService.approve(uid) : this.userService.block(uid, true)
    );

    // Batch subscribe for parallel execution
    const { unsubscribeAll } = this.subscriptionService.batchSubscribe(
      operations.map((op, index) => ({ 
        name: `${action}_${userIds[index]}`, 
        observable$: op 
      })),
      this.COMPONENT_NAME
    );

    // Simple completion tracking (you could enhance this)
    setTimeout(() => {
      this.stateService.completeOperation(this.STATE_KEYS.BULK_OPERATIONS);
      this.updateState({ selectedUsers: new Set() });
      this.refresh$.next();
      unsubscribeAll();
    }, 2000);
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

    const unsubscribe = this.subscriptionService.simpleSubscribe(
      this.confirmation.confirmed,
      (confirmed) => {
        if (confirmed) onConfirm();
        unsubscribe();
      },
      undefined,
      this.COMPONENT_NAME
    );
  }

  /* ----------------------------- Debug Methods */
  logState(): void {
    this.logger.log(this.COMPONENT_NAME, 'Page State:', this.pageState$.value);
    this.stateService.logCurrentState();
    this.logger.log(this.COMPONENT_NAME, 'Subscription Metrics:', this.subscriptionService.getMetrics());
  }
}