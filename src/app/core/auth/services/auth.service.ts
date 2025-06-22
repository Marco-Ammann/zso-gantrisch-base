import { Injectable } from '@angular/core';
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

  constructor(private afAuth: AngularFireAuth) {
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
      switchMap(cred =>
        from(
          cred.user!.updateProfile({
            displayName: `${data.firstName} ${data.lastName}`
          })
        )
      ),
      map(() => void 0)
    );
  }

  /**
   * Liefert das aktuelle ID-Token des eingeloggten Users.
   * Wird vom AuthInterceptor verwendet.
   */
  getToken(): Promise<string> {
    return this.afAuth.currentUser.then(user =>
      user ? user.getIdToken() : ''
    );
  }
}
