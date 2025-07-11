// src/app/features/orte/services/orte.service.ts
import {
  Injectable,
  inject,
  Injector,
  OnDestroy,
  runInInjectionContext,
} from '@angular/core';
import {
  collection,
  collectionData,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Observable, from, of, Subject, throwError } from 'rxjs';
import { map, catchError, takeUntil, take, switchMap } from 'rxjs/operators';

import { FirestoreService } from '@core/services/firestore.service';
import { LoggerService } from '@core/services/logger.service';
import { StateManagementService } from '@core/services/state-management.service';
import {
  OrtDoc,
  OrtTyp,
  NotizEintrag,
  OrteStats,
} from '../models/ort.model';

@Injectable({ providedIn: 'root' })
export class OrteService implements OnDestroy {
  private readonly injector = inject(Injector);
  private readonly logger = inject(LoggerService);
  private readonly firestoreService = inject(FirestoreService);
  private readonly stateService = inject(StateManagementService);
  private readonly destroy$ = new Subject<void>();

  private readonly collectionPath = 'orte';

  /** Public Streams */
  readonly orte$: Observable<OrtDoc[]> = this.getAllOrte();

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.logger.log('OrteService', 'Service destroyed');
  }

  /* -------------------------------------------------- */
  /* CRUD                                               */
  /* -------------------------------------------------- */

  /**
   * Alle Orte laden (alphabetisch nach Bezeichnung)
   */
  getAllOrte(): Observable<OrtDoc[]> {
    return runInInjectionContext(this.injector, () => {
      try {
        const orteCol = collection(this.firestoreService.db, this.collectionPath);
        const orteQuery = query(orteCol, orderBy('bezeichnung', 'asc'));

        return collectionData(orteQuery, { idField: 'id' }).pipe(
          map((docs) => docs as OrtDoc[]),
          catchError((error) => {
            this.logger.error('OrteService', 'Fehler beim Laden der Orte:', error);
            return of([]);
          }),
          takeUntil(this.destroy$)
        );
      } catch (err) {
        this.logger.error('OrteService', 'Query-Initialisierung fehlgeschlagen', err);
        return of([]);
      }
    });
  }

  /**
   * Einzelnen Ort laden
   */
  getById(id: string): Observable<OrtDoc | null> {
    if (!id) return of(null);

    return this.firestoreService.getDoc<OrtDoc>(`${this.collectionPath}/${id}`).pipe(
      catchError((error) => {
        this.logger.error('OrteService', `Fehler beim Laden von Ort ${id}:`, error);
        return of(null);
      })
    );
  }

  /**
   * Nach Ortstyp filtern
   */
  getByTyp(typ: OrtTyp): Observable<OrtDoc[]> {
    try {
      const orteCol = collection(this.firestoreService.db, this.collectionPath);
      const constraints = [] as any[];
      if (typ !== undefined && typ !== null) {
        constraints.push(where('typ', '==', typ));
      }
      const typQuery = query(orteCol, ...constraints);
      return collectionData(typQuery, { idField: 'id' }).pipe(map((d) => d as OrtDoc[]));
    } catch (err) {
      this.logger.error('OrteService', 'getByTyp fehlgeschlagen', err);
      return of([]);
    }
  }

  /**
   * Neuen Ort erstellen
   */
  create(
    ortData: Omit<OrtDoc, 'id' | 'erstelltAm' | 'aktualisiertAm' | 'erstelltVon' | 'aktualisiertVon'>
  ): Observable<string> {
    this.logger.log('OrteService', 'Erstelle Ort', ortData.bezeichnung);

    return runInInjectionContext(this.injector, () => {
      const orteCol = collection(this.firestoreService.db, this.collectionPath);
      const currentUserId = this.authUserId();

      return from(
        addDoc(orteCol, {
          ...ortData,
          erstelltAm: Date.now(),
          aktualisiertAm: Date.now(),
          erstelltVon: currentUserId,
          aktualisiertVon: currentUserId,
        })
      ).pipe(
        map((docRef) => docRef.id),
        catchError((error) => {
          this.logger.error('OrteService', 'Fehler beim Erstellen des Ortes:', error);
          return throwError(() => error);
        }),
        takeUntil(this.destroy$)
      );
    });
  }

  /**
   * Ort aktualisieren
   */
  update(id: string, updates: Partial<OrtDoc>): Observable<void> {
    this.logger.log('OrteService', 'Aktualisiere Ort', { id, updates });
    return runInInjectionContext(this.injector, () => {
      const ortDoc = doc(this.firestoreService.db, `${this.collectionPath}/${id}`);
      const currentUserId = this.authUserId();

      return from(
        updateDoc(ortDoc, {
          ...updates,
          aktualisiertAm: Date.now(),
          aktualisiertVon: currentUserId,
        })
      ).pipe(takeUntil(this.destroy$));
    });
  }

  /**
   * Ort löschen (Hinweis: Verknüpfungen prüfen)
   */
  delete(id: string): Observable<void> {
    this.logger.log('OrteService', 'Lösche Ort', id);
    return runInInjectionContext(this.injector, () => {
      const ortDoc = doc(this.firestoreService.db, `${this.collectionPath}/${id}`);
      return from(deleteDoc(ortDoc)).pipe(takeUntil(this.destroy$));
    });
  }

  /* -------------------------------------------------- */
  /* Notizen                                            */
  /* -------------------------------------------------- */

  private generateNotizId(): string {
    return crypto.randomUUID();
  }

  addNotiz(ortId: string, notizText: string): Observable<void> {
    const notiz: NotizEintrag = {
      id: this.generateNotizId(),
      text: notizText,
      erstelltAm: Date.now(),
      erstelltVon: this.authUserId(),
    };

    return this.getById(ortId).pipe(
      take(1),
      switchMap((ort) => {
        const current = ort?.notizen ?? [];
        return this.update(ortId, { notizen: [...current, notiz] });
      })
    );
  }

  updateNotiz(ortId: string, notizId: string, neuerText: string): Observable<void> {
    return this.getById(ortId).pipe(
      take(1),
      switchMap((ort) => {
        if (!ort) return of(void 0);
        const notizen = ort.notizen.map((n) =>
          n.id === notizId ? { ...n, text: neuerText, aktualisiertAm: Date.now(), aktualisiertVon: this.authUserId() } : n
        );
        return this.update(ortId, { notizen });
      })
    );
  }

  deleteNotiz(ortId: string, notizId: string): Observable<void> {
    return this.getById(ortId).pipe(
      take(1),
      switchMap((ort) => {
        if (!ort) return of(void 0);
        const notizen = ort.notizen.filter((n) => n.id !== notizId);
        return this.update(ortId, { notizen });
      })
    );
  }

  /* -------------------------------------------------- */
  /* Stats                                              */
  /* -------------------------------------------------- */

  getStats(): Observable<OrteStats> {
    return this.getAllOrte().pipe(
      map((orte) => {
        const stats: OrteStats = {
          total: orte.length,
          byTyp: {
            heim: 0,
            zivilschutzanlage: 0,
            schulungsraum: 0,
            sonstiges: 0,
          },
          verfuegbare: 0,
          mitKapazitaet: 0,
        } as unknown as OrteStats;

        orte.forEach((ort) => {
          stats.byTyp[ort.typ] = (stats.byTyp[ort.typ] || 0) + 1;
          if (ort.verfuegbarkeit) stats.verfuegbare++;
          if (ort.kapazitaet && ort.kapazitaet.maxPersonen) stats.mitKapazitaet++;
        });

        return stats;
      })
    );
  }

  /* -------------------------------------------------- */
  /* Helper                                             */
  /* -------------------------------------------------- */

  /**
   * Liefert die UID des eingeloggten Users oder 'system' als Fallback.
   * Der AuthService liefert aktuell nur die Firebase-User-Infos.
   */
  private authUserId(): string {
    // Directly access Firebase Auth; avoids Node 'require' and circular deps.
    const auth = inject(Auth);
    return auth.currentUser?.uid ?? 'system';
  }

  /**
   * Google Maps Embed URL ohne API Key.
   */
  getGoogleMapsEmbedUrl(adresse: OrtDoc['adresse']): string {
    const address = `${adresse.strasse}, ${adresse.plz} ${adresse.ort}`;
    const encodedAddress = encodeURIComponent(address);
    return `https://www.google.com/maps?q=${encodedAddress}&output=embed`;
  }
}
