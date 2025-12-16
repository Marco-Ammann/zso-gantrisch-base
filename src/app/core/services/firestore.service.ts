// src/app/core/services/firestore.service.ts
import {
  Injectable,
  inject,
  Injector,
  runInInjectionContext,
} from '@angular/core';
import { FirebaseApp } from '@angular/fire/app';
import {
  Firestore,
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  CollectionReference,
  DocumentReference,
  DocumentData,
} from '@angular/fire/firestore';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { APP_SETTINGS, AppSettings } from '@config/app-settings';
import { LoggerService } from '@core/services/logger.service';

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
    try {
      // For Firebase v11+, handle named database initialization more carefully
      this.db = getFirestore(firebaseApp, this.settings.firestoreDbId);
      this.logger.info(
        'Firestore',
        `verbunden mit „${this.settings.firestoreDbId}"`
      );
    } catch (error) {
      console.error('Firestore initialization error:', error);
      // Fallback to default database if named database fails
      this.db = getFirestore(firebaseApp);
      this.logger.warn(
        'Firestore',
        `Fallback to default database due to error: ${error}`
      );
    }
  }

  /* ---------- Convenience ---------- */

  col<T = unknown>(path: string): CollectionReference<T> {
    return runInInjectionContext(
      this.injector,
      () => collection(this.db, path) as CollectionReference<T>
    );
  }

  doc<T = unknown>(path: string): DocumentReference<T> {
    return runInInjectionContext(
      this.injector,
      () => doc(this.db, path) as DocumentReference<T>
    );
  }

  /**
   * Get a document from Firestore
   * @param path Path to the document (e.g., 'users/123')
   * @returns Observable with the document data including ID or null if not found
   */
  getDoc<T = DocumentData>(
    path: string
  ): Observable<(T & { id: string }) | null> {
    const docRef = this.doc(path);
    return from(getDoc(docRef)).pipe(
      map((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as T;
          // Include the document ID in the returned data
          return { ...data, id: docSnap.id } as T & { id: string };
        }
        return null;
      }),
      catchError((error) => {
        this.logger.error(
          'FirestoreService',
          `Error getting document ${path}:`,
          error
        );
        return of(null);
      })
    );
  }

  /**
   * Set a document in Firestore
   * @param path Path to the document (e.g., 'users/123')
   * @param data Document data to set
   * @param merge Whether to merge with existing document
   * @returns Observable that completes when the operation is done
   */
  setDoc<T = DocumentData>(
    path: string,
    data: T,
    merge = true
  ): Observable<void> {
    const docRef = this.doc(path);
    return from(setDoc(docRef, data as any, { merge })).pipe(
      catchError((error) => {
        this.logger.error(
          'FirestoreService',
          `Error setting document ${path}:`,
          error
        );
        return throwError(() => error);
      })
    );
  }

  /**
   * Update a document in Firestore
   * @param path Path to the document (e.g., 'users/123')
   * @param data Partial document data to update
   * @returns Observable that completes when the operation is done
   */
  updateDoc<T = DocumentData>(
    path: string,
    data: Partial<T>
  ): Observable<void> {
    const docRef = this.doc(path);
    return from(updateDoc(docRef, data as any)).pipe(
      catchError((error) => {
        this.logger.error(
          'FirestoreService',
          `Error updating document ${path}:`,
          error
        );
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete a document from Firestore
   * @param path Path to the document (e.g., 'users/123')
   * @returns Observable that completes when the operation is done
   */
  deleteDoc(path: string): Observable<void> {
    const docRef = this.doc(path);
    return from(deleteDoc(docRef)).pipe(
      catchError((error) => {
        this.logger.error(
          'FirestoreService',
          `Error deleting document ${path}:`,
          error
        );
        return throwError(() => error);
      })
    );
  }
}
