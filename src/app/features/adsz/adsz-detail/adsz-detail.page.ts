// src/app/features/adsz/adsz-detail/adsz-detail.page.ts

import { Component, inject, OnDestroy, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, takeUntil, switchMap, of, lastValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { getStorage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { Observable } from 'rxjs';
import { NotfallkontaktDoc } from '@core/models/person.model';
import { Notfallkontakt } from '@core/models/person.model';

import { PersonService } from '@core/services/person.service';
import { AuthService } from '@core/auth/services/auth.service';
import { LoggerService } from '@core/services/logger.service';
import { PersonDoc } from '@core/models/person.model';
import { ZsoInputField } from '@shared/ui/zso-input-field/zso-input-field';

@Component({
  selector: 'zso-adsz-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ZsoInputField
  ],
  templateUrl: './adsz-detail.page.html',
  styleUrls: ['./adsz-detail.page.scss'],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdzsDetailPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly personService = inject(PersonService);
  private readonly authService = inject(AuthService);
  private readonly logger = inject(LoggerService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  // State
  person: PersonDoc | null = null;
  notfallkontakte: NotfallkontaktDoc[] = [];
  isLoading = false;
  isEditing = false;
  isSaving = false;
  errorMsg: string | null = null;
  successMsg: string | null = null;
  isNewPerson = false;
  uploading = false;
  uploadMsg: string | null = null;
  uploadError = false;


  // Forms
  grunddatenForm!: FormGroup;
  kontaktdatenForm!: FormGroup;
  beruflichesForm!: FormGroup;
  zivilschutzForm!: FormGroup;
  persoenlichesForm!: FormGroup;
  preferencesForm!: FormGroup;

  // Current user for permissions
  currentUser$ = this.authService.appUser$;
  isAdmin$ = this.currentUser$.pipe(
    map(user => user?.doc.roles?.includes('admin') ?? false)
  );

  // Form options
  readonly gradOptions = ['Soldat', 'Korporal', 'Wachtmeister', 'Oberwachtmeister', 'Adjutant', 'Leutnant', 'Oberleutnant', 'Hauptmann'];
  readonly funktionOptions = ['Betreuer', 'C-Betreuer', 'Betreuer Uof', 'Gruppenführer', 'Zugführer'];
  readonly statusOptions = ['aktiv', 'neu', 'inaktiv'];
  readonly zugOptions = [1, 2];
  readonly gruppeOptions = ['A', 'B', 'C', 'D'];
  readonly contactMethodOptions = [
    { value: 'digital', label: 'Digital (E-Mail)' },
    { value: 'paper', label: 'Papier (Post)' },
    { value: 'both', label: 'Digital & Papier' }
  ];

  ngOnInit(): void {
    this.initializeForms();
    
    this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id');
        if (id === 'new') {
          this.isNewPerson = true;
          this.isEditing = true;
          return of(null);
        } else if (id) {
          return this.personService.getById(id);
        }
        return of(null);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (person) => {
        if (person) {
          this.person = person;
          this.loadNotfallkontakte(person.id);
          this.populateForms(person);
        } else if (!this.isNewPerson) {
          this.errorMsg = 'Person nicht gefunden';
        }
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.logger.error('AdzsDetailPage', 'Error loading person:', error);
        this.errorMsg = 'Fehler beim Laden der Person';
        this.cdr.markForCheck();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.grunddatenForm = this.fb.group({
      vorname: ['', Validators.required],
      nachname: ['', Validators.required],
      geburtsdatum: ['', Validators.required],
      grad: ['', Validators.required],
      funktion: ['', Validators.required]
    });

    this.kontaktdatenForm = this.fb.group({
      strasse: ['', Validators.required],
      plz: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
      ort: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telefonMobil: ['', Validators.required],
      telefonFestnetz: [''],
      telefonGeschaeftlich: ['']
    });

    this.beruflichesForm = this.fb.group({
      erlernterBeruf: [''],
      ausgeubterBeruf: [''],
      arbeitgeber: [''],
      zivileSpezialausbildung: [''],
      fuehrerausweisKategorie: ['']
    });

    this.zivilschutzForm = this.fb.group({
      grundausbildung: ['', Validators.required],
      status: ['aktiv', Validators.required],
      zug: [1, Validators.required],
      gruppe: [''],
      zusatzausbildungen: ['']
    });

    this.persoenlichesForm = this.fb.group({
      blutgruppe: [''],
      allergien: [''],
      essgewohnheiten: [''],
      sprachkenntnisse: [''],
      besonderheiten: ['']
    });

    this.preferencesForm = this.fb.group({
      contactMethod: ['digital', Validators.required],
      emailNotifications: [true]
    });
  }

  private populateForms(person: PersonDoc): void {
    const birthDate = this.formatDateForInput(person.grunddaten.geburtsdatum);
    
    this.grunddatenForm.patchValue({
      vorname: person.grunddaten.vorname,
      nachname: person.grunddaten.nachname,
      geburtsdatum: birthDate,
      grad: person.grunddaten.grad,
      funktion: person.grunddaten.funktion
    });

    this.kontaktdatenForm.patchValue(person.kontaktdaten);
    this.beruflichesForm.patchValue({
      ...person.berufliches,
      fuehrerausweisKategorie: person.berufliches.führerausweisKategorie.join(', ')
    });

    this.zivilschutzForm.patchValue({
      grundausbildung: person.zivilschutz.grundausbildung,
      status: person.zivilschutz.status,
      zug: person.zivilschutz.einteilung.zug,
      gruppe: person.zivilschutz.einteilung.gruppe,
      zusatzausbildungen: person.zivilschutz.zusatzausbildungen.join(', ')
    });

    this.persoenlichesForm.patchValue({
      blutgruppe: person.persoenliches.blutgruppe,
      allergien: person.persoenliches.allergien.join(', '),
      essgewohnheiten: person.persoenliches.essgewohnheiten.join(', '),
      sprachkenntnisse: person.persoenliches.sprachkenntnisse.join(', '),
      besonderheiten: person.persoenliches.besonderheiten.join(', ')
    });

    this.preferencesForm.patchValue({
      contactMethod: person.preferences?.contactMethod || 'digital',
      emailNotifications: person.preferences?.emailNotifications ?? true
    });
  }

  private loadNotfallkontakte(personId: string): void {
    this.personService.getNotfallkontakte(personId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (kontakte) => {
        this.notfallkontakte = kontakte;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.logger.error('AdzsDetailPage', 'Error loading emergency contacts:', error);
      }
    });
  }

  // Actions
  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    this.clearMessages();
  }

  save(): void {
    if (!this.validateAllForms()) {
      this.errorMsg = 'Bitte alle Pflichtfelder ausfüllen';
      return;
    }

    this.isSaving = true;
    this.clearMessages();

    const personData = this.buildPersonData();

    if (this.isNewPerson) {
      this.personService.create(personData).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (newId: string) => {
          this.successMsg = 'Person erfolgreich erstellt';
          this.isEditing = false;
          this.isSaving = false;
          this.router.navigate(['/adsz', newId]);
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          this.logger.error('AdzsDetailPage', 'Create error:', error);
          this.errorMsg = 'Fehler beim Erstellen';
          this.isSaving = false;
          this.cdr.markForCheck();
        }
      });
    } else {
      this.personService.update(this.person!.id, personData).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          this.successMsg = 'Änderungen gespeichert';
          this.isEditing = false;
          this.isSaving = false;
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          this.logger.error('AdzsDetailPage', 'Update error:', error);
          this.errorMsg = 'Fehler beim Speichern';
          this.isSaving = false;
          this.cdr.markForCheck();
        }
      });
    }
  }

  cancel(): void {
    if (this.isNewPerson) {
      this.router.navigate(['/adsz']);
    } else {
      this.isEditing = false;
      this.populateForms(this.person!);
      this.clearMessages();
    }
  }

  back(): void {
    this.router.navigate(['/adsz']);
  }

  generatePDF(): void {
    if (!this.person) return;
    
    this.logger.log('AdzsDetailPage', 'Generate PDF for person', this.person.id);
    this.successMsg = 'PDF-Generierung gestartet...';
  }

  getPersonInitials(person: PersonDoc): string {
    return `${person.grunddaten.vorname.charAt(0)}${person.grunddaten.nachname.charAt(0)}`;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length || !this.person) return;

    const file = input.files[0];
    const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

    if (file.size > MAX_SIZE) {
      this.showToast('Bild zu groß (max. 2 MB)', true);
      return;
    }

    this.uploading = true;
    this.uploadMsg = 'Bild wird hochgeladen…';
    this.uploadError = false;

    const storage = getStorage();
    const path = `persons/${this.person.id}/avatar_${Date.now()}`;
    const storageRef = ref(storage, path);

    let downloadUrl: string;

    uploadBytes(storageRef, file)
      .then((snapshot) => {
        return getDownloadURL(storageRef);
      })
      .then((url) => {
        downloadUrl = url;
        if (!this.person) return;
        
        return lastValueFrom(
          this.personService.update(this.person.id, { photoUrl: url })
        );
      })
      .then(() => {
        if (this.person) {
          this.person.photoUrl = downloadUrl;
        }
        this.showToast('Avatar aktualisiert', false);
        this.cdr.markForCheck();
      })
      .catch((error) => {
        this.logger.error('AdzsDetailPage', 'Upload failed:', error);
        this.showToast('Upload fehlgeschlagen', true);
      })
      .finally(() => {
        this.uploading = false;
        this.cdr.markForCheck();
      });
  }

  private showToast(message: string, isError: boolean): void {
    this.uploadMsg = message;
    this.uploadError = isError;
    setTimeout(() => {
      this.uploadMsg = null;
      this.cdr.markForCheck();
    }, isError ? 4000 : 3000);
  }

    /**
   * Notfallkontakte für Person laden
   */
    getNotfallkontakteByPersonId(personId: string): Observable<Notfallkontakt[]> {
      return this.personService.getNotfallkontakteByPersonId(personId);
    }

  // Utility methods
  private validateAllForms(): boolean {
    const forms = [
      this.grunddatenForm,
      this.kontaktdatenForm,
      this.zivilschutzForm,
      this.preferencesForm
    ];

    let isValid = true;
    forms.forEach(form => {
      if (form.invalid) {
        form.markAllAsTouched();
        isValid = false;
      }
    });

    return isValid;
  }

  private buildPersonData(): Omit<PersonDoc, 'id'> {
    const grunddaten = this.grunddatenForm.value;
    const kontaktdaten = this.kontaktdatenForm.value;
    const berufliches = this.beruflichesForm.value;
    const zivilschutz = this.zivilschutzForm.value;
    const persoenliches = this.persoenlichesForm.value;
    const preferences = this.preferencesForm.value;

    return {
      grunddaten: {
        ...grunddaten,
        geburtsdatum: new Date(grunddaten.geburtsdatum).getTime()
      },
      kontaktdaten,
      berufliches: {
        ...berufliches,
        führerausweisKategorie: this.parseCommaSeparated(berufliches.fuehrerausweisKategorie)
      },
      zivilschutz: {
        grundausbildung: zivilschutz.grundausbildung,
        status: zivilschutz.status,
        einteilung: {
          zug: zivilschutz.zug,
          gruppe: zivilschutz.gruppe || ''
        },
        zusatzausbildungen: this.parseCommaSeparated(zivilschutz.zusatzausbildungen)
      },
      persoenliches: {
        blutgruppe: persoenliches.blutgruppe,
        allergien: this.parseCommaSeparated(persoenliches.allergien),
        essgewohnheiten: this.parseCommaSeparated(persoenliches.essgewohnheiten),
        sprachkenntnisse: this.parseCommaSeparated(persoenliches.sprachkenntnisse),
        besonderheiten: this.parseCommaSeparated(persoenliches.besonderheiten)
      },
      preferences,
      erstelltAm: this.isNewPerson ? Date.now() : (this.person?.erstelltAm || Date.now()),
      aktualisiertAm: Date.now()
    };
  }

  private parseCommaSeparated(value: string): string[] {
    if (!value) return [];
    return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
  }

  private formatDateForInput(timestamp: any): string {
    if (!timestamp) return '';
    
    const date = typeof timestamp === 'number' 
      ? new Date(timestamp)
      : new Date(timestamp.seconds * 1000);
    
    return date.toISOString().split('T')[0];
  }

  private clearMessages(): void {
    this.errorMsg = null;
    this.successMsg = null;
  }

  // Getters for template
  get pageTitle(): string {
    if (this.isNewPerson) return 'Neue Person erfassen';
    if (!this.person) return 'Person laden...';
    return `${this.person.grunddaten.vorname} ${this.person.grunddaten.nachname}`;
  }

  get canEdit(): boolean {
    return true;
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return '-';
    
    try {
      const date = typeof timestamp === 'number' 
        ? new Date(timestamp)
        : new Date(timestamp.seconds * 1000);
      
      return date.toLocaleDateString('de-CH');
    } catch {
      return '-';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'aktiv': return 'Aktiv';
      case 'neu': return 'Neu';
      case 'inaktiv': return 'Inaktiv';
      default: return status;
    }
  }

  getFuehrerausweisKategorien(person: PersonDoc): string[] {
    return person.berufliches?.führerausweisKategorie || [];
  }

  hasFuehrerausweis(person: PersonDoc): boolean {
    return this.getFuehrerausweisKategorien(person).length > 0;
  }

  hasAllergien(person: PersonDoc): boolean {
    return person.persoenliches?.allergien?.length > 0;
  }

  hasEssgewohnheiten(person: PersonDoc): boolean {
    return person.persoenliches?.essgewohnheiten?.length > 0;
  }

  hasSprachkenntnisse(person: PersonDoc): boolean {
    return person.persoenliches?.sprachkenntnisse?.length > 0;
  }

  hasBesonderheiten(person: PersonDoc): boolean {
    return person.persoenliches?.besonderheiten?.length > 0;
  }

  hasZusatzausbildungen(person: PersonDoc): boolean {
    return person.zivilschutz?.zusatzausbildungen?.length > 0;
  }

  getContactMethodIcon(method: string): string {
    switch (method) {
      case 'digital': return 'computer';
      case 'paper': return 'description';
      case 'both': return 'swap_horiz';
      default: return 'help';
    }
  }

  getContactMethodClass(method: string): string {
    switch (method) {
      case 'digital': return 'text-blue-400';
      case 'paper': return 'text-amber-400';
      case 'both': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  }

  getContactMethodLabel(method: string): string {
    switch (method) {
      case 'digital': return 'Digital (E-Mail)';
      case 'paper': return 'Papier (Post)';
      case 'both': return 'Digital & Papier';
      default: return 'Nicht festgelegt';
    }
  }
}