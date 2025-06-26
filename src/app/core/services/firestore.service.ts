// src/app/core/services/firestore.service.ts
import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import { FirebaseApp } from '@angular/fire/app';
import {
  Firestore, getFirestore,
  collection, doc,
  CollectionReference, DocumentReference
} from '@angular/fire/firestore';

import { APP_SETTINGS, AppSettings } from '../config/app-settings';
import { LoggerService } from '@shared/services/logger.service';

/**
 * Wrapper um eine **benannte** Firestore-Instanz.
 * Datenbank-ID stammt zentral aus `APP_SETTINGS`.
 */
@Injectable({ providedIn: 'root' })
export class FirestoreService {
  /** Handle auf die konfigurierte Firestore-DB */
  readonly db: Firestore;
  private injector = inject(Injector);
  private logger = inject(LoggerService);

  private readonly settings: AppSettings = inject(APP_SETTINGS);

  constructor(firebaseApp: FirebaseApp) {
    this.db = getFirestore(firebaseApp, this.settings.firestoreDbId);
    this.logger.info('Firestore', `verbunden mit „${this.settings.firestoreDbId}"`);
  }

  /* ---------- Convenience ---------- */

  col<T = unknown>(path: string): CollectionReference<T> {
    return runInInjectionContext(this.injector, () =>
      collection(this.db, path) as CollectionReference<T>
    );
  }

  doc<T = unknown>(path: string): DocumentReference<T> {
    return runInInjectionContext(this.injector, () =>
      doc(this.db, path) as DocumentReference<T>
    );
  }
}