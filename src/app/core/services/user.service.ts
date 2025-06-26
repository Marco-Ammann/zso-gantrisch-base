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