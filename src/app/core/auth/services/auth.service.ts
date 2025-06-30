// src/app/core/auth/services/auth.service.ts - Simplified ohne setPersistence
import { Injectable, OnDestroy } from '@angular/core';
import { 
  Auth, 
  User, 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  sendEmailVerification, 
  updateProfile, 
  onAuthStateChanged,
  UserCredential 
} from '@angular/fire/auth';
import { Observable, of, throwError, Subject, from, BehaviorSubject, combineLatest } from 'rxjs';
import { catchError, map, shareReplay, switchMap, take, takeUntil, tap, distinctUntilChanged } from 'rxjs/operators';

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
  // State management
  private readonly authState$ = new BehaviorSubject<User | null>(null);
  private readonly userDoc$ = new BehaviorSubject<UserDoc | null>(null);
  private readonly destroy$ = new Subject<void>();
  
  // Public observables
  readonly user$: Observable<User | null>;
  readonly appUser$: Observable<AppUserCombined | null>;
  
  // Cache für Performance
  private lastActiveUpdate = 0;
  private readonly UPDATE_INTERVAL = 5 * 60 * 1000; // 5 Minuten

  constructor(
    private readonly auth: Auth,
    private readonly fs: FirestoreService,
    private readonly logger: LoggerService,
    private readonly userService: UserService
  ) {
    this.initializeAuth();
    this.user$ = this.authState$.asObservable();
    this.appUser$ = this.createAppUserObservable();
  }

  private initializeAuth(): void {
    // Firebase Auth behält automatisch die Session bei (Local Storage by default)
    // Kein manuelles setPersistence nötig - Firebase entscheidet automatisch
    
    onAuthStateChanged(this.auth, user => {
      this.authState$.next(user);
      
      if (user) {
        this.logger.log('AuthService', 'User authenticated:', user.email);
        this.loadUserDoc(user.uid);
        this.updateLastActiveIfNeeded(user.uid);
      } else {
        this.logger.log('AuthService', 'User signed out');
        this.userDoc$.next(null);
      }
    }, error => {
      this.logger.error('AuthService', 'Auth state error:', error);
      this.authState$.next(null);
      this.userDoc$.next(null);
    });
  }

  private createAppUserObservable(): Observable<AppUserCombined | null> {
    return combineLatest([
      this.authState$,
      this.userDoc$
    ]).pipe(
      map(([auth, doc]) => {
        if (!auth || !doc) return null;
        return { auth, doc } as AppUserCombined;
      }),
      distinctUntilChanged((a, b) => 
        a?.auth.uid === b?.auth.uid && 
        a?.doc.updatedAt === b?.doc.updatedAt
      ),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  private loadUserDoc(uid: string): void {
    this.fs.getDoc<UserDoc>(`users/${uid}`).pipe(
      take(1),
      catchError(error => {
        this.logger.error('AuthService', 'Error loading user doc:', error);
        return of(null);
      })
    ).subscribe({
      next: doc => {
        if (doc) {
          this.userDoc$.next(doc);
        } else {
          this.logger.warn('AuthService', `No user document found for uid: ${uid}`);
        }
      }
    });
  }

  private updateLastActiveIfNeeded(uid: string): void {
    const now = Date.now();
    if (now - this.lastActiveUpdate > this.UPDATE_INTERVAL) {
      this.lastActiveUpdate = now;
      
      this.userService.updateLastActiveAt(uid).pipe(
        take(1),
        catchError(error => {
          this.logger.error('AuthService', 'Error updating last active:', error);
          return of(null);
        })
      ).subscribe();
    }
  }

  // Simplified login without manual persistence management
  login(email: string, password: string, rememberMe: boolean): Observable<void> {
    this.logger.log('AuthService', `Login attempt for ${email}`, { rememberMe });
    
    // Firebase Auth automatically persists to local storage by default
    // The rememberMe parameter is logged but Firebase handles persistence
    
    return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap(({ user }) => {
        // Update last login timestamp
        const updateData = {
          lastLoginAt: Date.now(),
          updatedAt: Date.now()
        };
        
        return this.fs.updateDoc(`users/${user.uid}`, updateData).pipe(
          tap(() => {
            this.logger.log('AuthService', `Login successful for ${email}`);
            this.loadUserDoc(user.uid);
          }),
          map(() => void 0),
          catchError(error => {
            this.logger.error('AuthService', 'Error updating last login:', error);
            return of(void 0);
          })
        );
      }),
      catchError(error => {
        this.logger.error('AuthService', 'Login error:', error);
        return throwError(() => error);
      })
    );
  }

  logout(): Observable<void> {
    this.logger.log('AuthService', 'Logging out user');
    
    const uid = this.auth.currentUser?.uid;
    
    return from(signOut(this.auth)).pipe(
      switchMap(() => {
        if (!uid) return of(void 0);
        
        return this.fs.updateDoc(`users/${uid}`, {
          lastLogoutAt: Date.now(),
          updatedAt: Date.now()
        }).pipe(
          catchError(error => {
            this.logger.error('AuthService', 'Error updating last logout:', error);
            return of(void 0);
          })
        );
      }),
      tap(() => {
        this.authState$.next(null);
        this.userDoc$.next(null);
        this.logger.log('AuthService', 'Logout successful');
      }),
      catchError(error => {
        this.logger.error('AuthService', 'Logout error:', error);
        return throwError(() => error);
      })
    );
  }

  register(data: RegisterData): Observable<void> {
    return from(
      createUserWithEmailAndPassword(this.auth, data.email, data.password)
    ).pipe(
      switchMap((cred: UserCredential) => {
        const { uid, email } = cred.user;
        
        const userDoc: UserDoc = {
          uid,
          email: email || data.email,
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
          switchMap(() => from(updateProfile(cred.user, {
            displayName: `${data.firstName} ${data.lastName}`
          }))),
          switchMap(() => from(sendEmailVerification(cred.user))),
          map(() => void 0)
        );
      }),
      catchError(error => {
        this.logger.error('AuthService', 'Registration error:', error);
        return throwError(() => error);
      })
    );
  }

  // Email verification methods
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
    if (!user) return of(false);
    
    return from(user.reload()).pipe(
      map(() => user.emailVerified),
      tap(verified => {
        if (verified && this.userDoc$.value) {
          this.userDoc$.next({
            ...this.userDoc$.value,
            emailVerified: true
          });
        }
      }),
      catchError(() => of(false))
    );
  }

  async getToken(forceRefresh = false): Promise<string | null> {
    const user = this.auth.currentUser;
    if (!user) return null;
    
    try {
      return await user.getIdToken(forceRefresh);
    } catch (error) {
      this.logger.error('AuthService', 'Error getting token:', error);
      return null;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.authState$.complete();
    this.userDoc$.complete();
    this.logger.log('AuthService', 'Service destroyed and cleaned up');
  }
}