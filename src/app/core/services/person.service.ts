// src/app/core/services/person.service.ts
import { Injectable, inject, Injector, runInInjectionContext, OnDestroy } from '@angular/core';
import { collection, collectionData, doc, updateDoc, query, orderBy, where, addDoc, deleteDoc } from '@angular/fire/firestore';
import { Observable, from, of, throwError, Subject } from 'rxjs';
import { switchMap, catchError, map, takeUntil } from 'rxjs/operators';

import { PersonDoc, NotfallkontaktDoc, Notfallkontakt } from '@core/models/person.model';
import { FirestoreService } from './firestore.service';
import { LoggerService } from '@core/services/logger.service';

interface PersonStats {
  total: number;
  active: number;
  new: number;
  inactive: number;
  byZug: { [key: number]: number };
  byGruppe: { [key: string]: number };
  digitalPreference: number;
  paperPreference: number;
}

@Injectable({ providedIn: 'root' })
export class PersonService implements OnDestroy {
  private readonly injector = inject(Injector);
  private readonly logger = inject(LoggerService);
  private readonly destroy$ = new Subject<void>();

  constructor(private firestoreService: FirestoreService) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.logger.log('PersonService', 'Service destroyed');
  }

  /**
   * Alle Personen laden
   */
  getAll(): Observable<PersonDoc[]> {
    return runInInjectionContext(this.injector, () => {
      try {
        const personsCollection = collection(this.firestoreService.db, 'persons');
        const personsQuery = query(
          personsCollection, 
          orderBy('grunddaten.nachname', 'asc'),
          orderBy('grunddaten.vorname', 'asc')
        );
        
        return collectionData(personsQuery, { idField: 'id' }).pipe(
          map(persons => {
            this.logger.log('PersonService', `Loaded ${persons.length} persons`);
            return persons as PersonDoc[];
          }),
          catchError(error => {
            this.logger.error('PersonService', 'Error loading persons:', error);
            return of([]);
          }),
          takeUntil(this.destroy$)
        );
      } catch (error) {
        this.logger.error('PersonService', 'Error creating query:', error);
        return of([]);
      }
    });
  }

  /**
   * Person nach ID laden
   */
  getById(id: string): Observable<PersonDoc | null> {
    return this.firestoreService.getDoc<PersonDoc>(`persons/${id}`);
  }

  /**
   * Personen nach Status filtern
   */
  getByStatus(status: string): Observable<PersonDoc[]> {
    try {
      const personsCollection = collection(this.firestoreService.db, 'persons');
      const queryConstraints = [];
      if (status !== undefined) {
        queryConstraints.push(where('zivilschutz.status', '==', status));
      }
      const statusQuery = query(personsCollection, ...queryConstraints);
      return collectionData(statusQuery, { idField: 'id' }) as Observable<PersonDoc[]>;
    } catch (err) {
      this.logger.error('PersonService', 'getByStatus failed', err);
      return of([]);
    }
  }

  /**
   * Personen nach Zug filtern
   */
  getByZug(zug: number): Observable<PersonDoc[]> {
    try {
      const personsCollection = collection(this.firestoreService.db, 'persons');
      const queryConstraints = [];
      if (zug !== undefined) {
        queryConstraints.push(where('zivilschutz.einteilung.zug', '==', zug));
      }
      const zugQuery = query(personsCollection, ...queryConstraints);
      return collectionData(zugQuery, { idField: 'id' }) as Observable<PersonDoc[]>;
    } catch (err) {
      this.logger.error('PersonService', 'getByZug failed', err);
      return of([]);
    }
  }

  /**
   * Personen nach E-Mail suchen (für User-Verknüpfung)
   */
  getByEmail(email: string): Observable<PersonDoc[]> {
    try {
      const personsCollection = collection(this.firestoreService.db, 'persons');
      const queryConstraints = [];
      if (email !== undefined) {
        queryConstraints.push(where('kontaktdaten.email', '==', email));
      }
      const emailQuery = query(personsCollection, ...queryConstraints);
      return collectionData(emailQuery, { idField: 'id' }) as Observable<PersonDoc[]>;
    } catch (err) {
      this.logger.error('PersonService', 'getByEmail failed', err);
      return of([]);
    }
  }

  /**
   * Statistiken berechnen
   */
  getStats(): Observable<PersonStats> {
    return this.getAll().pipe(
      map(persons => {
        const stats: PersonStats = {
          total: persons.length,
          active: 0,
          new: 0,
          inactive: 0,
          byZug: {},
          byGruppe: {},
          digitalPreference: 0,
          paperPreference: 0
        };

        persons.forEach(person => {
          // Status zählen
          switch (person.zivilschutz.status) {
            case 'aktiv': stats.active++; break;
            case 'neu': stats.new++; break;
            case 'inaktiv': stats.inactive++; break;
          }

          // Zug zählen
          const zug = person.zivilschutz.einteilung.zug;
          stats.byZug[zug] = (stats.byZug[zug] || 0) + 1;

          // Gruppe zählen
          const gruppe = person.zivilschutz.einteilung.gruppe || 'Keine';
          stats.byGruppe[gruppe] = (stats.byGruppe[gruppe] || 0) + 1;

          // Präferenzen zählen
          const contactMethod = person.preferences?.contactMethod;
          if (contactMethod === 'digital' || contactMethod === 'both') {
            stats.digitalPreference++;
          }
          if (contactMethod === 'paper' || contactMethod === 'both') {
            stats.paperPreference++;
          }
        });

        return stats;
      })
    );
  }

  /**
   * Person erstellen
   */
  create(personData: Omit<PersonDoc, 'id'>): Observable<string> {
    this.logger.log('PersonService', 'Creating person', personData.grunddaten);
    
    return runInInjectionContext(this.injector, () => {
      const personsCollection = collection(this.firestoreService.db, 'persons');
      
      return from(addDoc(personsCollection, {
        ...personData,
        erstelltAm: Date.now(),
        aktualisiertAm: Date.now()
      })).pipe(
        map(docRef => docRef.id),
        catchError(error => {
          this.logger.error('PersonService', 'Error creating person:', error);
          return throwError(() => error);
        }),
        takeUntil(this.destroy$)
      );
    });
  }

  /**
   * Person aktualisieren
   */
  update(id: string, updates: Partial<PersonDoc>): Observable<void> {
    this.logger.log('PersonService', 'Updating person', { id, updates });
    
    return runInInjectionContext(this.injector, () => {
      const personDoc = doc(this.firestoreService.db, `persons/${id}`);
      
      return from(updateDoc(personDoc, {
        ...updates,
        aktualisiertAm: Date.now()
      })).pipe(
        catchError(error => {
          this.logger.error('PersonService', `Error updating person ${id}:`, error);
          return throwError(() => error);
        }),
        takeUntil(this.destroy$)
      );
    });
  }

  /**
   * User-Verknüpfung erstellen
   */
  linkToUser(personId: string, userId: string): Observable<void> {
    this.logger.log('PersonService', 'Linking person to user', { personId, userId });
    
    return this.update(personId, { userId });
  }

  /**
   * User-Verknüpfung entfernen
   */
  unlinkFromUser(personId: string): Observable<void> {
    this.logger.log('PersonService', 'Unlinking person from user', personId);
    
    return runInInjectionContext(this.injector, () => {
      const personDoc = doc(this.firestoreService.db, `persons/${personId}`);
      
      return from(updateDoc(personDoc, {
        userId: null,
        aktualisiertAm: Date.now()
      })).pipe(
        takeUntil(this.destroy$)
      );
    });
  }

  /**
   * Kontakt-Präferenz aktualisieren
   */
  updateContactPreference(
    id: string, 
    contactMethod: 'digital' | 'paper' | 'both'
  ): Observable<void> {
    return this.update(id, {
      preferences: {
        contactMethod,
        emailNotifications: contactMethod !== 'paper'
      }
    });
  }

  /**
   * Status ändern
   */
  updateStatus(id: string, status: 'aktiv' | 'neu' | 'inaktiv'): Observable<void> {
    return this.update(id, {
      zivilschutz: {
        ...this.getCurrentZivilschutzData(id),
        status
      }
    });
  }

  /**
   * Person löschen
   */
  delete(id: string): Observable<void> {
    this.logger.log('PersonService', 'Deleting person', id);
    
    return runInInjectionContext(this.injector, () => {
      const personDoc = doc(this.firestoreService.db, `persons/${id}`);
      
      return from(deleteDoc(personDoc)).pipe(
        catchError(error => {
          this.logger.error('PersonService', `Error deleting person ${id}:`, error);
          return throwError(() => error);
        }),
        takeUntil(this.destroy$)
      );
    });
  }

  /**
   * Notfallkontakte für Person laden
   */
  getNotfallkontakte(personId: string): Observable<NotfallkontaktDoc[]> {
    if (!personId) {
      return of([]);
    }
    return runInInjectionContext(this.injector, () => {
      const kontakteCollection = collection(this.firestoreService.db, 'notfallkontakte');
      const kontakteQuery = query(
        kontakteCollection,
        where('personId', '==', personId),
        orderBy('prioritaet', 'asc')
      );
      
      return collectionData(kontakteQuery, { idField: 'id' }).pipe(
        map(kontakte => kontakte as NotfallkontaktDoc[]),
        takeUntil(this.destroy$)
      );
    });
  }

  /**
   * Notfallkontakte für Person laden
   */
  getNotfallkontakteByPersonId(personId: string): Observable<Notfallkontakt[]> {
    return this.firestoreService
      .collection<Notfallkontakt>(`persons/${personId}/notfallkontakte`)
      .valueChanges({ idField: 'id' });
  }

  // Helper method - würde normalerweise die aktuellen Daten laden
  private getCurrentZivilschutzData(id: string): any {
    // Simplified - in real implementation would fetch current data
    return {};
  }
}