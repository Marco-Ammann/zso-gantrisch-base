// src/app/core/services/user.service.ts
import { Injectable, inject, Injector, runInInjectionContext, OnDestroy } from '@angular/core';
import { Auth, sendPasswordResetEmail } from '@angular/fire/auth';
import { collection, collectionData, doc, updateDoc, query, orderBy } from '@angular/fire/firestore';
import { Observable, from, of, throwError, Subject } from 'rxjs';
import { switchMap, catchError, map, takeUntil } from 'rxjs/operators';

import { UserDoc } from '@core/models/user-doc';
import { FirestoreService } from './firestore.service';
import { LoggerService } from '@core/services/logger.service';

@Injectable({ providedIn: 'root' })
export class UserService implements OnDestroy {
  private readonly auth = inject(Auth);
  private readonly injector = inject(Injector);
  private readonly logger = inject(LoggerService);
  private readonly destroy$ = new Subject<void>();

  constructor(private firestoreService: FirestoreService) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.logger.log('UserService', 'Service destroyed');
  }

  getAll(): Observable<UserDoc[]> {
    return runInInjectionContext(this.injector, () => {
      try {
        const usersCollection = collection(this.firestoreService.db, 'users');
        const usersQuery = query(usersCollection, orderBy('createdAt', 'desc'));
        
        return collectionData(usersQuery, { idField: 'uid' }).pipe(
          map(users => {
            this.logger.log('UserService', `Loaded ${users.length} users`);
            return users as UserDoc[];
          }),
          catchError(error => {
            this.logger.error('UserService', 'Error loading users:', error);
            return of([]);
          }),
          takeUntil(this.destroy$)
        );
      } catch (error) {
        this.logger.error('UserService', 'Error creating query:', error);
        return of([]);
      }
    });
  }

  approve(uid: string): Observable<void> {
    this.logger.log('UserService', 'Approving user', uid);
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);
    
    return runInInjectionContext(this.injector, () => 
      from(updateDoc(userDoc, { 
        approved: true, 
        blocked: false, 
        updatedAt: Date.now() 
      })).pipe(
        catchError(error => {
          this.logger.error('UserService', `Error approving user ${uid}:`, error);
          return throwError(() => error);
        }),
        takeUntil(this.destroy$)
      )
    );
  }

  unapprove(uid: string): Observable<void> {
    this.logger.log('UserService', 'Unapproving user', uid);
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);
    
    return runInInjectionContext(this.injector, () => 
      from(updateDoc(userDoc, { 
        approved: false, 
        updatedAt: Date.now() 
      })).pipe(
        catchError(error => {
          this.logger.error('UserService', `Error unapproving user ${uid}:`, error);
          return throwError(() => error);
        }),
        takeUntil(this.destroy$)
      )
    );
  }

  block(uid: string, blocked = true): Observable<void> {
    this.logger.log('UserService', `${blocked ? 'Blocking' : 'Unblocking'} user`, uid);
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);
    
    return runInInjectionContext(this.injector, () => 
      from(updateDoc(userDoc, { 
        blocked,
        updatedAt: Date.now() 
      })).pipe(
        catchError(error => {
          this.logger.error('UserService', `Error ${blocked ? 'blocking' : 'unblocking'} user ${uid}:`, error);
          return throwError(() => error);
        }),
        takeUntil(this.destroy$)
      )
    );
  }

  setRoles(uid: string, roles: string[]): Observable<void> {
    this.logger.log('UserService', 'Setting roles', { uid, roles });
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);
    
    return runInInjectionContext(this.injector, () => 
      from(updateDoc(userDoc, { 
        roles,
        updatedAt: Date.now() 
      })).pipe(
        catchError(error => {
          this.logger.error('UserService', `Error updating roles for user ${uid}:`, error);
          return throwError(() => error);
        }),
        takeUntil(this.destroy$)
      )
    );
  }

  setEmail(uid: string, email: string): Observable<void> {
    this.logger.log('UserService', 'Setting email', { uid, email });
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);
    
    return runInInjectionContext(this.injector, () =>
      from(updateDoc(userDoc, {
        email,
        updatedAt: Date.now()
      })).pipe(
        catchError(error => {
          this.logger.error('UserService', `Error updating email for user ${uid}:`, error);
          return throwError(() => error);
        }),
        takeUntil(this.destroy$)
      )
    );
  }

  setNames(uid: string, firstName: string, lastName: string): Observable<void> {
    this.logger.log('UserService', 'Setting names', { uid, firstName, lastName });
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);
    
    return runInInjectionContext(this.injector, () =>
      from(updateDoc(userDoc, {
        firstName,
        lastName,
        updatedAt: Date.now()
      })).pipe(
        catchError(error => {
          this.logger.error('UserService', `Error updating names for user ${uid}:`, error);
          return throwError(() => error);
        }),
        takeUntil(this.destroy$)
      )
    );
  }

  setBirthDate(uid: string, birthDate: number | null): Observable<void> {
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);
    
    return runInInjectionContext(this.injector, () => 
      from(updateDoc(userDoc, {
        birthDate,
        updatedAt: Date.now()
      })).pipe(
        takeUntil(this.destroy$)
      )
    );
  }

  setPhoneNumber(uid: string, phoneNumber: string | null): Observable<void> {
    this.logger.log('UserService', 'Setting phone number', { uid, phoneNumber });
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);
    
    return runInInjectionContext(this.injector, () =>
      from(updateDoc(userDoc, {
        phoneNumber,
        updatedAt: Date.now()
      })).pipe(
        catchError(error => {
          this.logger.error('UserService', `Error updating phone for user ${uid}:`, error);
          return throwError(() => error);
        }),
        takeUntil(this.destroy$)
      )
    );
  }

  setPhotoUrl(uid: string, photoUrl: string): Observable<void> {
    this.logger.log('UserService', 'Setting photo URL', { uid, photoUrl });
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);
    
    return runInInjectionContext(this.injector, () =>
      from(updateDoc(userDoc, {
        photoUrl,
        updatedAt: Date.now()
      })).pipe(
        catchError(error => {
          this.logger.error('UserService', `Error updating photo for user ${uid}:`, error);
          return throwError(() => error);
        }),
        takeUntil(this.destroy$)
      )
    );
  }

  resetPassword(email: string): Observable<void> {
    this.logger.log('UserService', 'Sending password reset email to', email);
    
    return from(sendPasswordResetEmail(this.auth, email)).pipe(
      switchMap(() => {
        this.logger.log('UserService', 'Password reset email sent to', email);
        return of(undefined);
      }),
      catchError(error => {
        this.logger.error('UserService', 'Error sending password reset:', error);
        return throwError(() => error);
      }),
      takeUntil(this.destroy$)
    );
  }

  updateLastActiveAt(uid: string): Observable<void> {
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);
    
    return runInInjectionContext(this.injector, () => 
      from(updateDoc(userDoc, { 
        lastActiveAt: Date.now() 
      })).pipe(
        takeUntil(this.destroy$)
      )
    );
  }
}