import { Injectable } from '@angular/core';
import { FirestoreService } from './firestore.service';
import { collectionData, updateDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

import { UserDoc } from '@core/models/user-doc';

// alias to keep existing code compiling
export type AppUser = UserDoc;

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private fs: FirestoreService) {}

  getAll(): Observable<UserDoc[]> {
    const col = this.fs.col<UserDoc>('users');
    console.log('[UserService] getAll');
    return collectionData(col, { idField: 'uid' }) as Observable<UserDoc[]>;
  }

  approve(uid: string) {
    console.log('[UserService] approve', uid);
    return updateDoc(this.fs.doc(`users/${uid}`), { approved: true, blocked: false, updatedAt: Date.now() });
  }

  block(uid: string, blocked = true) {
    console.log('[UserService] block', uid, blocked);
    return updateDoc(this.fs.doc(`users/${uid}`), { blocked, updatedAt: Date.now() });
  }

  setRoles(uid: string, roles: string[]) {
    console.log('[UserService] setRoles', uid, roles);
    return updateDoc(this.fs.doc(`users/${uid}`), { roles, updatedAt: Date.now() });
  }
}
