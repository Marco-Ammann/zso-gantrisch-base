// src/app/core/services/json-import.service.ts
import { Injectable, inject } from '@angular/core';
import { PersonService } from './person.service';
import { PersonDoc, NotfallkontaktDoc } from '@core/models/person.model';
import { LoggerService } from './logger.service';
import { Observable, from, forkJoin } from 'rxjs';
import { switchMap } from 'rxjs/operators';

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
  private readonly personService = inject(PersonService);
  private readonly logger = inject(LoggerService);

  /**
   * Import persons from JSON array
   */
  importPersonsFromJson(jsonData: ImportJsonPerson[]): Observable<string[]> {
    this.logger.log('JsonImportService', `Starting import of ${jsonData.length} persons`);
    
    const importPromises = jsonData.map(jsonPerson => this.importSinglePerson(jsonPerson));
    
    return forkJoin(importPromises);
  }

  /**
   * Import single person with notfallkontakte
   */
  private importSinglePerson(jsonPerson: ImportJsonPerson): Observable<string> {
    const personDoc = this.convertToPersonDoc(jsonPerson);
    
    return this.personService.create(personDoc).pipe(
      switchMap(newPersonId => {
        this.logger.log('JsonImportService', `Created person: ${personDoc.grunddaten.vorname} ${personDoc.grunddaten.nachname}`);
        
        // Import Notfallkontakte if they exist
        if (jsonPerson.notfallkontakte && jsonPerson.notfallkontakte.length > 0) {
          return this.importNotfallkontakte(newPersonId, jsonPerson.notfallkontakte).pipe(
            switchMap(() => from([newPersonId]))
          );
        }
        
        return from([newPersonId]);
      })
    );
  }

  /**
   * Convert JSON person to PersonDoc format
   */
  private convertToPersonDoc(jsonPerson: ImportJsonPerson): Omit<PersonDoc, 'id'> {
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
   * Import notfallkontakte for a person
   */
  private importNotfallkontakte(personId: string, kontakte: any[]): Observable<string[]> {
    // This would need to be implemented in PersonService or separate NotfallkontaktService
    this.logger.log('JsonImportService', `Importing ${kontakte.length} emergency contacts for person ${personId}`);
    
    // For now, just return empty array
    // TODO: Implement NotfallkontaktService.createMultiple()
    return from([[]]);
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