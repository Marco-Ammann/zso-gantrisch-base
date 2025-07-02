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
   * Import persons from JSON array
   */
  importPersonsFromJson(jsonData: any): Observable<string[]> {
    return new Observable<string[]>(observer => {
      const ids: string[] = [];
      
      // Process each person sequentially
      const processNext = (index: number) => {
        if (index >= jsonData.length) {
          observer.next(ids);
          observer.complete();
          return;
        }
        
        const person = jsonData[index];
        
        // Transform the person data to match PersonDoc
        const personData = this.transformPersonData(person);
        
        lastValueFrom(this.personService.create(personData)).then((personId: string) => {
          ids.push(personId);
          
          // Import Notfallkontakte
          if (person.notfallkontakte && Array.isArray(person.notfallkontakte)) {
            const notfallkontaktePromises = person.notfallkontakte.map((kontakt: any) => {
              const kontaktData = {
                ...kontakt,
                personId: personId
              };
              const kontakteCollection = collection(this.firestoreService.db, 'notfallkontakte');
              return addDoc(kontakteCollection, kontaktData);
            });
            
            Promise.all(notfallkontaktePromises).then(() => {
              processNext(index + 1);
            }).catch((err: any) => {
              this.logger.error('JsonImportService', 'Failed to import notfallkontakte', err);
              processNext(index + 1);
            });
          } else {
            processNext(index + 1);
          }
        }).catch((err: any) => {
          this.logger.error('JsonImportService', 'Failed to import person', err);
          processNext(index + 1);
        });
      };
      
      processNext(0);
    });
  }

  /**
   * Convert JSON person to PersonDoc format
   */
  private transformPersonData(jsonPerson: ImportJsonPerson): Omit<PersonDoc, 'id'> {
    return {
      grunddaten: {
        vorname: jsonPerson.grunddaten.vorname,
        nachname: jsonPerson.grunddaten.nachname,
        geburtsdatum: jsonPerson.grunddaten.geburtsdatum.seconds * 1000, // Convert to timestamp
        grad: jsonPerson.grunddaten.grad,
        funktion: jsonPerson.grunddaten.funktion
      },
      kontaktdaten: {
        strasse: jsonPerson.kontaktdaten.strasse,
        plz: jsonPerson.kontaktdaten.plz,
        ort: jsonPerson.kontaktdaten.ort,
        email: jsonPerson.kontaktdaten.email,
        telefonMobil: jsonPerson.kontaktdaten.telefonMobil,
        telefonFestnetz: jsonPerson.kontaktdaten.telefonFestnetz || '',
        telefonGeschaeftlich: jsonPerson.kontaktdaten.telefonGeschaeftlich || ''
      },
      berufliches: {
        erlernterBeruf: jsonPerson.berufliches.erlernterBeruf,
        ausgeubterBeruf: jsonPerson.berufliches.ausgeubterBeruf,
        arbeitgeber: jsonPerson.berufliches.arbeitgeber,
        zivileSpezialausbildung: jsonPerson.berufliches.zivileSpezialausbildung || '',
        führerausweisKategorie: jsonPerson.berufliches.führerausweisKategorie || []
      },
      zivilschutz: {
        grundausbildung: jsonPerson.zivilschutz.grundausbildung,
        status: jsonPerson.zivilschutz.status,
        einteilung: {
          zug: jsonPerson.zivilschutz.einteilung.zug,
          gruppe: jsonPerson.zivilschutz.einteilung.gruppe || ''
        },
        zusatzausbildungen: jsonPerson.zivilschutz.zusatzausbildungen || []
      },
      persoenliches: {
        blutgruppe: jsonPerson.persoenliches.blutgruppe || '',
        allergien: jsonPerson.persoenliches.allergien || [],
        essgewohnheiten: jsonPerson.persoenliches.essgewohnheiten || [],
        sprachkenntnisse: jsonPerson.persoenliches.sprachkenntnisse || [],
        besonderheiten: jsonPerson.persoenliches.besonderheiten || []
      },
      preferences: {
        contactMethod: 'digital', // Default
        emailNotifications: true
      },
      erstelltAm: jsonPerson.erstelltAm.seconds * 1000,
      aktualisiertAm: jsonPerson.aktualisiertAm ? jsonPerson.aktualisiertAm.seconds * 1000 : Date.now()
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