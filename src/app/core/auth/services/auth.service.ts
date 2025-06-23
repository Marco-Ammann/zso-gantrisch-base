import { Injectable, Inject }       from '@angular/core';
import { AngularFireAuth }          from '@angular/fire/compat/auth';
import { FirestoreService }         from '@core/services/firestore.service';
import { setDoc, docData }          from '@angular/fire/firestore';
import firebase                     from 'firebase/compat/app';
import { Observable, from, of }     from 'rxjs';
import { switchMap, map, shareReplay } from 'rxjs/operators';

import { APP_SETTINGS, AppSettings } from '@config/app-settings';

/* ---------- Modelle ---------- */
export interface RegisterData {
  firstName: string;
  lastName : string;
  email    : string;
  password : string;
}

export interface AppUserCombined {
  auth: firebase.User;
  doc : import('@core/models/user-doc').UserDoc;
}

/* ---------- Service ---------- */
@Injectable({ providedIn: 'root' })
export class AuthService {

  readonly user$:    Observable<firebase.User | null>;
  readonly appUser$: Observable<AppUserCombined | null>;

  constructor(
    private afAuth: AngularFireAuth,
    private fs    : FirestoreService,
    @Inject(APP_SETTINGS) private settings: AppSettings
  ) {

    this.user$ = this.afAuth.authState.pipe(
      shareReplay({ bufferSize: 1, refCount: false })
    );

    this.appUser$ = this.user$.pipe(
      switchMap(user => {
        if (!user) return of(null);
        const ref = this.fs.doc<import('@core/models/user-doc').UserDoc>(`users/${user.uid}`);
        return docData(ref).pipe(
          map(doc => (doc ? { auth: user, doc } : null))
        );
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
  }

  /* ---------- Auth ---------- */
  login(email: string, password: string, remember: boolean): Observable<void> {
    const persistence: 'local' | 'session' = remember ? 'local' : 'session';
    return from(this.afAuth.setPersistence(persistence)).pipe(
      switchMap(() => from(this.afAuth.signInWithEmailAndPassword(email, password))),
      switchMap(() => from(this.afAuth.currentUser)),
      switchMap(u => u ? from(u.reload()).pipe(map(() => void 0)) : of(void 0))
    );
  }

  logout(): Observable<void> {
    return from(this.afAuth.signOut());
  }

  /* ---------- Registrierung ---------- */
  register(data: RegisterData): Observable<void> {
    return from(this.afAuth.createUserWithEmailAndPassword(data.email, data.password)).pipe(
      switchMap(cred => {
        const uid = cred.user!.uid;

        const updateDisplay$ = from(
          cred.user!.updateProfile({ displayName: `${data.firstName} ${data.lastName}` })
        );

        const profileRef = this.fs.doc(`users/${uid}`);
        const now        = Date.now();
        const profile    = {
          uid,
          email: data.email,
          firstName: data.firstName,
          lastName : data.lastName,
          roles   : ['user'],
          approved: false,
          blocked : false,
          createdAt: now,
          updatedAt: now
        };
        const createProfile$ = from(setDoc(profileRef, profile));

        const verify$ = from(
          cred.user!.sendEmailVerification({
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
    return from(this.afAuth.currentUser).pipe(
      switchMap(u => u
        ? from(u.sendEmailVerification({ url: this.settings.verifyRedirect, handleCodeInApp: false }))
        : from(Promise.reject('Kein User angemeldet'))
      ),
      map(() => void 0)
    );
  }

  resetPassword(email: string): Observable<void> {
    return from(
      this.afAuth.sendPasswordResetEmail(email, { url: this.settings.resetRedirect, handleCodeInApp: false })
    ).pipe(map(() => void 0));
  }

  refreshAndCheckEmail(): Observable<boolean> {
    return from(this.afAuth.currentUser).pipe(
      switchMap(u => u ? from(u.reload().then(() => u.emailVerified)) : of(false))
    );
  }

  /* ---------- Token ---------- */
  getToken(): Promise<string> {
    return this.afAuth.currentUser.then(u => u ? u.getIdToken() : '');
  }
}
