// src/app/features/admin/users/user-detail/user-detail.page.ts
import { CommonModule, DatePipe, NgIf, AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OverlayModule, ConnectedPosition } from '@angular/cdk/overlay';
import { getStorage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { ChangeDetectionStrategy, Component, inject, OnDestroy } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';

import { Router } from '@angular/router';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { map, switchMap, takeUntil, take } from 'rxjs';
import { Subject } from 'rxjs';

import { UserService } from '@core/services/user.service';
import { AuthService } from '@core/auth/services/auth.service';
import { UserDoc } from '@core/models/user-doc';
import { ZsoRoleSelect } from '@shared/ui/zso-role-select/zso-role-select';
import { UserEditDialogComponent } from '@shared/components/user-edit-dialog/user-edit-dialog';
import { SwissPhonePipe } from '@shared/pipes/swiss-phone.pipe';
import { LoggerService } from '@core/services/logger.service';

@Component({
  selector: 'zso-user-detail-page',
  standalone: true,
  imports: [
    CommonModule, 
    NgIf, 
    AsyncPipe, 
    RouterModule, 
    DatePipe, 
    OverlayModule, 
    FormsModule, 
    ZsoRoleSelect, 
    UserEditDialogComponent, 
    SwissPhonePipe
  ],
  templateUrl: './user-detail.page.html',
  styleUrls: ['./user-detail.page.scss'],
  animations: [
    trigger('toastSlide', [
      transition(':enter', [
        style({ transform: 'translateY(100%)', opacity: 0 }),
        animate('400ms cubic-bezier(0.22,1,0.36,1)', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('250ms ease-in', style({ transform: 'translateY(100%)', opacity: 0 }))
      ])
    ])
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserDetailPage implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly userService = inject(UserService);
  private readonly logger = inject(LoggerService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly destroy$ = new Subject<void>();

  // UI state
  menuOpen = false;
  dialogVisible = false;
  editUser: UserDoc | null = null;
  uploading = false;
  uploadMsg: string | null = null;
  uploadError = false;
  isLoading = false;

  // Public observable for current user ID
  currentUserId$ = this.authService.user$.pipe(
    map(user => user?.uid || null)
  );

  // Observable emitting true if the current user has the admin role
  currentUserIsAdmin$ = this.authService.provideUserDoc().pipe(
    map(doc => doc?.roles?.includes('admin') ?? false)
  );

  positions: ConnectedPosition[] = [
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -8 }
  ];

  user$ = this.route.paramMap.pipe(
    map(params => params.get('uid')!),
    switchMap(uid =>
      this.userService.getAll().pipe(
        map(users => users.find(u => u.uid === uid) as UserDoc | undefined)
      )
    )
  );

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.logger.log('UserDetailPage', 'Component destroyed');
  }

  // User management actions
  toggleAccess(uid: string, approved: boolean): void {
    this.isLoading = true;
    if (approved) {
      this.userService.approve(uid).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          this.logger.log('UserDetailPage', 'User access granted', uid);
          this.isLoading = false;
        },
        error: (error) => {
          this.logger.error('UserDetailPage', 'Grant access failed:', error);
          this.isLoading = false;
        }
      });
    } else {
      this.userService.unapprove(uid).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          this.logger.log('UserDetailPage', 'User access revoked', uid);
          this.isLoading = false;
        },
        error: (error) => {
          this.logger.error('UserDetailPage', 'Revoke access failed:', error);
          this.isLoading = false;
        }
      });
    }
  }
  approve(uid: string): void {
    this.isLoading = true;
    this.userService.approve(uid).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.logger.log('UserDetailPage', 'User approved', uid);
        this.isLoading = false;
      },
      error: (error) => {
        this.logger.error('UserDetailPage', 'Approve failed:', error);
        this.isLoading = false;
      }
    });
  }

  unapprove(uid: string): void {
    this.isLoading = true;
    this.userService.unapprove(uid).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.logger.log('UserDetailPage', 'User unapproved', uid);
        this.isLoading = false;
      },
      error: (error) => {
        this.logger.error('UserDetailPage', 'Unapprove failed:', error);
        this.isLoading = false;
      }
    });
  }

  block(uid: string, blocked: boolean): void {
    this.isLoading = true;
    this.userService.block(uid, blocked).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.logger.log('UserDetailPage', `User ${blocked ? 'blocked' : 'unblocked'}`, uid);
        this.isLoading = false;
      },
      error: (error) => {
        this.logger.error('UserDetailPage', 'Block/unblock failed:', error);
        this.isLoading = false;
      }
    });
  }

  updateRoles(roles: string[], uid: string): void {
    if (!roles || roles.length === 0) {
      this.logger.warn('UserDetailPage', 'No roles provided');
      return;
    }

    this.userService.setRoles(uid, roles).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.logger.log('UserDetailPage', 'Roles updated', { uid, roles });
      },
      error: (error) => {
        this.logger.error('UserDetailPage', 'Role update failed:', error);
      }
    });
  }

  // User profile management
  startEdit(user: UserDoc): void {
    this.editUser = user;
    this.dialogVisible = true;
  }

  onDialogClosed(): void {
    this.dialogVisible = false;
    this.editUser = null;
  }

  onDialogSaved(payload: { 
    uid: string; 
    firstName: string; 
    lastName: string; 
    email: string; 
    phoneNumber: string; 
    birthDate: number | null 
  }): void {
    // Update all profile fields
    const updates = [
      this.userService.setNames(payload.uid, payload.firstName, payload.lastName),
      this.userService.setEmail(payload.uid, payload.email),
      this.userService.setPhoneNumber(payload.uid, payload.phoneNumber || null),
      this.userService.setBirthDate(payload.uid, payload.birthDate)
    ];

    updates.forEach(update => {
      update.pipe(takeUntil(this.destroy$)).subscribe({
        error: (error) => this.logger.error('UserDetailPage', 'Profile update failed:', error)
      });
    });

    this.dialogVisible = false;
    this.editUser = null;
  }

  // Admin / Destructive actions
  confirmDelete(uid: string): void {
    const confirmed = confirm('Bist du sicher, dass du diesen Benutzer löschen möchtest? Die Verknüpfung zu seinen AdZS wird entfernt.');
    if (!confirmed) return;

    this.isLoading = true;

    this.currentUserId$.pipe(take(1)).subscribe(currentUid => {
      const isSelf = currentUid === uid;
      const deletion$ = isSelf
        ? this.authService.deleteOwnAccount()
        : this.userService.deleteAccountByAdmin(uid);

      deletion$.pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.logger.log('UserDetailPage', 'User deleted', uid);
          this.isLoading = false;
          // Navigate back to users list
          this.router.navigate(['../'], { relativeTo: this.route });
        },
        error: (error) => {
          this.logger.error('UserDetailPage', 'Delete failed:', error);
          this.isLoading = false;
          this.showToast('Fehler beim Löschen des Benutzers', true);
        }
      });
    });
  }

  // Admin actions
  resetPassword(email: string): void {
    this.userService.resetPassword(email).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.logger.log('UserDetailPage', 'Password reset sent', email);
        this.showToast('Password-Reset E-Mail gesendet', false);
      },
      error: (error) => {
        this.logger.error('UserDetailPage', 'Password reset failed:', error);
        this.showToast('Fehler beim Senden der Reset-E-Mail', true);
      }
    });
  }

  resendVerificationEmail(): void {
    this.authService.resendVerificationEmail().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.logger.log('UserDetailPage', 'Verification email sent');
        this.showToast('Verifizierungs-E-Mail gesendet', false);
      },
      error: (error) => {
        this.logger.error('UserDetailPage', 'Verification email failed:', error);
        this.showToast('Fehler beim Senden der Verifizierungs-E-Mail', true);
      }
    });
  }

  changeEmail(uid: string, currentEmail: string): void {
    const newEmail = prompt('Neue E-Mail-Adresse eingeben:', currentEmail);
    if (!newEmail || newEmail === currentEmail) return;

    this.userService.setEmail(uid, newEmail).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.logger.log('UserDetailPage', 'Email updated', { uid, newEmail });
        this.showToast('E-Mail-Adresse aktualisiert', false);
      },
      error: (error) => {
        this.logger.error('UserDetailPage', 'Email update failed:', error);
        this.showToast('Fehler beim Aktualisieren der E-Mail', true);
      }
    });
  }

  // File upload
  onFileSelected(event: Event, uid: string): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

    if (file.size > MAX_SIZE) {
      this.showToast('Bild zu groß (max. 2 MB)', true);
      return;
    }

    this.uploading = true;
    this.uploadMsg = 'Bild wird hochgeladen…';
    this.uploadError = false;

    const storage = getStorage();
    const path = `users/${uid}/avatar_${Date.now()}`;
    const storageRef = ref(storage, path);

    uploadBytes(storageRef, file)
      .then(() => getDownloadURL(storageRef))
      .then((url: string) => {
        return this.userService.setPhotoUrl(uid, url).pipe(
          takeUntil(this.destroy$)
        ).subscribe({
          next: () => {
            this.showToast('Avatar aktualisiert', false);
          },
          error: () => {
            this.showToast('Fehler beim Speichern des Avatars', true);
          }
        });
      })
      .catch((error) => {
        this.logger.error('UserDetailPage', 'Upload failed:', error);
        this.showToast('Upload fehlgeschlagen', true);
      })
      .finally(() => {
        this.uploading = false;
      });
  }

  // Navigation
  back(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  // Utility methods
  private showToast(message: string, isError: boolean): void {
    this.uploadMsg = message;
    this.uploadError = isError;
    setTimeout(() => {
      this.uploadMsg = null;
    }, isError ? 4000 : 3000);
  }

  getUserInitials(user: UserDoc): string {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
  }
}