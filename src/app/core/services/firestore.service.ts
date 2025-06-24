import { Injectable, inject } from '@angular/core';
import { FirebaseApp }        from '@angular/fire/app';
import {
  Firestore, getFirestore,
  collection, doc,
  CollectionReference, DocumentReference
} from '@angular/fire/firestore';

import { APP_SETTINGS, AppSettings } from '../config/app-settings';

/**
 * Wrapper um eine **benannte** Firestore-Instanz.
 * Datenbank-ID stammt zentral aus `APP_SETTINGS`.
 */
@Injectable({ providedIn: 'root' })
export class FirestoreService {

  /** Handle auf die konfigurierte Firestore-DB */
  readonly db: Firestore;

  private readonly settings: AppSettings = inject(APP_SETTINGS);

  constructor(firebaseApp: FirebaseApp) {
    this.db = getFirestore(firebaseApp, this.settings.firestoreDbId);
    console.info(`[Firestore] verbunden mit „${this.settings.firestoreDbId}“`);
  }

  /* ---------- Convenience ---------- */

  col<T = unknown>(path: string): CollectionReference<T> {
    return collection(this.db, path) as CollectionReference<T>;
  }

  doc<T = unknown>(path: string): DocumentReference<T> {
    return doc(this.db, path) as DocumentReference<T>;
  }
}
