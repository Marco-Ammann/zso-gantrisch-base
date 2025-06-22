import { Injectable } from '@angular/core';
import { FirestoreService } from '@core/services/firestore.service';
import { setDoc, docData } from '@angular/fire/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import firebase from 'firebase/compat/app';
import { Observable, from, of } from 'rxjs';
import { switchMap, map, shareReplay } from 'rxjs/operators';

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface AppUserCombined {
  auth: firebase.User;
  doc: import('@core/models/user-doc').UserDoc;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Typ auf firebase.User korrigiert, entspricht dem Rückgabetyp von AngularFireAuth (compat)
  user$: Observable<firebase.User | null>;

  appUser$: Observable<AppUserCombined | null>;

  constructor(private afAuth: AngularFireAuth, private fs: FirestoreService) {
    this.user$ = this.afAuth.authState.pipe(
      shareReplay({ bufferSize: 1, refCount: false })
    );

    // Combine Firebase auth user with Firestore user document
    this.appUser$ = this.user$.pipe(
      switchMap(user => {
        if (!user) return of(null);
        const docRef = this.fs.doc<import('@core/models/user-doc').UserDoc>(`users/${user.uid}`);
        return docData(docRef).pipe(
          map(doc => (doc ? { auth: user, doc } as AppUserCombined : null))
        );
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
  }

  login(
    email: string,
    password: string,
    rememberMe: boolean
  ): Observable<void> {
    // AngularFireCompat erwartet hier String-Literals 'local' | 'session'
    const persistence: 'local' | 'session' = rememberMe ? 'local' : 'session';
    return from(this.afAuth.setPersistence(persistence)).pipe(
      switchMap(() =>
        from(this.afAuth.signInWithEmailAndPassword(email, password)).pipe(
          switchMap(() => from(this.afAuth.currentUser)),
          switchMap(user => user ? from(user.reload()).pipe(map(() => void 0)) : of(void 0))
        )
      ),
      map(() => void 0)
    );
  }

  logout(): Observable<void> {
    return from(this.afAuth.signOut());
  }

  register(data: RegisterData): Observable<void> {
    return from(
      this.afAuth.createUserWithEmailAndPassword(data.email, data.password)
    ).pipe(
      switchMap(cred => {
        const uid = cred.user!.uid;
        // Update display name
        const updateDisplay$ = from(cred.user!.updateProfile({
          displayName: `${data.firstName} ${data.lastName}`
        }));
        // Create user profile document in Firestore (named DB)
        const profileDoc = this.fs.doc(`users/${uid}`);
        const now = Date.now();
        const userData = {
          uid,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          roles: ['user'],
          approved: false,
          blocked: false,
          createdAt: now,
          updatedAt: now
        } as const;
        const createProfile$ = from(setDoc(profileDoc, userData));
        console.log('[AuthService] register: created profile', userData);
        // Send email verification
        const actionCodeSettings = {
          url: `${location.origin}/auth/verify-email-success`,
          handleCodeInApp: false
        } as const;
        const verifyEmail$ = from(cred.user!.sendEmailVerification(actionCodeSettings));
        return updateDisplay$.pipe(
          switchMap(() => createProfile$),
          switchMap(() => verifyEmail$)
        );
      }),
      map(() => void 0)
    );
  }

  /**
   * Liefert das aktuelle ID-Token des eingeloggten Users.
   * Wird vom AuthInterceptor verwendet.
   */
  /** Sends another verification email to current user */
  resendVerificationEmail(): Observable<void> {
    return from(this.afAuth.currentUser).pipe(
      switchMap(user => user ? from(user.sendEmailVerification({ url: `${location.origin}/auth/verify-email-success`, handleCodeInApp: false })) : from(Promise.reject('Kein User angemeldet'))),
      map(() => void 0)
    );
  }

  /** Reloads user from Firebase and returns whether email is verified */
  refreshAndCheckEmail(): Observable<boolean> {
    return from(this.afAuth.currentUser).pipe(
      switchMap(user => user ? from(user.reload().then(() => user.emailVerified)) : from(Promise.resolve(false)))
    );
  }

  getToken(): Promise<string> {
    return this.afAuth.currentUser.then(user =>
      user ? user.getIdToken() : ''
    );
  }
}
