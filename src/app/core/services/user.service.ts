// src/app/core/services/user.service.ts
import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import { Auth, sendPasswordResetEmail } from '@angular/fire/auth';
import { collection, collectionData, doc, updateDoc } from '@angular/fire/firestore';
import { Observable, from, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { UserDoc } from '@core/models/user-doc';
import { FirestoreService } from './firestore.service';
import { LoggerService } from '@core/services/logger.service';

// alias to keep existing code compile
export type AppUser = UserDoc;

@Injectable({ providedIn: 'root' })
export class UserService {
  private auth = inject(Auth);
  private injector = inject(Injector);
  private logger = inject(LoggerService);

  constructor(private firestoreService: FirestoreService) {}

  getAll(): Observable<UserDoc[]> {
    this.logger.log('UserService', 'getAll');
    return runInInjectionContext(this.injector, () => {
      const usersCollection = collection(this.firestoreService.db, 'users');
      return collectionData(usersCollection, { idField: 'uid' }) as Observable<UserDoc[]>;
    });
  }

  approve(uid: string) {
    this.logger.log('UserService', 'approve', uid);
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);
    return runInInjectionContext(this.injector, () => 
      from(updateDoc(userDoc, { 
        approved: true, 
        blocked: false, 
        updatedAt: Date.now() 
      }).then(() => {
        this.logger.log('UserService', `User ${uid} approved`);
      }))
    );
  }

  block(uid: string, blocked = true) {
    this.logger.log('UserService', `${blocked ? 'Blocking' : 'Unblocking'} user`, uid);
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);
    return runInInjectionContext(this.injector, () => 
      from(updateDoc(userDoc, { 
        blocked,
        updatedAt: Date.now() 
      }).then(() => {
        this.logger.log('UserService', `User ${uid} ${blocked ? 'blocked' : 'unblocked'}`);
      }))
    );
  }

  setRoles(uid: string, roles: string[]) {
    this.logger.log('UserService', 'setRoles', { uid, roles });
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);
    return runInInjectionContext(this.injector, () => 
      from(updateDoc(userDoc, { 
        roles,
        updatedAt: Date.now() 
      }).then(() => {
        this.logger.log('UserService', `Roles updated for user ${uid}`, roles);
      }))
    );
  }

  /**
   * Update email address in Firestore profile document (does NOT change auth email).
   */
  setEmail(uid: string, email: string) {
    this.logger.log('UserService', 'setEmail', { uid, email });
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);
    return runInInjectionContext(this.injector, () =>
      from(updateDoc(userDoc, {
        email,
        updatedAt: Date.now()
      }).then(() => {
        this.logger.log('UserService', `Email updated for user ${uid}`);
      }))
    );
  }

  /**
   * Save photoUrl (avatar) in profile document.
   */
  setNames(uid: string, firstName: string, lastName: string) {
    this.logger.log('UserService', 'setNames', { uid, firstName, lastName });
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);
    return runInInjectionContext(this.injector, () =>
      from(updateDoc(userDoc, {
        firstName,
        lastName,
        updatedAt: Date.now()
      }).then(() => {
        this.logger.log('UserService', `Names updated for user ${uid}`);
      }))
    );
  }

  setBirthDate(uid: string, birthDate: number | null) {
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);
    return runInInjectionContext(this.injector, () => from(updateDoc(userDoc, {
      birthDate,
      updatedAt: Date.now()
    })));
  }

  setPhoneNumber(uid: string, phoneNumber: string | null) {
    this.logger.log('UserService', 'setPhoneNumber', { uid, phoneNumber });
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);
    return runInInjectionContext(this.injector, () =>
      from(updateDoc(userDoc, {
        phoneNumber,
        updatedAt: Date.now()
      }).then(() => {
        this.logger.log('UserService', `Phone number updated for user ${uid}`);
      }))
    );
  }

  setPhotoUrl(uid: string, photoUrl: string) {
    this.logger.log('UserService', 'setPhotoUrl', { uid, photoUrl });
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);
    return runInInjectionContext(this.injector, () =>
      from(updateDoc(userDoc, {
        photoUrl,
        updatedAt: Date.now()
      }).then(() => {
        this.logger.log('UserService', `Photo URL saved for user ${uid}`);
      }))
    );
  }

  unapprove(uid: string) {
    this.logger.log('UserService', 'unapprove', uid);
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);
    return runInInjectionContext(this.injector, () => 
      from(updateDoc(userDoc, { 
        approved: false, 
        updatedAt: Date.now() 
      }).then(() => {
        this.logger.log('UserService', `User ${uid} unapproved`);
      }))
    );
  }

  resetPassword(email: string): Observable<void> {
    this.logger.log('UserService', 'Sending password reset email to', email);
    return from(sendPasswordResetEmail(this.auth, email)).pipe(
      switchMap(() => {
        this.logger.log('UserService', 'Password reset email sent to', email);
        return of(undefined);
      })
    );
  }

  /**
   * Persist auth info (provider, emailVerified, phoneNumber) to the Firestore user document.
   * Can be called after signup or periodically by an admin task.
   */
  setAuthInfo(uid: string, authProvider: string, emailVerified: boolean, phoneNumber: string | null) {
    this.logger.log('UserService', 'setAuthInfo', { uid, authProvider, emailVerified, phoneNumber });
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);
    return runInInjectionContext(this.injector, () =>
      from(updateDoc(userDoc, {
        authProvider,
        emailVerified,
        phoneNumber,
        updatedAt: Date.now()
      }).then(() => {
        this.logger.log('UserService', `Auth info updated for user ${uid}`);
      }))
    );
  }

  /** Update only the emailVerified flag */
  updateEmailVerified(uid: string, emailVerified: boolean) {
    this.logger.log('UserService', 'updateEmailVerified', { uid, emailVerified });
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);
    return runInInjectionContext(this.injector, () =>
      from(updateDoc(userDoc, {
        emailVerified,
        updatedAt: Date.now()
      }).then(() => {
        this.logger.log('UserService', `emailVerified updated for user ${uid}`);
      }))
    );
  }

  updateLastLoginAt(uid: string) {
    this.logger.log('UserService', 'updateLastLoginAt', uid);
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);
    return runInInjectionContext(this.injector, () => 
      from(updateDoc(userDoc, { 
        lastLoginAt: Date.now() 
      }).then(() => {
        this.logger.log('UserService', `Last login updated for user ${uid}`);
      }))
    );
  }

  updateLastLogoutAt(uid: string) {
    this.logger.log('UserService', 'updateLastLogoutAt', uid);
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);
    return runInInjectionContext(this.injector, () => 
      from(updateDoc(userDoc, { 
        lastLogoutAt: Date.now() 
      }).then(() => {
        this.logger.log('UserService', `Last logout updated for user ${uid}`);
      }))
    );
  }

  updateLastActiveAt(uid: string) {
    this.logger.log('UserService', 'updateLastActiveAt', uid);
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);
    return runInInjectionContext(this.injector, () => 
      from(updateDoc(userDoc, { 
        lastActiveAt: Date.now() 
      }).then(() => {
        this.logger.log('UserService', `Last active updated for user ${uid}`);
      }))
    );
  }

  updateLastInactiveAt(uid: string) {
    this.logger.log('UserService', 'updateLastInactiveAt', uid);
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);
    return runInInjectionContext(this.injector, () => 
      from(updateDoc(userDoc, { 
        lastInactiveAt: Date.now() 
      }).then(() => {
        this.logger.log('UserService', `Last inactive updated for user ${uid}`);
      }))
    );
  }
}