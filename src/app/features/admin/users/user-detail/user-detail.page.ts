// src/app/features/admin/users/user-detail/user-detail.page.ts
import { CommonModule, DatePipe, NgIf, AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OverlayModule, ConnectedPosition } from '@angular/cdk/overlay';
import { getStorage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { Component, inject } from '@angular/core';
import { trigger, transition, style, animate, keyframes } from '@angular/animations';

import { Router } from '@angular/router';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { map, switchMap } from 'rxjs';

import { UserService } from '@core/services/user.service';
import { AuthService } from '@core/auth/services/auth.service';
import { UserDoc } from '@core/models/user-doc';
import { ZsoRoleSelect } from '@shared/ui/zso-role-select/zso-role-select';
import { UserEditDialogComponent } from '@shared/components/user-edit-dialog/user-edit-dialog';
import { ZsoButton } from '@shared/ui/zso-button/zso-button';
import { SwissPhonePipe } from '@shared/pipes/swiss-phone.pipe';
import { LoggerService } from '@core/services/logger.service';

@Component({
  selector: 'zso-user-detail-page',
  standalone: true,
  imports: [CommonModule, NgIf, AsyncPipe, RouterModule, DatePipe, OverlayModule, FormsModule, ZsoRoleSelect, UserEditDialogComponent, ZsoButton, SwissPhonePipe],
  templateUrl: './user-detail.page.html',
  animations: [
    trigger('badgeAnim', [
      transition(':enter', [
        style({ transform: 'scale(0.8)', opacity: 0 }),
        animate('200ms ease-out', style({ transform: 'scale(1)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ transform: 'scale(0.8)', opacity: 0 }))
      ])
    ]),
    trigger('toastSlide', [
      transition(':enter', [
        style({ transform: 'translateY(100%)', opacity: 0 }),
        animate('400ms cubic-bezier(0.22,1,0.36,1)', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('250ms ease-in', style({ transform: 'translateY(100%)', opacity: 0 }))
      ])
    ]),
    trigger('badgeState', [
      transition('* => *', [
        animate(
          '250ms ease-out',
          keyframes([
            style({ transform: 'scale(1)', offset: 0 }),
            style({ transform: 'scale(1.25)', offset: 0.5 }),
            style({ transform: 'scale(1)', offset: 1 })
          ])
        )
      ])
    ]),
  ],
  styleUrls: ['./user-detail.page.scss']
})
export class UserDetailPage {
  private route = inject(ActivatedRoute);
  private userService = inject(UserService);
  private logger = inject(LoggerService);
  private router = inject(Router);
  private authService = inject(AuthService);

  availableRoles: string[] = ['user', 'admin'];

  menuOpen = false;
  dialogVisible = false;
  editUser: UserDoc | null = null;
  uploading = false;
  uploadMsg: string | null = null;
  uploadError = false;

  // Public observable for current user ID
  currentUserId$ = this.authService.user$.pipe(
    map(user => user?.uid || null)
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

  approve(uid: string): void {
    this.logger.log('UserDetailPage', 'approve', uid);
    this.userService.approve(uid).subscribe();
  }

  unapprove(uid: string): void {
    this.logger.log('UserDetailPage', 'unapprove', uid);
    this.userService.unapprove(uid).subscribe();
  }

  block(uid: string, blocked: boolean): void {
    this.logger.log('UserDetailPage', blocked ? 'block' : 'unblock', uid);
    this.userService.block(uid, blocked).subscribe();
  }

  updateRoles(roles: string[], uid: string): void {
    this.logger.log('UserDetailPage', 'updateRoles', roles);
    this.userService.setRoles(uid, roles).subscribe();
  }

  startEdit(user: UserDoc): void {
    this.editUser = user;
    this.dialogVisible = true;
  }

  onDialogClosed() {
    this.dialogVisible = false;
  }

  onDialogSaved(payload: { uid: string; firstName: string; lastName: string; email: string; phoneNumber: string; birthDate: number | null }) {
    this.userService.setNames(payload.uid, payload.firstName, payload.lastName).subscribe();
    this.userService.setEmail(payload.uid, payload.email).subscribe();
    this.userService.setPhoneNumber(payload.uid, payload.phoneNumber || null).subscribe();
    this.userService.setBirthDate(payload.uid, payload.birthDate).subscribe();
    this.dialogVisible = false;
  }

  editNames(user: UserDoc): void {
    this.startEdit(user);
  }

  resetPassword(email: string): void {
    this.logger.log('UserDetailPage', 'resetPassword', email);
    this.userService.resetPassword(email).subscribe();
  }

  resendVerificationEmail(): void {
    this.logger.log('UserDetailPage', 'resendVerificationEmail');
    this.authService.resendVerificationEmail().subscribe();
  }

  changeEmail(uid: string, currentEmail: string): void {
    const newEmail = prompt('Neue E-Mail-Adresse eingeben', currentEmail);
    if (!newEmail || newEmail === currentEmail) return;
    this.logger.log('UserDetailPage', 'changeEmail', { uid, newEmail });
    // Simplified: only update Firestore doc; actual auth email update would require re-auth.
    this.userService.setEmail?.(uid, newEmail)?.subscribe?.();
  }

  back(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  onFileSelected(event: Event, uid: string): void {
    const input = event.target as HTMLInputElement;

    if (!input.files?.length) return;
    const file = input.files[0];

    // Validate file size (max 2 MB)
    const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
    if (file.size > MAX_SIZE) {
      this.uploadMsg = 'Bild zu groß (max. 2 MB).';
      this.uploadError = true;
      return;
    }

    this.uploading = true;
    this.uploadMsg = 'Bild wird hochgeladen…';
    this.uploadError = false;

    const storage = getStorage();
    const path = `users/${uid}/avatar_${Date.now()}`;
    const storageRef = ref(storage, path);
    this.logger.log('UserDetailPage', 'uploadImage', path);

    uploadBytes(storageRef, file)
      .then(() => getDownloadURL(storageRef))
      .then((url: string) => this.userService.setPhotoUrl(uid, url).subscribe({
        next: () => {
          this.uploadMsg = 'Bild aktualisiert.';
          setTimeout(() => (this.uploadMsg = null), 3000);
          this.uploadError = false;
        },
        error: () => {
          this.uploadMsg = 'Fehler beim Speichern des Bildes.';
          setTimeout(() => (this.uploadMsg = null), 4000);
          this.uploadError = true;
        }
      }))
      .catch((err: unknown) => {
        this.logger.error?.('UserDetailPage', 'upload failed', err);
        this.uploadMsg = 'Upload fehlgeschlagen.';
        setTimeout(() => (this.uploadMsg = null), 4000);
        this.uploadError = true;
      })
      .finally(() => (this.uploading = false));
  }
}