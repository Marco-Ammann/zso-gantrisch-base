import { Injectable } from '@angular/core';
import { FirestoreService } from '@core/services/firestore.service';
import { setDoc } from '@angular/fire/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import firebase from 'firebase/compat/app';
import { Observable, from } from 'rxjs';
import { switchMap, map, shareReplay } from 'rxjs/operators';

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Typ auf firebase.User korrigiert, entspricht dem Rückgabetyp von AngularFireAuth (compat)
  user$: Observable<firebase.User | null>;

  constructor(private afAuth: AngularFireAuth, private fs: FirestoreService) {
    this.user$ = this.afAuth.authState.pipe(
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
        from(this.afAuth.signInWithEmailAndPassword(email, password))
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
        const createProfile$ = from(setDoc(profileDoc, {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          createdAt: Date.now()
        }));
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
