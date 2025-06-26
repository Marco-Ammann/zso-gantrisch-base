// src/app/core/services/user.service.ts
import { Injectable, inject } from '@angular/core';
import { Auth, sendPasswordResetEmail } from '@angular/fire/auth';
import { collection, collectionData, doc, updateDoc } from '@angular/fire/firestore';
import { Observable, from, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { UserDoc } from '@core/models/user-doc';
import { FirestoreService } from './firestore.service';

// alias to keep existing code compile
export type AppUser = UserDoc;

@Injectable({ providedIn: 'root' })
export class UserService {
  private auth = inject(Auth);

  constructor(private firestoreService: FirestoreService) {}

  getAll(): Observable<UserDoc[]> {
    const usersCollection = collection(this.firestoreService.db, 'users');
    console.log('[UserService] getAll');
    return collectionData(usersCollection, { idField: 'uid' }) as Observable<UserDoc[]>;
  }

  approve(uid: string) {
    console.log('[UserService] approve', uid);
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);
    return from(updateDoc(userDoc, { 
      approved: true, 
      blocked: false, 
      updatedAt: Date.now() 
    }).then(() => {
      console.log(`[UserService] User ${uid} approved`);
    }));
  }

  block(uid: string, blocked = true) {
    console.log(`[UserService] ${blocked ? 'Blocking' : 'Unblocking'} user`, uid);
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);
    return from(updateDoc(userDoc, { 
      blocked,
      updatedAt: Date.now() 
    }).then(() => {
      console.log(`[UserService] User ${uid} ${blocked ? 'blocked' : 'unblocked'}`);
    }));
  }

  setRoles(uid: string, roles: string[]) {
    console.log('[UserService] setRoles', { uid, roles });
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);
    return from(updateDoc(userDoc, { 
      roles,
      updatedAt: Date.now() 
    }).then(() => {
      console.log(`[UserService] Roles updated for user ${uid}`, roles);
    }));
  }

  unapprove(uid: string) {
    console.log('[UserService] unapprove', uid);
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);
    return from(updateDoc(userDoc, { 
      approved: false, 
      updatedAt: Date.now() 
    }).then(() => {
      console.log(`[UserService] User ${uid} unapproved`);
    }));
  }

  resetPassword(email: string): Observable<void> {
    console.log('[UserService] Sending password reset email to', email);
    return from(sendPasswordResetEmail(this.auth, email)).pipe(
      switchMap(() => {
        console.log('[UserService] Password reset email sent to', email);
        return of(undefined);
      })
    );
  }

  updateLastLoginAt(uid: string) {
    console.log('[UserService] updateLastLoginAt', uid);
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);
    return from(updateDoc(userDoc, { 
      lastLoginAt: Date.now() 
    }).then(() => {
      console.log(`[UserService] Last login updated for user ${uid}`);
    }));
  }

  updateLastLogoutAt(uid: string) {
    console.log('[UserService] updateLastLogoutAt', uid);
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);
    return from(updateDoc(userDoc, { 
      lastLogoutAt: Date.now() 
    }).then(() => {
      console.log(`[UserService] Last logout updated for user ${uid}`);
    }));
  }

  updateLastActiveAt(uid: string) {
    console.log('[UserService] updateLastActiveAt', uid);
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);
    return from(updateDoc(userDoc, { 
      lastActiveAt: Date.now() 
    }).then(() => {
      console.log(`[UserService] Last active updated for user ${uid}`);
    }));
  }

  updateLastInactiveAt(uid: string) {
    console.log('[UserService] updateLastInactiveAt', uid);
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);
    return from(updateDoc(userDoc, { 
      lastInactiveAt: Date.now() 
    }).then(() => {
      console.log(`[UserService] Last inactive updated for user ${uid}`);
    }));
  }
}