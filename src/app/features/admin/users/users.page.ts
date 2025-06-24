import { Component, ChangeDetectionStrategy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable, of, BehaviorSubject, combineLatest } from 'rxjs';
import { catchError, finalize, map, switchMap, tap, startWith } from 'rxjs/operators';

import { UserDoc } from '@core/models/user-doc';
import { UserService } from '@core/services/user.service';
import { LoggerService } from '@core/services/logger.service';
import { ZsoRoleSelect } from '@shared/ui/zso-role-select/zso-role-select';
import { ZsoButton } from '@shared/ui/zso-button/zso-button';
import { ZsoCheckbox } from '@shared/ui/zso-checkbox/zso-checkbox';

type UserWithUid = UserDoc & {
  displayName?: string;
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
    AsyncPipe
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
  


  constructor(
    private userService: UserService,
    private logger: LoggerService,
    private cdr: ChangeDetectorRef
  ) {}
  
  refreshUsers(): void {
    this.refreshUsers$.next();
  }

  private initObservables() {
    this.users$ = this.refreshUsers$.pipe(
      tap(() => {
        this.isLoading = true;
        this.error = null;
        this.cdr.markForCheck();
      }),
      switchMap(() => this.userService.getAll()),
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
      catchError(error => {
        this.isLoading = false;
        this.error = 'Benutzer konnten nicht geladen werden';
        this.logger.error('Error loading users', error);
        this.cdr.markForCheck();
        return of([]);
      })
    );

    this.filteredUsers$ = combineLatest([
      this.users$,
      this.showPending$.pipe(startWith(false))
    ]).pipe(
      map(([users, showPending]) => {
        if (showPending) {
          return users.filter(user => !user.approved);
        }
        return users;
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

  approve(user: UserWithUid) {
    this.isLoading = true;
    this.userService.approve(user.uid).subscribe({
      next: () => {
        this.logger.log(`Approved user ${user.uid}`);
        this.refreshUsers();
      },
      error: (error) => {
        this.logger.error('Error approving user', error);
        this.error = 'Fehler beim Freischalten des Benutzers';
        this.cdr.markForCheck();
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  toggleBlock(user: UserWithUid) {
    this.isLoading = true;
    this.userService.block(user.uid, !user.blocked).subscribe({
      next: () => {
        this.logger.log(`Toggled block status for user ${user.uid}`);
        this.refreshUsers();
      },
      error: (error) => {
        this.logger.error('Error toggling block status', error);
        this.error = 'Fehler beim Ändern des Status';
        this.cdr.markForCheck();
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  onRolesChange(user: UserWithUid, roles: string[]) {
    this.userService.setRoles(user.uid, roles).subscribe({
      next: () => {
        this.logger.log(`Updated roles for user ${user.uid} to`, roles);
        this.refreshUsers();
      },
      error: (error) => {
        this.logger.error('Error updating roles', error);
        this.error = 'Rollen konnten nicht aktualisiert werden';
        this.cdr.markForCheck();
      }
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

  getStatusText(user: UserWithUid): string {
    if (user.blocked) return 'Gesperrt';
    if (!user.approved) return 'Ausstehend';
    return 'Aktiv';
  }

  trackByUserId(index: number, user: UserWithUid): string {
    return user.uid;
  }
}