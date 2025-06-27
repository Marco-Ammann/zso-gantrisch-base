// src/app/features/admin/users/user-detail/user-detail.page.ts
import { CommonModule, DatePipe, NgIf, AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OverlayModule, ConnectedPosition } from '@angular/cdk/overlay';
import { getStorage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { map, switchMap } from 'rxjs';

import { UserService } from '@core/services/user.service';
import { AuthService } from '@core/auth/services/auth.service';
import { UserDoc } from '@core/models/user-doc';
import { ZsoRoleSelect } from '@shared/ui/zso-role-select/zso-role-select';
import { UserEditDialogComponent } from '@shared/components/user-edit-dialog/user-edit-dialog';
import { ZsoButton } from '@shared/ui/zso-button/zso-button';
import { LoggerService } from '@core/services/logger.service';

@Component({
  selector: 'zso-user-detail-page',
  standalone: true,
  imports: [CommonModule, NgIf, AsyncPipe, RouterModule, DatePipe, OverlayModule, FormsModule, ZsoRoleSelect, UserEditDialogComponent, ZsoButton],
  templateUrl: './user-detail.page.html',
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

  onDialogSaved(payload: { uid: string; firstName: string; lastName: string; email: string }) {
    this.userService.setNames(payload.uid, payload.firstName, payload.lastName).subscribe();
    this.userService.setEmail(payload.uid, payload.email).subscribe();
    this.dialogVisible = false;
  }

  

  

  // legacy prompt method removed

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
    this.uploading = true;
    const storage = getStorage();
    const path = `users/${uid}/avatar_${Date.now()}`;
    const storageRef = ref(storage, path);
    this.logger.log('UserDetailPage', 'uploadImage', path);
    uploadBytes(storageRef, file)
      .then(() => getDownloadURL(storageRef))
      .then((url: string) => this.userService.setPhotoUrl(uid, url).subscribe())
      .catch((err: unknown) => this.logger.error?.('UserDetailPage', 'upload failed', err))
      .finally(() => (this.uploading = false));
  }
}
