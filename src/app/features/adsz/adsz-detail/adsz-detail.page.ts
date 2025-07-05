// src/app/features/adsz/adsz-detail/adsz-detail.page.ts
import {
  Component,
  inject,
  OnDestroy,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, takeUntil, switchMap, of, lastValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from '@angular/fire/storage';

import { PersonService } from '@core/services/person.service';
import { AuthService } from '@core/auth/services/auth.service';
import { LoggerService } from '@core/services/logger.service';
import { PersonDoc, NotfallkontaktDoc } from '@core/models/person.model';
import { ZsoInputField } from '@shared/ui/zso-input-field/zso-input-field';
import { NotfallkontaktDialogComponent } from '@shared/components/notfallkontakt-dialog/notfallkontakt-dialog';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog';

@Component({
  selector: 'zso-adsz-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ZsoInputField,
    NotfallkontaktDialogComponent,
    ConfirmationDialogComponent,
  ],
  templateUrl: './adsz-detail.page.html',
  styleUrls: ['./adsz-detail.page.scss'],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate(
          '300ms ease-out',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
    ]),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  // Delete-Dialog State
  deleteDialogVisible = false;
  isDeleting = false;
  isAdmin = false;

  // Dialog states
  notfallkontaktDialogVisible = false;
  editingKontakt: NotfallkontaktDoc | null = null;

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
    map((user) => user?.doc.roles?.includes('admin') ?? false)
  );

  // Form options
  readonly gradOptions = [
    'Soldat',
    'Korporal',
    'Leutnant',
    'Oberleutnant',
    'Hauptmann',
  ];
  readonly funktionOptions = [
    'Betreuer',
    'C-Betreuer',
    'Betreuer Uof',
    'Zugführer',
  ];
  readonly statusOptions = ['aktiv', 'neu', 'inaktiv'];
  readonly zugOptions = [1, 2];
  readonly gruppeOptions = ['A', 'B', 'C', 'D'];
  readonly contactMethodOptions = [
    { value: 'digital', label: 'Digital (E-Mail)' },
    { value: 'paper', label: 'Papier (Post)' },
    { value: 'both', label: 'Digital & Papier' },
  ];
  readonly blutgruppenOptions = ['A', 'A+', 'A-', 'B', 'B+', 'B-', 'AB', 'AB+', 'AB-', 'O', 'O+', 'O-'];
  readonly fuehrerausweisKategorien = [
    'A', 'A1', 'B', 'BE', 'C', 'CE', 'D', 'DE', 'F', 'G', 'M'
  ];

  // In der ngOnInit() Methode das isAdmin$ Observable subscriben
  ngOnInit(): void {
    this.initializeForms();
  
    // Admin-Status subscriben
    this.isAdmin$.pipe(takeUntil(this.destroy$)).subscribe(isAdmin => {
      this.isAdmin = isAdmin;
      this.cdr.markForCheck();
    });
  
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = params.get('id');
          this.logger.log('AdzsDetailPage', 'Route params - ID:', id);
  
          if (id === 'new') {
            this.isNewPerson = true;
            this.isEditing = true;
            this.cdr.markForCheck();
            return of(null);
          } else if (id) {
            this.isNewPerson = false;
            this.isEditing = false;
            this.logger.log('AdzsDetailPage', 'Loading person with ID:', id);
            return this.personService.getById(id);
          }
  
          this.logger.warn('AdzsDetailPage', 'No valid ID found in route params');
          return of(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (person) => {
          this.logger.log('AdzsDetailPage', 'Person loaded:', person);
          
          if (person) {
            this.person = person;
            this.populateForms(person);
            this.loadNotfallkontakte(person.id);
          } else if (this.isNewPerson) {
            this.initializeNewPersonForms();
          }
          
          // Forms nach dem Laden richtig enablen/disablen
          this.updateFormStates();
          
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.logger.error('AdzsDetailPage', 'Error loading person:', error);
          this.errorMsg = 'Fehler beim Laden der Person';
          this.cdr.markForCheck();
        },
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
      funktion: ['', Validators.required],
    });

    this.kontaktdatenForm = this.fb.group({
      strasse: ['', Validators.required],
      plz: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
      ort: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telefonMobil: ['', Validators.required],
      telefonFestnetz: [''],
      telefonGeschaeftlich: [''],
    });

    this.beruflichesForm = this.fb.group({
      erlernterBeruf: [''],
      ausgeubterBeruf: [''],
      arbeitgeber: [''],
      zivileSpezialausbildung: [''],
      fuehrerausweisKategorie: [''],
    });

    this.zivilschutzForm = this.fb.group({
      grundausbildung: ['', Validators.required],
      status: ['aktiv', Validators.required],
      zug: [1, Validators.required],
      gruppe: [''],
      zusatzausbildungen: [''],
    });

    this.persoenlichesForm = this.fb.group({
      blutgruppe: [''],
      allergien: [''],
      essgewohnheiten: [''],
      sprachkenntnisse: [''],
      besonderheiten: [''],
    });

    this.preferencesForm = this.fb.group({
      contactMethod: ['digital', Validators.required],
      emailNotifications: [true],
    });
  }

  private initializeNewPersonForms(): void {
    // Grunddaten mit Standardwerten
    this.grunddatenForm.patchValue({
      vorname: '',
      nachname: '',
      geburtsdatum: '',
      grad: '',
      funktion: '',
    });

    // Kontaktdaten mit Standardwerten
    this.kontaktdatenForm.patchValue({
      strasse: '',
      plz: '',
      ort: '',
      email: '',
      telefonMobil: '',
      telefonFestnetz: '',
      telefonGeschaeftlich: '',
    });

    // Zivilschutz mit Standardwerten
    this.zivilschutzForm.patchValue({
      grundausbildung: '',
      status: 'neu', // Standardwert für neue Personen
      zug: '',
      gruppe: '',
      zusatzausbildungen: '',
    });

    // Berufliches mit Standardwerten
    this.beruflichesForm.patchValue({
      erlernterBeruf: '',
      ausgeubterBeruf: '',
      arbeitgeber: '',
      zivileSpezialausbildung: '',
      fuehrerausweisKategorie: '',
    });

    // Persönliches mit Standardwerten
    this.persoenlichesForm.patchValue({
      blutgruppe: '',
      allergien: '',
      essgewohnheiten: '',
      sprachkenntnisse: '',
      besonderheiten: '',
    });

    // Präferenzen mit Standardwerten
    this.preferencesForm.patchValue({
      contactMethod: 'digital',
      emailNotifications: true,
    });
  }

  private populateForms(person: PersonDoc): void {
    // Helper function to safely get timestamp value
    const getTimestamp = (timestamp: any): number => {
      if (!timestamp) return 0;
      if (typeof timestamp === 'number') return timestamp;
      if (timestamp.seconds) return timestamp.seconds * 1000;
      return 0;
    };

    // Format date for input field
    const birthTimestamp = getTimestamp(person.grunddaten.geburtsdatum);
    const birthDate = birthTimestamp
      ? new Date(birthTimestamp).toISOString().split('T')[0]
      : '';

    // Populate Grunddaten
    this.grunddatenForm.patchValue({
      vorname: person.grunddaten.vorname || '',
      nachname: person.grunddaten.nachname || '',
      geburtsdatum: birthDate,
      grad: person.grunddaten.grad || '',
      funktion: person.grunddaten.funktion || '',
    });

    // Populate Kontaktdaten
    this.kontaktdatenForm.patchValue({
      strasse: person.kontaktdaten.strasse || '',
      plz: person.kontaktdaten.plz || '',
      ort: person.kontaktdaten.ort || '',
      email: person.kontaktdaten.email || '',
      telefonMobil: person.kontaktdaten.telefonMobil || '',
      telefonFestnetz: person.kontaktdaten.telefonFestnetz || '',
      telefonGeschaeftlich: person.kontaktdaten.telefonGeschaeftlich || '',
    });

    // Populate Berufliches
    this.beruflichesForm.patchValue({
      erlernterBeruf: person.berufliches.erlernterBeruf || '',
      ausgeubterBeruf: person.berufliches.ausgeubterBeruf || '',
      arbeitgeber: person.berufliches.arbeitgeber || '',
      zivileSpezialausbildung: person.berufliches.zivileSpezialausbildung || '',
      fuehrerausweisKategorie: (
        person.berufliches.führerausweisKategorie || []
      ).join(', '),
    });

    // Populate Zivilschutz
    this.zivilschutzForm.patchValue({
      grundausbildung: person.zivilschutz.grundausbildung || '',
      status: person.zivilschutz.status || 'aktiv',
      zug: person.zivilschutz.einteilung?.zug || 1,
      gruppe: person.zivilschutz.einteilung?.gruppe || '',
      zusatzausbildungen: (person.zivilschutz.zusatzausbildungen || []).join(
        ', '
      ),
    });

    // Populate Persönliches
    this.persoenlichesForm.patchValue({
      blutgruppe: person.persoenliches.blutgruppe || '',
      allergien: (person.persoenliches.allergien || []).join(', '),
      essgewohnheiten: (person.persoenliches.essgewohnheiten || []).join(', '),
      sprachkenntnisse: (person.persoenliches.sprachkenntnisse || []).join(
        ', '
      ),
      besonderheiten: (person.persoenliches.besonderheiten || []).join(', '),
    });

    // Populate Preferences
    this.preferencesForm.patchValue({
      contactMethod: person.preferences?.contactMethod || 'digital',
      emailNotifications: person.preferences?.emailNotifications ?? true,
    });

    this.logger.log('AdzsDetailPage', 'Forms populated successfully');
  }

  private loadNotfallkontakte(personId: string): void {
    // Defensive check
    if (!personId || personId === 'undefined' || personId.trim() === '') {
      this.logger.error(
        'AdzsDetailPage',
        'Cannot load emergency contacts: invalid personId:',
        personId
      );
      return;
    }

    this.logger.log(
      'AdzsDetailPage',
      `Loading emergency contacts for person: ${personId}`
    );

    this.personService
      .getNotfallkontakte(personId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (kontakte) => {
          this.logger.log(
            'AdzsDetailPage',
            `Loaded ${kontakte.length} emergency contacts:`,
            kontakte
          );
          this.notfallkontakte = kontakte.sort(
            (a, b) => a.prioritaet - b.prioritaet
          );
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.logger.error(
            'AdzsDetailPage',
            'Error loading emergency contacts:',
            error
          );
          // Don't show error to user for emergency contacts, just log it
          this.notfallkontakte = [];
          this.cdr.markForCheck();
        },
      });
  }

  // Actions
  toggleEdit(): void {
    if (this.isNewPerson) {
      return;
    }
  
    this.isEditing = !this.isEditing;
    this.clearMessages();
    
    if (!this.isEditing && this.person) {
      this.populateForms(this.person);
    }
    
    // Forms enablen/disablen
    this.updateFormStates();
    
    this.logger.log('AdzsDetailPage', 'Edit mode toggled:', this.isEditing);
    this.cdr.markForCheck();
  }

  edit(): void {
    this.toggleEdit();
  }

  save(): void {
    if (!this.validateAllForms()) {
      this.errorMsg = 'Bitte alle Pflichtfelder ausfüllen';
      this.scrollToTop();
      return;
    }
  
    this.isSaving = true;
    this.clearMessages();
  
    const personData = this.buildPersonData();
  
    if (this.isNewPerson) {
      this.logger.log('AdzsDetailPage', 'Creating new person:', personData);
  
      this.personService
        .create(personData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (newId: string) => {
            this.logger.log('AdzsDetailPage', 'Person created with ID:', newId);
            this.successMsg = 'Person erfolgreich erstellt';
            this.isEditing = false;
            this.isNewPerson = false;
            this.isSaving = false;
            
            // Forms disablen nach dem Speichern
            this.updateFormStates();
            
            this.router.navigate(['/adsz', newId], { replaceUrl: true });
            this.cdr.markForCheck();
          },
          error: (error: any) => {
            this.logger.error('AdzsDetailPage', 'Create error:', error);
            this.errorMsg = 'Fehler beim Erstellen der Person';
            this.isSaving = false;
            this.scrollToTop();
            this.cdr.markForCheck();
          },
        });
    } else if (this.person?.id) {
      this.logger.log('AdzsDetailPage', 'Updating person with ID:', this.person.id, personData);
  
      this.personService
        .update(this.person.id, personData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.logger.log('AdzsDetailPage', 'Person updated successfully');
            this.successMsg = 'Änderungen erfolgreich gespeichert';
            this.isEditing = false;
            this.isSaving = false;
            
            // Forms disablen nach dem Speichern
            this.updateFormStates();
            
            this.person = { ...this.person!, ...personData } as PersonDoc;
            this.scrollToTop();
            this.cdr.markForCheck();
          },
          error: (error: any) => {
            this.logger.error('AdzsDetailPage', 'Update error:', error);
            this.errorMsg = 'Fehler beim Speichern der Änderungen';
            this.isSaving = false;
            this.scrollToTop();
            this.cdr.markForCheck();
          },
        });
    }
  }

  private updateFormStates(): void {
    const forms = [
      this.grunddatenForm,
      this.kontaktdatenForm,
      this.beruflichesForm,
      this.zivilschutzForm,
      this.persoenlichesForm,
      this.preferencesForm
    ];
  
    forms.forEach(form => {
      if (form) {
        if (this.isEditing) {
          form.enable();
        } else {
          form.disable();
        }
      }
    });
  }

  // Cancel Methode korrigieren
  cancel(): void {
    if (this.isNewPerson) {
      // Bei neuen Personen: zurück zur Übersicht
      this.router.navigate(['/adsz']);
    } else {
      // Bei bestehenden Personen: Edit-Modus verlassen
      this.isEditing = false;
      if (this.person) {
        this.populateForms(this.person);
      }
      this.clearMessages();
    }
    this.cdr.markForCheck();
  }

  back(): void {
    this.router.navigate(['/adsz']);
  }

  generatePDF(): void {
    if (!this.person) return;

    this.logger.log(
      'AdzsDetailPage',
      'Generate PDF for person',
      this.person.id
    );
    this.successMsg = 'PDF-Generierung wird implementiert...';
    this.cdr.markForCheck();
  }

  // Notfallkontakt Management
  openNotfallkontaktDialog(): void {
    this.editingKontakt = null;
    this.notfallkontaktDialogVisible = true;
  }

  editNotfallkontakt(kontakt: NotfallkontaktDoc): void {
    this.editingKontakt = kontakt;
    this.notfallkontaktDialogVisible = true;
  }

  onNotfallkontaktSaved(kontaktData: any): void {
    if (!this.person) return;

    if (kontaktData.id) {
      // Update existing
      this.personService
        .updateNotfallkontakt(kontaktData.id, kontaktData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadNotfallkontakte(this.person!.id);
            this.successMsg = 'Notfallkontakt aktualisiert';
            this.notfallkontaktDialogVisible = false;
            this.cdr.markForCheck();
          },
          error: (error) => {
            this.logger.error(
              'AdzsDetailPage',
              'Error updating emergency contact:',
              error
            );
            this.errorMsg = 'Fehler beim Aktualisieren des Notfallkontakts';
            this.cdr.markForCheck();
          },
        });
    } else {
      // Create new
      this.personService
        .createNotfallkontakt(kontaktData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadNotfallkontakte(this.person!.id);
            this.successMsg = 'Notfallkontakt hinzugefügt';
            this.notfallkontaktDialogVisible = false;
            this.cdr.markForCheck();
          },
          error: (error) => {
            this.logger.error(
              'AdzsDetailPage',
              'Error creating emergency contact:',
              error
            );
            this.errorMsg = 'Fehler beim Hinzufügen des Notfallkontakts';
            this.cdr.markForCheck();
          },
        });
    }
  }

  onNotfallkontaktDialogClosed(): void {
    this.notfallkontaktDialogVisible = false;
    this.editingKontakt = null;
  }

  deleteNotfallkontakt(kontaktId: string): void {
    if (!confirm('Notfallkontakt wirklich löschen?')) return;

    this.personService
      .deleteNotfallkontakt(kontaktId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadNotfallkontakte(this.person!.id);
          this.successMsg = 'Notfallkontakt gelöscht';
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.logger.error(
            'AdzsDetailPage',
            'Error deleting emergency contact:',
            error
          );
          this.errorMsg = 'Fehler beim Löschen des Notfallkontakts';
          this.cdr.markForCheck();
        },
      });
  }

  // File Upload
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

    uploadBytes(storageRef, file)
      .then(() => getDownloadURL(storageRef))
      .then((downloadUrl: string) => {
        // Variable umbenennen
        if (!this.person) return;
        return lastValueFrom(
          this.personService.update(this.person.id, { photoUrl: downloadUrl })
        );
      })
      .then(() => {
        this.showToast('Avatar aktualisiert', false);
        // Page wird automatisch neu geladen, kein manuelles Update nötig
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

  openDeleteDialog(): void {
    if (!this.person) return;

    this.deleteDialogVisible = true;
    this.logger.log(
      'AdzsDetailPage',
      'Delete dialog opened for person',
      this.person.id
    );
  }

  onDeleteConfirmed(confirmed: boolean): void {
    this.deleteDialogVisible = false;

    if (confirmed && this.person?.id) {
      this.deletePerson();
    }
  }

  private deletePerson(): void {
    if (!this.person?.id) return;

    this.isDeleting = true;
    this.clearMessages();

    const personName = `${this.person.grunddaten.vorname} ${this.person.grunddaten.nachname}`;
    this.logger.log('AdzsDetailPage', 'Deleting person:', personName);

    this.personService
      .deletePersonWithNotfallkontakte(this.person.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.logger.log(
            'AdzsDetailPage',
            'Person deleted successfully:',
            personName
          );
          this.successMsg = `${personName} wurde erfolgreich gelöscht`;
          this.isDeleting = false;

          // Nach 2 Sekunden zur Übersicht zurückkehren
          setTimeout(() => {
            this.router.navigate(['/adsz']);
          }, 2000);

          this.cdr.markForCheck();
        },
        error: (error: any) => {
          this.logger.error('AdzsDetailPage', 'Delete error:', error);
          this.errorMsg = `Fehler beim Löschen von ${personName}`;
          this.isDeleting = false;
          this.scrollToTop();
          this.cdr.markForCheck();
        },
      });
  }

  // Getter für Template
  get deleteDialogTitle(): string {
    if (!this.person) return 'Person löschen';
    return `${this.person.grunddaten.vorname} ${this.person.grunddaten.nachname} löschen`;
  }

  get deleteDialogMessage(): string {
    if (!this.person) return 'Möchten Sie diese Person wirklich löschen?';

    const notfallkontakteCount = this.notfallkontakte.length;
    const baseMessage = `Möchten Sie ${this.person.grunddaten.vorname} ${this.person.grunddaten.nachname} wirklich löschen?`;

    if (notfallkontakteCount > 0) {
      return `${baseMessage}\n\nDabei werden auch ${notfallkontakteCount} Notfallkontakt${
        notfallkontakteCount > 1 ? 'e' : ''
      } gelöscht.\n\nDiese Aktion kann nicht rückgängig gemacht werden.`;
    }

    return `${baseMessage}\n\nDiese Aktion kann nicht rückgängig gemacht werden.`;
  }

  // Utility methods
  calculateAge(geburtsdatum: any): number {
    if (!geburtsdatum) return 0;

    const birthDate =
      typeof geburtsdatum === 'number'
        ? new Date(geburtsdatum)
        : new Date(geburtsdatum.seconds * 1000);

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  }

  private validateAllForms(): boolean {
    const forms = [
      this.grunddatenForm,
      this.kontaktdatenForm,
      this.zivilschutzForm,
      this.preferencesForm,
    ];

    let isValid = true;
    forms.forEach((form) => {
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
        vorname: grunddaten.vorname,
        nachname: grunddaten.nachname,
        geburtsdatum: new Date(grunddaten.geburtsdatum).getTime(),
        grad: grunddaten.grad,
        funktion: grunddaten.funktion,
      },
      kontaktdaten,
      berufliches: {
        erlernterBeruf: berufliches.erlernterBeruf,
        ausgeubterBeruf: berufliches.ausgeubterBeruf,
        arbeitgeber: berufliches.arbeitgeber,
        zivileSpezialausbildung: berufliches.zivileSpezialausbildung,
        führerausweisKategorie: this.parseCommaSeparated(
          berufliches.fuehrerausweisKategorie
        ),
      },
      zivilschutz: {
        grundausbildung: zivilschutz.grundausbildung,
        status: zivilschutz.status,
        einteilung: {
          zug: zivilschutz.zug,
          gruppe: zivilschutz.gruppe || '',
        },
        zusatzausbildungen: this.parseCommaSeparated(
          zivilschutz.zusatzausbildungen
        ),
      },
      persoenliches: {
        blutgruppe: persoenliches.blutgruppe,
        allergien: this.parseCommaSeparated(persoenliches.allergien),
        essgewohnheiten: this.parseCommaSeparated(
          persoenliches.essgewohnheiten
        ),
        sprachkenntnisse: this.parseCommaSeparated(
          persoenliches.sprachkenntnisse
        ),
        besonderheiten: this.parseCommaSeparated(persoenliches.besonderheiten),
      },
      preferences,
      erstelltAm: this.isNewPerson
        ? Date.now()
        : this.person?.erstelltAm || Date.now(),
      aktualisiertAm: Date.now(),
    };
  }

  private parseCommaSeparated(value: string): string[] {
    if (!value) return [];
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private clearMessages(): void {
    this.errorMsg = null;
    this.successMsg = null;
  }

  private scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private showToast(message: string, isError: boolean): void {
    this.uploadMsg = message;
    this.uploadError = isError;
    this.cdr.markForCheck();

    // Auto-hide nach 3 Sekunden
    setTimeout(() => {
      this.uploadMsg = null;
      this.uploadError = false;
      this.uploading = false;
      this.clearMessages();
      this.cdr.markForCheck();
    }, 3000);
  }

  // Template helpers
  get pageTitle(): string {
    if (this.isNewPerson) return 'Neue Person erfassen';
    if (!this.person) return 'Person laden...';
    return `${this.person.grunddaten.vorname} ${this.person.grunddaten.nachname}`;
  }

  // Korrigierte Getter-Methoden
  get canEdit(): boolean {
    return this.isAdmin;
  }

  get showEditButton(): boolean {
    return this.canEdit && !this.isEditing && !this.isNewPerson;
  }

  get showSaveButton(): boolean {
    return this.isEditing;
  }

  get showCancelButton(): boolean {
    return this.isEditing;
  }

  get showDeleteButton(): boolean {
    return this.canEdit && !this.isEditing && !this.isNewPerson;
  }

  getPersonInitials(person: PersonDoc): string {
    return `${person.grunddaten.vorname.charAt(
      0
    )}${person.grunddaten.nachname.charAt(0)}`;
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return '-';

    try {
      const date =
        typeof timestamp === 'number'
          ? new Date(timestamp)
          : new Date(timestamp.seconds * 1000);

      return date.toLocaleDateString('de-CH');
    } catch {
      return '-';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'aktiv':
        return 'Aktiv';
      case 'neu':
        return 'Neu';
      case 'inaktiv':
        return 'Inaktiv';
      default:
        return status;
    }
  }

  getFuehrerausweisKategorien(person: PersonDoc): string[] {
    return person.berufliches?.führerausweisKategorie || [];
  }

  hasFuehrerausweis(person: PersonDoc): boolean {
    return this.getFuehrerausweisKategorien(person).length > 0;
  }

  getContactMethodLabel(method: string): string {
    switch (method) {
      case 'digital':
        return 'Digital (E-Mail)';
      case 'paper':
        return 'Papier (Post)';
      case 'both':
        return 'Digital & Papier';
      default:
        return 'Nicht festgelegt';
    }
  }

  // Handle Führerschein category changes
  onFuehrerausweisChange(event: any, category: string): void {
    const currentCategories = this.beruflichesForm.get('fuehrerausweisKategorie')?.value || [];
    let updatedCategories: string[];

    if (event.target.checked) {
      updatedCategories = [...currentCategories, category];
    } else {
      updatedCategories = currentCategories.filter((c: string) => c !== category);
    }

    this.beruflichesForm.patchValue({
      fuehrerausweisKategorie: updatedCategories
    });
  }

  // Handle removing additional training
  removeZusatzausbildung(index: number): void {
    const currentTrainings = this.parseCommaSeparated(this.zivilschutzForm.get('zusatzausbildungen')?.value);
    currentTrainings.splice(index, 1);
    this.zivilschutzForm.patchValue({
      zusatzausbildungen: currentTrainings.join(', ')
    });
  }

  // Handle adding new additional training
  addZusatzausbildung(): void {
    const newTraining = prompt('Bitte geben Sie die Zusatzausbildung ein:');
    if (newTraining && newTraining.trim()) {
      const currentTrainings = this.parseCommaSeparated(this.zivilschutzForm.get('zusatzausbildungen')?.value);
      currentTrainings.push(newTraining.trim());
      this.zivilschutzForm.patchValue({
        zusatzausbildungen: currentTrainings.join(', ')
      });
    }
  }

  // Generic method to remove item from array fields
  removeFromArray(fieldName: string, index: number): void {
    const currentValues = this.parseCommaSeparated(this.persoenlichesForm.get(fieldName)?.value);
    currentValues.splice(index, 1);
    this.persoenlichesForm.patchValue({
      [fieldName]: currentValues.join(', ')
    });
  }

  // Generic method to add item to array fields
  addToArray(fieldName: string): void {
    const labelMap: {[key: string]: string} = {
      'allergien': 'Allergie',
      'essgewohnheiten': 'Essgewohnheit',
      'sprachkenntnisse': 'Sprachkenntnis',
      'besonderheiten': 'Besonderheit'
    };

    const label = labelMap[fieldName] || 'Eintrag';
    const newValue = prompt(`Bitte geben Sie eine ${label} ein:`);
    
    if (newValue && newValue.trim()) {
      const currentValues = this.parseCommaSeparated(this.persoenlichesForm.get(fieldName)?.value);
      currentValues.push(newValue.trim());
      this.persoenlichesForm.patchValue({
        [fieldName]: currentValues.join(', ')
      });
    }
  }

  // Convert Firestore timestamp to Date
  getDateFromTimestamp(timestamp: any): Date {
    if (!timestamp) return new Date();
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000);
    }
    return new Date(timestamp);
  }

  private debugRoute(): void {
    this.route.params.subscribe((params) => {
      this.logger.log('AdzsDetailPage', 'Route params:', params);
    });

    this.route.paramMap.subscribe((paramMap) => {
      this.logger.log('AdzsDetailPage', 'Route paramMap:', {
        id: paramMap.get('id'),
        keys: paramMap.keys,
        params: Object.fromEntries(
          paramMap.keys.map((key) => [key, paramMap.get(key)])
        ),
      });
    });
  }
}
