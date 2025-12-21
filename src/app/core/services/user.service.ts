// src/app/core/services/user.service.ts
import {
  Injectable,
  inject,
  Injector,
  runInInjectionContext,
  OnDestroy,
} from '@angular/core';
import { Auth, sendPasswordResetEmail } from '@angular/fire/auth';
import {
  collection,
  collectionData,
  doc,
  updateDoc,
  query,
  orderBy,
} from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable, from, of, throwError, Subject } from 'rxjs';
import { switchMap, catchError, map, take, takeUntil } from 'rxjs/operators';

import { UserDoc } from '@core/models/user-doc';
import { FirestoreService } from './firestore.service';
import { PersonService } from './person.service';
import { LoggerService } from '@core/services/logger.service';
import { ActivityLogService, applyDeepPatch } from '@core/services/activity-log.service';

interface Stats {
  total: number;
  active: number;
  pending: number;
  blocked: number;
}

@Injectable({ providedIn: 'root' })
export class UserService implements OnDestroy {
  private readonly auth = inject(Auth);
  private readonly injector = inject(Injector);
  private readonly logger = inject(LoggerService);
  private readonly functions = inject(Functions);
  private readonly personService = inject(PersonService);
  private readonly activityLog = inject(ActivityLogService);
  private readonly destroy$ = new Subject<void>();

  constructor(private firestoreService: FirestoreService) { }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.logger.log('UserService', 'Service destroyed');
  }

  private updateWithLog(uid: string, updates: Partial<UserDoc>): Observable<void> {
    const userDocRef = doc(this.firestoreService.db, `users/${uid}`);
    const now = Date.now();

    return runInInjectionContext(this.injector, () =>
      this.firestoreService.getDoc<UserDoc>(`users/${uid}`).pipe(
        take(1),
        switchMap((before) => {
          const payload = {
            ...updates,
            updatedAt: now,
          } as any;

          const after = applyDeepPatch((before ?? ({} as any)) as any, payload);

          return from(updateDoc(userDocRef, payload)).pipe(
            switchMap(() => this.activityLog.logUpdate(`users:${uid}`, before, after)),
            map(() => void 0)
          );
        })
      )
    );
  }

  getAll(): Observable<UserDoc[]> {
    return runInInjectionContext(this.injector, () => {
      try {
        const usersCollection = collection(this.firestoreService.db, 'users');
        const usersQuery = query(usersCollection, orderBy('createdAt', 'desc'));

        return collectionData(usersQuery, { idField: 'uid' }).pipe(
          map((users) => {
            this.logger.log('UserService', `Loaded ${users.length} users`);
            return users as UserDoc[];
          }),
          catchError((error) => {
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


  getStats(): Observable<Stats> {
    return this.getAll().pipe(
      map((users) => ({
        total: users.length,
        active: users.filter((u) => u.approved && !u.blocked).length,
        pending: users.filter((u) => !u.approved).length,
        blocked: users.filter((u) => u.blocked).length,
      }))
    );
  }

  approve(uid: string): Observable<void> {
    this.logger.log('UserService', 'Approving user', uid);
    return this.updateWithLog(uid, {
      approved: true,
      blocked: false,
    }).pipe(
      catchError((error) => {
        this.logger.error(
          'UserService',
          `Error approving user ${uid}:`,
          error
        );
        return throwError(() => error);
      }),
      takeUntil(this.destroy$)
    )
  }

  unapprove(uid: string): Observable<void> {
    this.logger.log('UserService', 'Unapproving user', uid);
    return this.updateWithLog(uid, {
      approved: false,
    }).pipe(
      catchError((error) => {
        this.logger.error(
          'UserService',
          `Error unapproving user ${uid}:`,
          error
        );
        return throwError(() => error);
      }),
      takeUntil(this.destroy$)
    )
  }

  block(uid: string, blocked = true): Observable<void> {
    this.logger.log(
      'UserService',
      `${blocked ? 'Blocking' : 'Unblocking'} user`,
      uid
    );
    return this.updateWithLog(uid, {
      blocked,
    }).pipe(
      catchError((error) => {
        this.logger.error(
          'UserService',
          `Error ${blocked ? 'blocking' : 'unblocking'} user ${uid}:`,
          error
        );
        return throwError(() => error);
      }),
      takeUntil(this.destroy$)
    )
  }

  setRoles(uid: string, roles: string[]): Observable<void> {
    this.logger.log('UserService', 'Setting roles', { uid, roles });
    return this.updateWithLog(uid, { roles }).pipe(
      catchError((error) => {
        this.logger.error(
          'UserService',
          `Error updating roles for user ${uid}:`,
          error
        );
        return throwError(() => error);
      }),
      takeUntil(this.destroy$)
    )
  }

  setEmail(uid: string, email: string): Observable<void> {
    this.logger.log('UserService', 'Setting email', { uid, email });
    return this.updateWithLog(uid, { email }).pipe(
      catchError((error) => {
        this.logger.error(
          'UserService',
          `Error updating email for user ${uid}:`,
          error
        );
        return throwError(() => error);
      }),
      takeUntil(this.destroy$)
    )
  }

  setNames(uid: string, firstName: string, lastName: string): Observable<void> {
    this.logger.log('UserService', 'Setting names', {
      uid,
      firstName,
      lastName,
    });
    return this.updateWithLog(uid, { firstName, lastName }).pipe(
      catchError((error) => {
        this.logger.error(
          'UserService',
          `Error updating names for user ${uid}:`,
          error
        );
        return throwError(() => error);
      }),
      takeUntil(this.destroy$)
    )
  }

  setBirthDate(uid: string, birthDate: number | null): Observable<void> {
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);

    return runInInjectionContext(this.injector, () =>
      from(
        updateDoc(userDoc, {
          birthDate,
          updatedAt: Date.now(),
        })
      ).pipe(takeUntil(this.destroy$))
    );
  }

  setPhoneNumber(uid: string, phoneNumber: string | null): Observable<void> {
    this.logger.log('UserService', 'Setting phone number', {
      uid,
      phoneNumber,
    });
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);

    return runInInjectionContext(this.injector, () =>
      from(
        updateDoc(userDoc, {
          phoneNumber,
          updatedAt: Date.now(),
        })
      ).pipe(
        catchError((error) => {
          this.logger.error(
            'UserService',
            `Error updating phone for user ${uid}:`,
            error
          );
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
      from(
        updateDoc(userDoc, {
          photoUrl,
          updatedAt: Date.now(),
        })
      ).pipe(
        catchError((error) => {
          this.logger.error(
            'UserService',
            `Error updating photo for user ${uid}:`,
            error
          );
          return throwError(() => error);
        }),
        takeUntil(this.destroy$)
      )
    );
  }

  getUserDoc(uid: string): Observable<UserDoc | null> {
    return this.firestoreService.getDoc<UserDoc>(`users/${uid}`).pipe(
      catchError((error) => {
        this.logger.error('UserService', 'Error getting user doc', error);
        return of(null);
      })
    );
  }

  resetPassword(email: string): Observable<void> {
    this.logger.log('UserService', 'Sending password reset email to', email);

    return from(sendPasswordResetEmail(this.auth, email)).pipe(
      switchMap(() => {
        this.logger.log('UserService', 'Password reset email sent to', email);
        return of(undefined);
      }),
      catchError((error) => {
        this.logger.error(
          'UserService',
          'Error sending password reset:',
          error
        );
        return throwError(() => error);
      }),
      takeUntil(this.destroy$)
    );
  }

  /**
   * Delete an account as admin: unlink person, delete user doc, invoke Cloud Function to delete auth user.
   */
  deleteAccountByAdmin(uid: string): Observable<void> {
    this.logger.warn('UserService', 'Admin deleting account', uid);

    const deleteAuthFn = httpsCallable<{ uid: string }, void>(
      this.functions,
      'adminDeleteUser'
    );

    return this.personService.unlinkByUserId(uid).pipe(
      switchMap(() => this.firestoreService.deleteDoc(`users/${uid}`).pipe(catchError(() => of(void 0)))),
      switchMap(() => from(deleteAuthFn({ uid })).pipe(
        map(() => void 0),
        catchError((err: any) => {
          this.logger.error('UserService', 'Cloud function delete failed', err);
          return of(void 0);
        })))
    );
  }

  updateLastActiveAt(uid: string): Observable<void> {
    const userDoc = doc(this.firestoreService.db, `users/${uid}`);

    return runInInjectionContext(this.injector, () =>
      from(
        updateDoc(userDoc, {
          lastActiveAt: Date.now(),
        })
      ).pipe(takeUntil(this.destroy$))
    );
  }
}
