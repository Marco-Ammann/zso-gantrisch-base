// src/app/core/auth/services/auth.service.ts
import { Injectable, OnDestroy, Injector } from '@angular/core';
import { 
  Auth, 
  User, 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  sendEmailVerification, 
  updateProfile, 
  browserLocalPersistence, 
  browserSessionPersistence, 
  setPersistence, 
  authState, 
  UserCredential 
} from '@angular/fire/auth';
import { Observable, of, throwError, Subject, from, Subscription } from 'rxjs';
import { catchError, map, shareReplay, switchMap, take, takeUntil, tap } from 'rxjs/operators';

import { FirestoreService } from '@core/services/firestore.service';
import { LoggerService } from '@core/services/logger.service';
import { UserService } from '@core/services/user.service';
import { UserDoc } from '@core/models/user-doc';

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AppUserCombined {
  auth: User;
  doc: UserDoc;
}

@Injectable({ providedIn: 'root' })
export class AuthService implements OnDestroy {
  // User observable that combines Firebase Auth state with Firestore user doc
  user$: Observable<User | null> = of(null);
  appUser$: Observable<AppUserCombined | null> = of(null);
  
  // Subject for unsubscribing from observables
  private readonly destroy$ = new Subject<void>();
  private userSubscription?: Subscription;

  constructor(
    private readonly auth: Auth,
    private readonly fs: FirestoreService,
    private readonly logger: LoggerService,
    private readonly userService: UserService,
    private readonly injector: Injector
  ) {
    this.initializeUserObservables();
  }

  private initializeUserObservables() {
    // User observable from Firebase Auth
    this.user$ = authState(this.auth).pipe(
      tap(user => {
        if (user) {
          this.logger.log('AuthService', 'User auth state changed:', user.email);
          // Update last active timestamp when auth state changes
          this.userService.updateLastActiveAt(user.uid).subscribe({
            error: err => this.logger.error('AuthService', 'Error updating last active:', err)
          });
        } else {
          this.logger.log('AuthService', 'User signed out');
        }
      }),
      shareReplay(1),
      takeUntil(this.destroy$)
    );

    // Combined observable with Firestore user doc
    this.appUser$ = this.user$.pipe(
      switchMap(user => {
        if (!user) {
          return of(null);
        }
        
        return this.fs.getDoc<UserDoc>(`users/${user.uid}`).pipe(
          take(1),
          map(userDoc => {
            if (!userDoc) {
              this.logger.warn('AuthService', `No user document found for uid: ${user.uid}`);
              return null;
            }
            return { auth: user, doc: userDoc } as AppUserCombined;
          }),
          catchError(error => {
            this.logger.error('AuthService', 'Error loading user document:', error);
            return of(null);
          })
        );
      }),
      shareReplay(1)
    );

    // Subscribe to appUser$ to handle errors
    this.userSubscription = this.appUser$.subscribe({
      error: error => this.logger.error('AuthService', 'Error in user$ observable:', error)
    });
  }

  /* ---------- Auth ---------- */
  login(email: string, password: string, rememberMe: boolean): Observable<void> {
    this.logger.log('AuthService', `Login attempt for ${email}`);
    
    // Set persistence based on remember me
    const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    
    return from(setPersistence(this.auth, persistence)).pipe(
      switchMap(() => signInWithEmailAndPassword(this.auth, email, password)),
      switchMap(({ user }) => {
        // Update last login timestamp
        return this.fs.updateDoc(`users/${user.uid}`, {
          lastLoginAt: Date.now(),
          updatedAt: Date.now()
        }).pipe(
          map(() => void 0),
          catchError(error => {
            this.logger.error('AuthService', 'Error updating last login:', error);
            return of(void 0); // Don't fail login if update fails
          })
        );
      }),
      tap(() => this.logger.log('AuthService', `Login successful for ${email}`)),
      catchError(error => {
        this.logger.error('AuthService', 'Login error:', error);
        return throwError(() => error);
      })
    );
  }

  logout(): Observable<void> {
    this.logger.log('AuthService', 'Logging out user');
    
    // Get current user before signing out
    const user = this.auth.currentUser;
    const uid = user?.uid;
    
    // Sign out from Firebase Auth
    return from(signOut(this.auth)).pipe(
      // Update last logout timestamp if we have a user
      switchMap(() => {
        if (!uid) return of(void 0);
        
        return this.fs.updateDoc(`users/${uid}`, {
          lastLogoutAt: Date.now(),
          updatedAt: Date.now()
        }).pipe(
          catchError(error => {
            this.logger.error('AuthService', 'Error updating last logout:', error);
            return of(void 0); // Don't fail logout if update fails
          })
        );
      }),
      tap(() => this.logger.log('AuthService', 'Logout successful')),
      catchError(error => {
        this.logger.error('AuthService', 'Logout error:', error);
        return throwError(() => error);
      })
    );
  }

  /* ---------- Registrierung ---------- */
  register(data: RegisterData): Observable<void> {
    return from(
      createUserWithEmailAndPassword(this.auth, data.email, data.password)
    ).pipe(
      switchMap((cred: UserCredential) => {
        const uid = cred.user.uid;
        const user = cred.user;
        
        // Create user document in Firestore
        const userDoc: Omit<UserDoc, 'displayName'> = {
          uid,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          roles: ['user'],
          approved: false,
          blocked: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          authProvider: 'password',
          emailVerified: false
        };
        
        return this.fs.setDoc(`users/${uid}`, userDoc).pipe(
          switchMap(() => from(updateProfile(user, {
            displayName: `${data.firstName} ${data.lastName}`
          }))),
          switchMap(() => from(sendEmailVerification(user))),
          map(() => void 0)
        );
      }),
      catchError((error: Error) => {
        this.logger.error('AuthService', 'Registration error:', error);
        return throwError(() => error);
      })
    );
  }

  // Email actions
  resendVerificationEmail(): Observable<void> {
    const user = this.auth.currentUser;
    if (!user) {
      return throwError(() => new Error('No user is currently signed in'));
    }
    return from(sendEmailVerification(user));
  }

  resetPassword(email: string): Observable<void> {
    return from(sendPasswordResetEmail(this.auth, email));
  }

  refreshAndCheckEmail(): Observable<boolean> {
    const user = this.auth.currentUser;
    if (!user) {
      return of(false);
    }
    
    return from(user.reload()).pipe(
      map(() => user.emailVerified),
      catchError(() => of(false))
    );
  }

  getToken(forceRefresh = false): Observable<string | null> {
    const user = this.auth.currentUser;
    if (!user) {
      return of(null);
    }
    return from(user.getIdToken(forceRefresh));
  }

  // Cleanup
  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
    this.destroy$.next();
    this.destroy$.complete();
    this.logger.log('AuthService', 'Cleanup complete');
  }
}
