// src/app/core/models/person.model.ts
export interface PersonDoc {
    id: string;
    userId?: string; // Link to user account
    
    // Grunddaten
    grunddaten: {
      vorname: string;
      nachname: string;
      geburtsdatum: number | { seconds: number; nanoseconds: number };
      grad: string;
      funktion: string;
    };
  
    // Kontaktdaten
    kontaktdaten: {
      strasse: string;
      plz: string;
      ort: string;
      email: string;
      telefonMobil: string;
      telefonFestnetz?: string;
      telefonGeschaeftlich?: string;
    };
  
    // Berufliches
    berufliches: {
      erlernterBeruf: string;
      ausgeubterBeruf: string;
      arbeitgeber: string;
      zivileSpezialausbildung?: string;
      führerausweisKategorie: string[];
    };
  
    // Zivilschutz
    zivilschutz: {
      grundausbildung: string;
      status: 'aktiv' | 'neu' | 'inaktiv';
      einteilung: {
        zug: number;
        gruppe: string;
      };
      zusatzausbildungen: string[];
    };
  
    // Persönliches
    persoenliches: {
      blutgruppe?: string;
      allergien: string[];
      essgewohnheiten: string[];
      sprachkenntnisse: string[];
      besonderheiten: string[];
    };
  
    // Präferenzen (neu)
    preferences?: {
      contactMethod: 'digital' | 'paper' | 'both';
      emailNotifications: boolean;
    };
  
    // Verknüpfung zu User-Account
    // userId?: string;
  
    // Metadaten
    erstelltAm: number | { seconds: number; nanoseconds: number };
    aktualisiertAm?: number | { seconds: number; nanoseconds: number };
    metadaten?: {
      letzteAktualisierung: number | { seconds: number; nanoseconds: number };
      aktualisiert_von: string;
    };
  }

  export interface Notfallkontakt {
    id?: string;
    name: string;
    beziehung: string;
    telefonnummer: string;
    prioritaet: number;
    erstelltAm: number | { seconds: number; nanoseconds: number };
    personId: string;
  }

  export interface NotfallkontaktDoc {
    id: string;
    personId: string;
    name: string;
    beziehung: string;
    telefonnummer: string;
    prioritaet: number;
    erstelltAm: number | { seconds: number; nanoseconds: number };
  }
  
  export class Person {
    constructor(public data: PersonDoc) {}
  
    get fullName(): string {
      return `${this.data.grunddaten.vorname} ${this.data.grunddaten.nachname}`.trim();
    }
  
    get initials(): string {
      return `${this.data.grunddaten.vorname.charAt(0)}${this.data.grunddaten.nachname.charAt(0)}`;
    }
  
    get age(): number | null {
      if (!this.data.grunddaten.geburtsdatum) return null;
      
      const birthDate = typeof this.data.grunddaten.geburtsdatum === 'number' 
        ? new Date(this.data.grunddaten.geburtsdatum)
        : new Date(this.data.grunddaten.geburtsdatum.seconds * 1000);
      
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age;
    }
  
    get isActive(): boolean {
      return this.data.zivilschutz.status === 'aktiv';
    }
  
    get hasDigitalPreference(): boolean {
      return this.data.preferences?.contactMethod === 'digital' || 
             this.data.preferences?.contactMethod === 'both';
    }
  
    get hasPaperPreference(): boolean {
      return this.data.preferences?.contactMethod === 'paper' || 
             this.data.preferences?.contactMethod === 'both';
    }
  
    get primaryPhone(): string {
      return this.data.kontaktdaten.telefonMobil || 
             this.data.kontaktdaten.telefonFestnetz || 
             this.data.kontaktdaten.telefonGeschaeftlich || 
             '';
    }
  
    get einteilungDisplay(): string {
      const { zug, gruppe } = this.data.zivilschutz.einteilung;
      return gruppe ? `Zug ${zug}, Gruppe ${gruppe}` : `Zug ${zug}`;
    }
  }