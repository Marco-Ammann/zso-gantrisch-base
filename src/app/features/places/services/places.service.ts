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
import { catchError, filter, map, switchMap, take, takeUntil } from 'rxjs/operators';

import {
  PlaceDoc,
  PlacesStats,
  PlaceType,
} from '@core/models/place.model';
import { FirestoreService } from '@core/services/firestore.service';
import { LoggerService } from '@core/services/logger.service';
import { AuthService } from '@core/auth/services/auth.service';
import { ActivityLogService, applyDeepPatch } from '@core/services/activity-log.service';
import { User } from '@angular/fire/auth';

@Injectable({ providedIn: 'root' })
export class PlacesService implements OnDestroy {
  private readonly injector = inject(Injector);
  private readonly logger = inject(LoggerService);
  private readonly authService = inject(AuthService);
  private readonly activityLog = inject(ActivityLogService);
  private readonly destroy$ = new Subject<void>();

  constructor(private firestoreService: FirestoreService) { }

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

  private requireUser(): Observable<User> {
    return this.authService.user$.pipe(
      filter((u): u is User => !!u),
      take(1)
    );
  }

  /** Ort erstellen */
  create(
    placeData: Omit<
      PlaceDoc,
      'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'notes'
    > &
      Partial<Pick<PlaceDoc, 'notes'>>
  ): Observable<string> {
    return runInInjectionContext(this.injector, () => {
      const placesCol = collection(this.firestoreService.db, 'places');
      const timestamp = Date.now();
      return this.requireUser().pipe(
        switchMap((user) =>
          from(
            addDoc(placesCol, {
              ...placeData,
              notes: placeData.notes ?? [],
              createdBy: user.uid,
              updatedBy: user.uid,
              createdAt: timestamp,
              updatedAt: timestamp,
            })
          )
        ),
        switchMap((docRef) =>
          this.activityLog
            .logCreate(`places:${docRef.id}`, {
              ...(placeData as any),
              id: docRef.id,
              notes: placeData.notes ?? [],
              createdBy: '***',
              updatedBy: '***',
              createdAt: timestamp,
              updatedAt: timestamp,
            })
            .pipe(map(() => docRef.id))
        ),
        takeUntil(this.destroy$)
      );
    });
  }

  /** Ort aktualisieren */
  update(id: string, updates: Partial<PlaceDoc>): Observable<void> {
    return runInInjectionContext(this.injector, () => {
      const placeDoc = doc(this.firestoreService.db, `places/${id}`);
      const now = Date.now();
      return this.requireUser().pipe(
        switchMap((user) =>
          this.firestoreService.getDoc<PlaceDoc>(`places/${id}`).pipe(
            take(1),
            switchMap((before) => {
              const payload = {
                ...updates,
                updatedAt: now,
                updatedBy: user.uid,
              } as any;

              const after = applyDeepPatch((before ?? ({} as any)) as any, payload);

              return from(updateDoc(placeDoc, payload)).pipe(
                switchMap(() => this.activityLog.logUpdate(`places:${id}`, before, after)),
                map(() => void 0)
              );
            })
          )
        ),
        takeUntil(this.destroy$)
      );
    });
  }

  /** Ort löschen */
  delete(id: string): Observable<void> {
    return runInInjectionContext(this.injector, () => {
      const placeDocRef = doc(this.firestoreService.db, `places/${id}`);

      return this.firestoreService.getDoc<PlaceDoc>(`places/${id}`).pipe(
        take(1),
        switchMap((before) =>
          from(deleteDoc(placeDocRef)).pipe(
            switchMap(() => this.activityLog.logDelete(`places:${id}`, before)),
            map(() => void 0)
          )
        ),
        takeUntil(this.destroy$)
      );
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
