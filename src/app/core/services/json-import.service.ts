// src/app/core/services/json-import.service.ts
import { Injectable } from '@angular/core';
import { PersonService } from './person.service';
import { PersonDoc, NotfallkontaktDoc } from '@core/models/person.model';
import { LoggerService } from './logger.service';
import { Observable } from 'rxjs';
import { FirestoreService } from './firestore.service';
import { lastValueFrom } from 'rxjs';
import { collection, addDoc } from '@angular/fire/firestore';

interface ImportJsonPerson {
  id: string;
  grunddaten: {
    vorname: string;
    nachname: string;
    geburtsdatum: { seconds: number; nanoseconds: number };
    grad: string;
    funktion: string;
  };
  kontaktdaten: {
    strasse: string;
    plz: string;
    ort: string;
    email: string;
    telefonMobil: string;
    telefonFestnetz?: string;
    telefonGeschaeftlich?: string;
  };
  berufliches: {
    erlernterBeruf: string;
    ausgeubterBeruf: string;
    arbeitgeber: string;
    zivileSpezialausbildung?: string;
    führerausweisKategorie: string[];
  };
  zivilschutz: {
    grundausbildung: string;
    status: 'aktiv' | 'neu' | 'inaktiv';
    einteilung: {
      zug: number;
      gruppe: string;
    };
    zusatzausbildungen: string[];
  };
  persoenliches: {
    blutgruppe?: string;
    allergien: string[];
    essgewohnheiten: string[];
    sprachkenntnisse: string[];
    besonderheiten: string[];
  };
  erstelltAm: { seconds: number; nanoseconds: number };
  aktualisiertAm?: { seconds: number; nanoseconds: number };
  metadaten?: {
    letzteAktualisierung: { seconds: number; nanoseconds: number };
    aktualisiert_von: string;
  };
  notfallkontakte?: Array<{
    id: string;
    name: string;
    beziehung: string;
    telefonnummer: string;
    prioritaet: number;
    erstelltAm: { seconds: number; nanoseconds: number };
    personId: string;
  }>;
}

@Injectable({ providedIn: 'root' })
export class JsonImportService {
  private readonly personService: PersonService;
  private readonly firestoreService: FirestoreService;
  private readonly logger: LoggerService;

  constructor(
    personService: PersonService,
    firestoreService: FirestoreService,
    logger: LoggerService
  ) {
    this.personService = personService;
    this.firestoreService = firestoreService;
    this.logger = logger;
  }

  /**
   * Import persons from JSON data
   */
  importPersonsFromJson(jsonData: any): Observable<string[]> {
    return new Observable<string[]>((observer) => {
      const ids: string[] = [];
      let processed = 0;

      const processNext = async (index: number) => {
        if (index >= jsonData.length) {
          this.logger.log(
            'JsonImportService',
            `Import completed: ${ids.length} persons imported`
          );
          observer.next(ids);
          observer.complete();
          return;
        }

        try {
          const person = jsonData[index];
          this.logger.log(
            'JsonImportService',
            `Processing person ${index + 1}/${jsonData.length}:`,
            person.grunddaten?.vorname
          );

          // Transform and create person
          const personData = this.transformPersonData(person);
          const personId = await lastValueFrom(
            this.personService.create(personData)
          );
          ids.push(personId);

          this.logger.log(
            'JsonImportService',
            `Person created with ID: ${personId}`
          );

          // Import Notfallkontakte if they exist
          if (
            person.notfallkontakte &&
            Array.isArray(person.notfallkontakte) &&
            person.notfallkontakte.length > 0
          ) {
            this.logger.log(
              'JsonImportService',
              `Importing ${person.notfallkontakte.length} emergency contacts for ${person.grunddaten?.vorname}`
            );

            for (const kontakt of person.notfallkontakte) {
              try {
                const kontaktData = {
                  name: kontakt.name || '',
                  beziehung: kontakt.beziehung || '',
                  telefonnummer: kontakt.telefonnummer || '',
                  prioritaet: kontakt.prioritaet || 1,
                  personId: personId,
                  erstelltAm: kontakt.erstelltAm?.seconds
                    ? kontakt.erstelltAm.seconds * 1000
                    : Date.now(),
                };

                await lastValueFrom(
                  this.personService.createNotfallkontakt(kontaktData)
                );
                this.logger.log(
                  'JsonImportService',
                  `Emergency contact created: ${kontakt.name}`
                );
              } catch (contactError) {
                this.logger.error(
                  'JsonImportService',
                  `Failed to import emergency contact ${kontakt.name}:`,
                  contactError
                );
              }
            }
          }

          processed++;
          this.logger.log(
            'JsonImportService',
            `Progress: ${processed}/${jsonData.length} persons processed`
          );

          // Small delay to avoid overwhelming Firestore
          setTimeout(() => processNext(index + 1), 100);
        } catch (err) {
          this.logger.error(
            'JsonImportService',
            `Failed to import person ${index + 1}:`,
            err
          );
          // Continue with next person even if current one fails
          setTimeout(() => processNext(index + 1), 100);
        }
      };

      processNext(0);
    });
  }

  /**
   * Convert JSON person to PersonDoc format
   */
  private transformPersonData(
    jsonPerson: ImportJsonPerson
  ): Omit<PersonDoc, 'id'> {
    // Helper für Timestamp-Konvertierung
    const convertTimestamp = (ts: any): number => {
      if (!ts) return Date.now();
      if (typeof ts === 'number') return ts;
      if (ts.seconds) return ts.seconds * 1000;
      return Date.now();
    };

    return {
      grunddaten: {
        vorname: jsonPerson.grunddaten.vorname || '',
        nachname: jsonPerson.grunddaten.nachname || '',
        geburtsdatum: convertTimestamp(jsonPerson.grunddaten.geburtsdatum),
        grad: jsonPerson.grunddaten.grad || 'Soldat',
        funktion: jsonPerson.grunddaten.funktion || 'Betreuer',
      },
      kontaktdaten: {
        strasse: jsonPerson.kontaktdaten.strasse || '',
        plz: jsonPerson.kontaktdaten.plz || '',
        ort: jsonPerson.kontaktdaten.ort || '',
        email: jsonPerson.kontaktdaten.email || '',
        telefonMobil: jsonPerson.kontaktdaten.telefonMobil || '',
        telefonFestnetz: jsonPerson.kontaktdaten.telefonFestnetz || '',
        telefonGeschaeftlich:
          jsonPerson.kontaktdaten.telefonGeschaeftlich || '',
      },
      berufliches: {
        erlernterBeruf: jsonPerson.berufliches?.erlernterBeruf || '',
        ausgeubterBeruf: jsonPerson.berufliches?.ausgeubterBeruf || '',
        arbeitgeber: jsonPerson.berufliches?.arbeitgeber || '',
        zivileSpezialausbildung:
          jsonPerson.berufliches?.zivileSpezialausbildung || '',
        führerausweisKategorie:
          jsonPerson.berufliches?.führerausweisKategorie || [],
      },
      zivilschutz: {
        grundausbildung:
          jsonPerson.zivilschutz?.grundausbildung ||
          new Date().getFullYear().toString(),
        status: jsonPerson.zivilschutz?.status || 'neu',
        einteilung: {
          zug: jsonPerson.zivilschutz?.einteilung?.zug || 1,
          gruppe: jsonPerson.zivilschutz?.einteilung?.gruppe || '',
        },
        zusatzausbildungen: jsonPerson.zivilschutz?.zusatzausbildungen || [],
      },
      persoenliches: {
        blutgruppe: jsonPerson.persoenliches?.blutgruppe || '',
        allergien: jsonPerson.persoenliches?.allergien || [],
        essgewohnheiten: jsonPerson.persoenliches?.essgewohnheiten || [],
        sprachkenntnisse: jsonPerson.persoenliches?.sprachkenntnisse || [],
        besonderheiten: jsonPerson.persoenliches?.besonderheiten || [],
      },
      preferences: {
        contactMethod: 'digital',
        emailNotifications: true,
      },
      erstelltAm: convertTimestamp(jsonPerson.erstelltAm),
      aktualisiertAm: convertTimestamp(
        jsonPerson.aktualisiertAm || jsonPerson.metadaten?.letzteAktualisierung
      ),
      metadaten: jsonPerson.metadaten
        ? {
            letzteAktualisierung: convertTimestamp(
              jsonPerson.metadaten.letzteAktualisierung
            ),
            aktualisiert_von: jsonPerson.metadaten.aktualisiert_von || 'Import',
          }
        : undefined,
    };
  }

  /**
   * Utility to read JSON file from input
   */
  readJsonFile(file: File): Promise<ImportJsonPerson[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target?.result as string);
          resolve(jsonData);
        } catch (error) {
          reject(new Error('Invalid JSON format'));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
}
