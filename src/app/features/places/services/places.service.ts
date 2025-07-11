// src/app/features/places/services/places.service.ts
// Provides CRUD operations for Place documents in Firestore.

import {
  Injectable,
  inject,
  Injector,
  runInInjectionContext,
  OnDestroy,
} from '@angular/core';
import {
  collection,
  collectionData,
  doc,
  query,
  orderBy,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
} from '@angular/fire/firestore';
import { Observable, from, of, Subject } from 'rxjs';
import { catchError, map, takeUntil } from 'rxjs/operators';

import {
  PlaceDoc,
  PlacesStats,
  PlaceType,
} from '@core/models/place.model';
import { FirestoreService } from '@core/services/firestore.service';
import { LoggerService } from '@core/services/logger.service';

@Injectable({ providedIn: 'root' })
export class PlacesService implements OnDestroy {
  private readonly injector = inject(Injector);
  private readonly logger = inject(LoggerService);
  private readonly destroy$ = new Subject<void>();

  constructor(private firestoreService: FirestoreService) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Alle Orte laden */
  getAll(): Observable<PlaceDoc[]> {
    return runInInjectionContext(this.injector, () => {
      const placesCol = collection(this.firestoreService.db, 'places');
      const q = query(placesCol, orderBy('name', 'asc'));
      return collectionData(q, { idField: 'id' }).pipe(
        map((docs) => docs as PlaceDoc[]),
        catchError((error) => {
          this.logger.error('PlacesService', 'getAll failed', error);
          return of([]);
        }),
        takeUntil(this.destroy$)
      );
    });
  }

  getById(id: string): Observable<PlaceDoc | null> {
    return this.firestoreService.getDoc<PlaceDoc>(`places/${id}`);
  }

  /** Ort erstellen */
  create(placeData: Omit<PlaceDoc, 'id' | 'createdAt' | 'updatedAt'>): Observable<string> {
    return runInInjectionContext(this.injector, () => {
      const placesCol = collection(this.firestoreService.db, 'places');
      const timestamp = Date.now();
      return from(
        addDoc(placesCol, {
          ...placeData,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
      ).pipe(
        map((docRef) => docRef.id),
        takeUntil(this.destroy$)
      );
    });
  }

  /** Ort aktualisieren */
  update(id: string, updates: Partial<PlaceDoc>): Observable<void> {
    return runInInjectionContext(this.injector, () => {
      const placeDoc = doc(this.firestoreService.db, `places/${id}`);
      return from(
        updateDoc(placeDoc, {
          ...updates,
          updatedAt: Date.now(),
        })
      ).pipe(takeUntil(this.destroy$));
    });
  }

  /** Ort löschen */
  delete(id: string): Observable<void> {
    return runInInjectionContext(this.injector, () => {
      const placeDocRef = doc(this.firestoreService.db, `places/${id}`);
      return from(deleteDoc(placeDocRef)).pipe(takeUntil(this.destroy$));
    });
  }

  /** Statistiken berechnen */
  getStats(): Observable<PlacesStats> {
    return this.getAll().pipe(
      map((places) => {
        const stats: PlacesStats = {
          total: places.length,
          byType: {
            accommodation: 0,
            civil_protection_facility: 0,
            training_room: 0,
            other: 0,
          } as Record<PlaceType, number>,
          available: 0, // placeholder – availability logic can be added later
          withCapacity: 0,
        };

        places.forEach((p) => {
          stats.byType[p.type] = (stats.byType[p.type] || 0) + 1;
          if (p.availability) stats.available += 1;
          if (p.capacity?.maxPersons) stats.withCapacity += 1;
        });

        return stats;
      })
    );
  }
}
