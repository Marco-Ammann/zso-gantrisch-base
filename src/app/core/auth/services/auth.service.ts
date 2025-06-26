// src/app/core/auth/services/auth.service.ts
import { Injectable, Inject, inject, Injector, runInInjectionContext } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  authState,
  setPersistence
} from '@angular/fire/auth';
import { User, browserSessionPersistence } from 'firebase/auth';
import { FirestoreService } from '@core/services/firestore.service';
import { setDoc, docData } from '@angular/fire/firestore';
import { Observable, from, of, throwError } from 'rxjs';
import { switchMap, map, shareReplay, catchError } from 'rxjs/operators';

import { APP_SETTINGS, AppSettings } from '@core/config/app-settings';
import { LoggerService } from '@core/services/logger.service';

/* ---------- Modelle ---------- */
export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface AppUserCombined {
  auth: User;
  doc: import('@core/models/user-doc').UserDoc;
}

/* ---------- Service ---------- */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private injector = inject(Injector);
  private logger = inject(LoggerService);

  readonly user$: Observable<User | null>;
  readonly appUser$: Observable<AppUserCombined | null>;

  constructor(
    private fs: FirestoreService,
    @Inject(APP_SETTINGS) private settings: AppSettings
  ) {

    this.user$ = runInInjectionContext(this.injector, () => 
      authState(this.auth).pipe(
        shareReplay({ bufferSize: 1, refCount: false })
      )
    );

    this.appUser$ = this.user$.pipe(
      switchMap(user => {
        if (!user) return of(null);
        try {
          const ref = this.fs.doc<import('@core/models/user-doc').UserDoc>(`users/${user.uid}`);
          return runInInjectionContext(this.injector, () =>
            docData<import('@core/models/user-doc').UserDoc>(ref).pipe(
              map(doc => (doc ? ({ auth: user, doc } as AppUserCombined) : null))
            )
          );
        } catch (error) {
          this.logger.error('AuthService', 'Error creating user document reference:', error);
          return of(null);
        }
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
  }

  /* ---------- Auth ---------- */
  login(email: string, password: string, remember: boolean): Observable<void> {
    this.logger.log('AuthService', 'Login attempt', { email, remember });
    
    try {
      return runInInjectionContext(this.injector, () => {
        return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
          switchMap(() => {
            this.logger.log('AuthService', 'Persistence set, attempting sign in');
            return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
              map((result) => {
                this.logger.log('AuthService', 'Sign in successful', result.user?.email);
                return result;
              }),
              catchError(error => {
                this.logger.error('AuthService', 'Sign in failed:', error);
                return throwError(error);
              })
            );
          }),
          switchMap(() => {
            this.logger.log('AuthService', 'Sign in successful, reloading user');
            const user = this.auth.currentUser;
            return user ? from(user.reload()).pipe(map(() => void 0)) : of(void 0);
          }),
          map(() => {
            this.logger.log('AuthService', 'Login completed successfully');
            return void 0;
          })
        );
      });
    } catch (error) {
      this.logger.error('AuthService', 'Login error:', error);
      return from(Promise.reject(error));
    }
  }

  logout(): Observable<void> {
    return from(signOut(this.auth));
  }

  /* ---------- Registrierung ---------- */
  register(data: RegisterData): Observable<void> {
    return from(createUserWithEmailAndPassword(this.auth, data.email, data.password)).pipe(
      switchMap(cred => {
        const uid = cred.user.uid;
        const user = cred.user;

        const updateDisplay$ = from(
          updateProfile(user, { displayName: `${data.firstName} ${data.lastName}` })
        );

        const profileRef = this.fs.doc(`users/${uid}`);
        const now = Date.now();
        const profile = {
          uid,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          roles: ['user'],
          approved: false,
          blocked: false,
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now,
          lastLogoutAt: now,
          lastActiveAt: now,
          lastInactiveAt: now,
        };
        const createProfile$ = runInInjectionContext(this.injector, () => 
          from(setDoc(profileRef, profile))
        );

        const verify$ = from(
          sendEmailVerification(user, {
            url: this.settings.verifyRedirect,
            handleCodeInApp: false
          })
        );

        return updateDisplay$.pipe(
          switchMap(() => createProfile$),
          switchMap(() => verify$)
        );
      }),
      map(() => void 0)
    );
  }

  /* ---------- E-Mail-Aktionen ---------- */
  resendVerificationEmail(): Observable<void> {
    const user = this.auth.currentUser;
    if (!user) {
      return from(Promise.reject('Kein User angemeldet'));
    }
    
    return from(
      sendEmailVerification(user, { 
        url: this.settings.verifyRedirect, 
        handleCodeInApp: false 
      })
    ).pipe(map(() => void 0));
  }

  resetPassword(email: string): Observable<void> {
    return from(
      sendPasswordResetEmail(this.auth, email, { 
        url: this.settings.resetRedirect, 
        handleCodeInApp: false 
      })
    ).pipe(map(() => void 0));
  }

  refreshAndCheckEmail(): Observable<boolean> {
    const user = this.auth.currentUser;
    if (!user) return of(false);
    
    return from(user.reload().then(() => user.emailVerified));
  }

  /* ---------- Token ---------- */
  getToken(): Promise<string> {
    return this.auth.currentUser?.getIdToken() || Promise.resolve('');
  }
}