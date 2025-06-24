import { Component, ChangeDetectionStrategy, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule, AsyncPipe, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable, of, BehaviorSubject, combineLatest } from 'rxjs';
import { catchError, finalize, map, switchMap, tap, startWith } from 'rxjs/operators';

import { UserDoc, User } from '@core/models/user-doc';
import { UserService } from '@core/services/user.service';
import { LoggerService } from '@core/services/logger.service';
import { ZsoRoleSelect } from '@shared/ui/zso-role-select/zso-role-select';
import { ZsoButton } from '@shared/ui/zso-button/zso-button';
import { ZsoCheckbox } from '@shared/ui/zso-checkbox/zso-checkbox';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog';
import { CardShimmerDirective } from '@shared/directives/card-shimmer.directive';

type UserWithUid = UserDoc & {
  displayName?: string;
  emailVerified?: boolean;
  createdAt?: number;
  lastSignInTime?: number;
};

@Component({
  selector: 'zso-admin-users',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ZsoRoleSelect,
    ZsoButton,
    ZsoCheckbox,
    ConfirmationDialogComponent,
    AsyncPipe,
    
  ],
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersPage implements OnInit {
  showPending = false;
  isLoading = false;
  private refreshUsers$ = new BehaviorSubject<void>(undefined);
  private showPending$ = new BehaviorSubject<boolean>(false);
  
  users$: Observable<UserWithUid[]> = of([]);
  filteredUsers$: Observable<UserWithUid[]> = of([]);
  error: string | null = null;
  roleOptions = ['user', 'admin'];
  private actionInProgress = new Set<string>();
  
  // Confirmation dialog state
  showConfirmDialog = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmButtonText = 'Bestätigen';
  confirmButtonType: 'primary' | 'danger' | 'neutral' = 'primary';
  confirmAction: 'approve' | 'unapprove' | 'block' | 'unblock' | 'resetPassword' | null = null;
  selectedUser: UserWithUid | null = null;
  
  /**
   * Get user initials for avatar
   */
  getInitials(user: UserWithUid): string {
    if (!user) return '??';
    
    const name = user.displayName || user.email?.split('@')[0] || '';
    return name
      .split(' ')
      .map(part => part[0]?.toUpperCase() || '')
      .join('')
      .substring(0, 2);
  }

  /**
   * Check if an action is in progress for a specific user
   */
  isActionInProgress(uid: string): boolean {
    return this.actionInProgress.has(uid);
  }

  private setActionInProgress(uid: string, inProgress: boolean): void {
    if (inProgress) {
      this.actionInProgress.add(uid);
    } else {
      this.actionInProgress.delete(uid);
    }
    this.cdr.markForCheck();
  }

  /**
   * Format timestamp to a readable string in German/Swiss format
   * @param timestamp Can be a Firebase Timestamp, number (milliseconds), or ISO string
   * @returns Formatted date string or 'N/A' if invalid
   */
  formatDate(timestamp: { seconds?: number; nanoseconds?: number } | number | string | null | undefined): string {
    if (!timestamp) return 'N/A';
    
    let date: Date | null = null;
    
    // Handle Firebase Timestamp
    if (typeof timestamp === 'object' && timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } 
    // Handle number (milliseconds)
    else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    }
    // Handle string
    else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    }
    
    // If we couldn't parse the date, return 'N/A'
    if (!date || isNaN(date.getTime())) {
      return 'N/A';
    }
    
    // Return formatted date string in Swiss format (DD.MM.YYYY, HH:MM)
    return date.toLocaleString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }


  constructor(
    private userService: UserService,
    private logger: LoggerService,
    private cdr: ChangeDetectorRef
  ) {}
  
  refreshUsers(force = false): void {
    // Always set loading to true when refreshing
    this.isLoading = true;
    this.error = null;
    this.cdr.markForCheck();
    
    // Emit a new value to trigger the refresh
    this.refreshUsers$.next(undefined);
  }

  private initObservables() {
    // Initialize the users$ observable with proper error handling
    this.users$ = this.refreshUsers$.pipe(
      // Start with an initial load
      startWith(undefined),
      // Use switchMap to cancel any in-flight requests
      switchMap(() => {
        return this.userService.getAll().pipe(
          // Handle successful response
          tap({
            next: (users) => {
              this.isLoading = false;
              this.error = null;
              this.cdr.markForCheck();
            },
            error: (error) => {
              this.isLoading = false;
              this.error = 'Benutzer konnten nicht geladen werden';
              this.logger.error('Error loading users', error);
              this.cdr.markForCheck();
            }
          }),
          // Handle errors and ensure the stream continues
          catchError(error => {
            this.isLoading = false;
            this.error = 'Benutzer konnten nicht geladen werden';
            this.logger.error('Error loading users', error);
            this.cdr.markForCheck();
            return of([]);
          })
        );
      })
    );

    // Create a filtered version of the users$ observable
    this.filteredUsers$ = combineLatest([
      this.users$,
      this.showPending$.pipe(startWith(false))
    ]).pipe(
      map(([users, showPending]) => {
        if (showPending) {
          return users.filter(user => !user.approved);
        }
        return users;
      }),
      // Ensure we don't show stale data when toggling filters
      tap(() => {
        this.isLoading = false;
        this.cdr.markForCheck();
      })
    );
  }

  ngOnInit() {
    this.initObservables();
    
    // Add this for debugging
    this.filteredUsers$.subscribe(users => {
      console.log('filteredUsers$ emitted:', users);
    });
  }

  // Show confirmation dialog for an action
  confirmActionDialog(user: UserWithUid, action: 'approve' | 'unapprove' | 'block' | 'unblock' | 'resetPassword') {
    this.selectedUser = user;
    this.confirmAction = action;
    
    switch (action) {
      case 'approve':
        this.confirmTitle = 'Benutzer freischalten';
        this.confirmMessage = `Sind Sie sicher, dass Sie den Benutzer ${user.displayName || user.email} freischalten möchten?`;
        this.confirmButtonText = 'Freischalten';
        this.confirmButtonType = 'primary';
        break;
      case 'unapprove':
        this.confirmTitle = 'Benutzer ablehnen';
        this.confirmMessage = `Sind Sie sicher, dass Sie den Benutzer ${user.displayName || user.email} ablehnen möchten?`;
        this.confirmButtonText = 'Ablehnen';
        this.confirmButtonType = 'danger';
        break;
      case 'block':
        this.confirmTitle = 'Benutzer sperren';
        this.confirmMessage = `Sind Sie sicher, dass Sie den Benutzer ${user.displayName || user.email} sperren möchten?`;
        this.confirmButtonText = 'Sperren';
        this.confirmButtonType = 'danger';
        break;
      case 'unblock':
        this.confirmTitle = 'Benutzer entsperren';
        this.confirmMessage = `Sind Sie sicher, dass Sie den Benutzer ${user.displayName || user.email} entsperren möchten?`;
        this.confirmButtonText = 'Entsperren';
        this.confirmButtonType = 'primary';
        break;
      case 'resetPassword':
        this.confirmTitle = 'Passwort zurücksetzen';
        this.confirmMessage = `Möchten Sie wirklich das Passwort für ${user.displayName || user.email} zurücksetzen? Der Benutzer erhält eine E-Mail mit Anweisungen.`;
        this.confirmButtonText = 'Passwort zurücksetzen';
        this.confirmButtonType = 'primary';
        break;
    }
    
    this.showConfirmDialog = true;
  }
  
  // Handle confirmation dialog result
  onConfirm(confirmed: boolean) {
    this.showConfirmDialog = false;
    
    if (!confirmed || !this.selectedUser || !this.confirmAction) {
      this.selectedUser = null;
      this.confirmAction = null;
      return;
    }
    
    const user = this.selectedUser;
    this.selectedUser = null;
    
    switch (this.confirmAction) {
      case 'approve':
        this.approveUser(user);
        break;
      case 'unapprove':
        this.unapproveUser(user);
        break;
      case 'block':
        this.toggleBlock(user, true);
        break;
      case 'unblock':
        this.toggleBlock(user, false);
        break;
      case 'resetPassword':
        this.resetPassword(user);
        break;
    }
    
    this.confirmAction = null;
  }
  
  // Approve user
  approveUser(user: UserWithUid) {
    this.setActionInProgress(user.uid, true);
    this.userService.approve(user.uid)
      .pipe(
        finalize(() => this.setActionInProgress(user.uid, false)),
        catchError(error => {
          this.error = 'Benutzer konnte nicht genehmigt werden';
          this.logger.error('Error approving user', error);
          return of(null);
        })
      )
      .subscribe(() => {
        this.refreshUsers();
      });
  }

  // Toggle user block status
  toggleBlock(user: UserWithUid, block: boolean) {
    this.setActionInProgress(user.uid, true);
    this.userService.block(user.uid, block)
      .pipe(
        finalize(() => this.setActionInProgress(user.uid, false)),
        catchError(error => {
          this.error = 'Fehler beim Ändern des Status';
          this.logger.error('Error toggling block status', error);
          return of(null);
        })
      )
      .subscribe(() => {
        this.refreshUsers();
      });
  }

  onRolesChange(user: UserWithUid, roles: string[]) {
    this.setActionInProgress(user.uid, true);
    this.userService.setRoles(user.uid, roles)
      .pipe(
        finalize(() => {
          this.setActionInProgress(user.uid, false);
          // Always refresh after role change to ensure UI is in sync
          this.refreshUsers();
        }),
        catchError(error => {
          this.error = 'Rollen konnten nicht aktualisiert werden';
          this.logger.error('Error updating user roles', error);
          // Still refresh even on error to ensure consistency
          this.refreshUsers();
          return of(null);
        })
      )
      .subscribe();
  }

  // Unapprove user
  unapproveUser(user: UserWithUid) {
    this.setActionInProgress(user.uid, true);
    this.userService.unapprove(user.uid)
      .pipe(
        finalize(() => this.setActionInProgress(user.uid, false)),
        catchError(error => {
          this.error = 'Benutzer konnte nicht abgelehnt werden';
          this.logger.error('Error unapproving user', error);
          return of(null);
        })
      )
      .subscribe(() => {
        this.refreshUsers();
      });
  }

  // Reset user password
  resetPassword(user: UserWithUid) {
    this.setActionInProgress(user.uid, true);
    this.userService.resetPassword(user.email)
      .pipe(
        finalize(() => this.setActionInProgress(user.uid, false)),
        catchError(error => {
          this.error = 'Passwort-Reset konnte nicht gesendet werden';
          this.logger.error('Error sending password reset', error);
          return of(null);
        })
      )
      .subscribe(() => {
        // Show success message
        this.logger.log(`Password reset email sent to ${user.email}`);
      });
  }

  onShowPendingChange(show: boolean) {
    this.showPending = show;
    this.showPending$.next(show);
  }

  getStatusBadgeClass(user: UserWithUid): string {
    if (user.blocked) return 'bg-red-500/20 text-red-400';
    if (!user.approved) return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-green-500/20 text-green-400';
  }

  getDisplayName(user: UserWithUid): string {
    return user.displayName || 
           `${user.firstName || ''} ${user.lastName || ''}`.trim() || 
           user.email.split('@')[0] || 
           'Kein Name';
  }

  
  // Get user status text
  getStatusText(user: UserWithUid): string {
    if (user.blocked) return 'Gesperrt';
    if (!user.approved) return 'Ausstehend';
    return 'Aktiv';
  }
  
  // Get user status icon
  getStatusIcon(user: UserWithUid): string {
    if (user.blocked) return '🔒';
    if (!user.approved) return '⏳';
    return '✅';
  }
  
  // Get user role badge class
  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'user':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  trackByUserId(index: number, user: UserWithUid): string {
    return user.uid;
  }
}