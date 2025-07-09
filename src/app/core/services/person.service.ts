// src/app/core/services/person.service.ts
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
  updateDoc,
  query,
  orderBy,
  where,
  addDoc,
  deleteDoc,
} from '@angular/fire/firestore';
import { Observable, from, of, throwError, Subject, forkJoin } from 'rxjs';
import { switchMap, catchError, map, takeUntil, take } from 'rxjs/operators';

import {
  PersonDoc,
  NotfallkontaktDoc,
  Notfallkontakt,
} from '@core/models/person.model';
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
        const personsCollection = collection(
          this.firestoreService.db,
          'persons'
        );
        const personsQuery = query(
          personsCollection,
          orderBy('grunddaten.nachname', 'asc'),
          orderBy('grunddaten.vorname', 'asc')
        );

        return collectionData(personsQuery, { idField: 'id' }).pipe(
          map((persons) => {
            this.logger.log(
              'PersonService',
              `Loaded ${persons.length} persons`
            );
            return persons as PersonDoc[];
          }),
          catchError((error) => {
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
    this.logger.log('PersonService', `Loading person with ID: ${id}`);

    return this.firestoreService.getDoc<PersonDoc>(`persons/${id}`).pipe(
      map((person) => {
        if (person) {
          this.logger.log('PersonService', `Person loaded successfully:`, {
            id: person.id,
            name: `${person.grunddaten?.vorname} ${person.grunddaten?.nachname}`,
          });
        } else {
          this.logger.warn('PersonService', `Person with ID ${id} not found`);
        }
        return person;
      }),
      catchError((error) => {
        this.logger.error(
          'PersonService',
          `Error loading person ${id}:`,
          error
        );
        return of(null);
      })
    );
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
      return collectionData(statusQuery, { idField: 'id' }) as Observable<
        PersonDoc[]
      >;
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
      return collectionData(zugQuery, { idField: 'id' }) as Observable<
        PersonDoc[]
      >;
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
      return collectionData(emailQuery, { idField: 'id' }) as Observable<
        PersonDoc[]
      >;
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
      map((persons) => {
        const stats: PersonStats = {
          total: persons.length,
          active: 0,
          new: 0,
          inactive: 0,
          byZug: {},
          byGruppe: {},
          digitalPreference: 0,
          paperPreference: 0,
        };

        persons.forEach((person) => {
          // Status zählen
          switch (person.zivilschutz.status) {
            case 'aktiv':
              stats.active++;
              break;
            case 'neu':
              stats.new++;
              break;
            case 'inaktiv':
              stats.inactive++;
              break;
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

      return from(
        addDoc(personsCollection, {
          ...personData,
          erstelltAm: Date.now(),
          aktualisiertAm: Date.now(),
        })
      ).pipe(
        map((docRef) => docRef.id),
        catchError((error) => {
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

      return from(
        updateDoc(personDoc, {
          ...updates,
          aktualisiertAm: Date.now(),
        })
      ).pipe(
        catchError((error) => {
          this.logger.error(
            'PersonService',
            `Error updating person ${id}:`,
            error
          );
          return throwError(() => error);
        }),
        takeUntil(this.destroy$)
      );
    });
  }

  /**
   * Person mit allen Notfallkontakten löschen (kaskadierende Löschung)
   */
  deletePersonWithNotfallkontakte(personId: string): Observable<void> {
    this.logger.log(
      'PersonService',
      'Deleting person with emergency contacts',
      personId
    );

    return runInInjectionContext(this.injector, () => {
      // Zuerst alle Notfallkontakte laden und löschen
      return this.getNotfallkontakte(personId).pipe(
        take(1),
        switchMap((kontakte) => {
          if (kontakte.length === 0) {
            // Keine Notfallkontakte vorhanden, direkt Person löschen
            this.logger.log(
              'PersonService',
              'No emergency contacts found, deleting person directly'
            );
            return this.delete(personId);
          }

          // Notfallkontakte löschen
          this.logger.log(
            'PersonService',
            `Deleting ${kontakte.length} emergency contacts first`
          );
          const deletePromises = kontakte.map((kontakt) =>
            this.deleteNotfallkontakt(kontakt.id).pipe(
              catchError((error) => {
                this.logger.error(
                  'PersonService',
                  `Failed to delete emergency contact ${kontakt.id}:`,
                  error
                );
                return of(null); // Weiter machen auch wenn ein Kontakt nicht gelöscht werden kann
              })
            )
          );

          return forkJoin(deletePromises).pipe(
            switchMap(() => {
              this.logger.log(
                'PersonService',
                'Emergency contacts deleted, now deleting person'
              );
              return this.delete(personId);
            })
          );
        }),
        catchError((error) => {
          this.logger.error(
            'PersonService',
            `Failed to delete person ${personId}:`,
            error
          );
          return throwError(() => error);
        })
      );
    });
  }

  /**
   * User-Verknüpfung erstellen
   */
  linkToUser(personId: string, userId: string): Observable<void> {
    this.logger.log('PersonService', 'Linking person to user', {
      personId,
      userId,
    });

    return this.update(personId, { userId });
  }

  /**
   * User-Verknüpfung entfernen
   */
  unlinkFromUser(personId: string): Observable<void> {
    this.logger.log('PersonService', 'Unlinking person from user', personId);

    return runInInjectionContext(this.injector, () => {
      const personDoc = doc(this.firestoreService.db, `persons/${personId}`);

      return from(
        updateDoc(personDoc, {
          userId: undefined,
          aktualisiertAm: Date.now(),
        })
      ).pipe(takeUntil(this.destroy$));
    });
  }

  /**
   * Unlink a person by their linked userId (used when deleting user accounts)
   */
  unlinkByUserId(userId: string): Observable<void> {
    if (!userId) return of(void 0);
    return this.getByUserId(userId).pipe(
      take(1),
      switchMap(persons => {
        if (persons.length === 0) return of(void 0);
        const person = persons[0];
        return this.update(person.id, { userId: undefined });
      })
    );
  }

  /**
   * Internal helper – load persons linked to a userId
   */
  private getByUserId(userId: string): Observable<PersonDoc[]> {
    try {
      const personsCollection = collection(this.firestoreService.db, 'persons');
      const q = query(personsCollection, where('userId', '==', userId));
      return collectionData(q, { idField: 'id' }) as Observable<PersonDoc[]>;
    } catch (err) {
      this.logger.error('PersonService', 'getByUserId failed', err);
      return of([]);
    }
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
        emailNotifications: contactMethod !== 'paper',
      },
    });
  }

  /**
   * Status ändern
   */
  updateStatus(
    id: string,
    status: 'aktiv' | 'neu' | 'inaktiv'
  ): Observable<void> {
    return this.update(id, {
      zivilschutz: {
        ...this.getCurrentZivilschutzData(id),
        status,
      },
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
        catchError((error) => {
          this.logger.error(
            'PersonService',
            `Error deleting person ${id}:`,
            error
          );
          return throwError(() => error);
        }),
        takeUntil(this.destroy$)
      );
    });
  }

  /**
   * Get notfallkontakte for a person
   */
  /**
   * Get notfallkontakte for a person
   */
  getNotfallkontakte(personId: string): Observable<NotfallkontaktDoc[]> {
    // Defensive validation
    if (!personId || personId === 'undefined' || personId.trim() === '') {
      this.logger.error(
        'PersonService',
        'Cannot get emergency contacts: invalid personId:',
        personId
      );
      return of([]);
    }

    this.logger.log(
      'PersonService',
      `Getting emergency contacts for person: ${personId}`
    );

    return runInInjectionContext(this.injector, () => {
      try {
        const kontakteCollection = collection(
          this.firestoreService.db,
          'notfallkontakte'
        );
        const q = query(kontakteCollection, where('personId', '==', personId));

        return collectionData(q, { idField: 'id' }).pipe(
          map((docs: any[]) => {
            this.logger.log(
              'PersonService',
              `Found ${docs.length} emergency contacts for person ${personId}:`,
              docs
            );
            return docs.map((doc) => ({
              id: doc.id,
              name: doc.name || '',
              beziehung: doc.beziehung || '',
              telefonnummer: doc.telefonnummer || '',
              prioritaet: doc.prioritaet || 1,
              personId: doc.personId || '',
              erstelltAm: doc.erstelltAm || Date.now(),
            }));
          }),
          catchError((error) => {
            this.logger.error(
              'PersonService',
              `Error loading emergency contacts for person ${personId}:`,
              error
            );
            return of([]);
          }),
          takeUntil(this.destroy$)
        );
      } catch (error) {
        this.logger.error(
          'PersonService',
          'Error creating emergency contacts query:',
          error
        );
        return of([]);
      }
    });
  }

  /**
   * Notfallkontakte für Person laden
   */
  getNotfallkontakteByPersonId(personId: string): Observable<NotfallkontaktDoc[]> {
    return this.getNotfallkontakte(personId);
  }

  // Helper method - würde normalerweise die aktuellen Daten laden
  private getCurrentZivilschutzData(id: string): any {
    // Simplified - in real implementation would fetch current data
    return {};
  }

  /**
   * Notfallkontakt erstellen
   */
  createNotfallkontakt(
    kontaktData: Omit<NotfallkontaktDoc, 'id'>
  ): Observable<string> {
    return runInInjectionContext(this.injector, () => {
      const kontakteCollection = collection(
        this.firestoreService.db,
        'notfallkontakte'
      );

      return from(
        addDoc(kontakteCollection, {
          ...kontaktData,
          erstelltAm: kontaktData.erstelltAm || Date.now(),
        })
      ).pipe(
        map((docRef) => {
          this.logger.log(
            'PersonService',
            `Emergency contact created with ID: ${docRef.id}`
          );
          return docRef.id;
        }),
        takeUntil(this.destroy$)
      );
    });
  }

  /**
   * Notfallkontakt aktualisieren
   */
  updateNotfallkontakt(
    id: string,
    updates: Partial<NotfallkontaktDoc>
  ): Observable<void> {
    return runInInjectionContext(this.injector, () => {
      const kontaktDoc = doc(this.firestoreService.db, `notfallkontakte/${id}`);

      return from(
        updateDoc(kontaktDoc, {
          ...updates,
          aktualisiertAm: Date.now(),
        })
      ).pipe(takeUntil(this.destroy$));
    });
  }

  /**
   * Notfallkontakt löschen
   */
  deleteNotfallkontakt(id: string): Observable<void> {
    return runInInjectionContext(this.injector, () => {
      const kontaktDoc = doc(this.firestoreService.db, `notfallkontakte/${id}`);

      return from(deleteDoc(kontaktDoc)).pipe(takeUntil(this.destroy$));
    });
  }
}
