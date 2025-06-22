import { Injectable } from '@angular/core';
import { FirebaseApp } from '@angular/fire/app';
import { Firestore, getFirestore, collection, doc, CollectionReference, DocumentReference } from '@angular/fire/firestore';
import { APP_SETTINGS } from '../config/app-settings';

/**
 * Thin wrapper that exposes a **named** Firestore DB instance (e.g. `zso-base`).
 * Keeps all Firestore access in one place so we can adjust the database ID
 * from `app-settings.ts` without touching multiple files.
 */
@Injectable({ providedIn: 'root' })
export class FirestoreService {
  /** Handle to the named Firestore database */
  readonly db: Firestore;

  constructor(app: FirebaseApp) {
    this.db = getFirestore(app, APP_SETTINGS.firestoreDbId);
    // eslint-disable-next-line no-console
    console.info(`Connected to '${APP_SETTINGS.firestoreDbId}' Firestore database.`);
  }

  /** Convenience helpers */
  col<T = unknown>(path: string): CollectionReference<T> {
    return collection(this.db, path) as CollectionReference<T>;
  }

  doc<T = unknown>(path: string): DocumentReference<T> {
    return doc(this.db, path) as DocumentReference<T>;
  }
}
