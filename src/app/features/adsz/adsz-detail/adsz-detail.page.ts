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
import { Subject, Observable, takeUntil, switchMap, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
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
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-20px)' }),
        animate('250ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ])
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

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // State
  person: PersonDoc | null = null;
  notfallkontakte: NotfallkontaktDoc[] = [];
  isLoading = false;
  isEditing = false;
  isSaving = false;
  isNewPerson = false;
  isAdmin = false;
  uploading = false;
  
  // UI State
  activeTab: 'grunddaten' | 'kontakt' | 'beruflich' | 'zivilschutz' | 'persoenlich' | 'notfall' = 'grunddaten';
  errorMsg: string | null = null;
  successMsg: string | null = null;
  
  // Dialog States
  notfallkontaktDialogVisible = false;
  editingKontakt: NotfallkontaktDoc | null = null;
  deleteDialogVisible = false;
  isDeleting = false;

  // Forms
  mainForm!: FormGroup;

  // Form Options
  readonly gradOptions = [
    'Soldat', 'Korporal', 'Wachtmeister', 'Oberwachtmeister',
    'Adjutant', 'Leutnant', 'Oberleutnant', 'Hauptmann'
  ];
  
  readonly funktionOptions = [
    'Betreuer', 'C-Betreuer', 'Betreuer Uof', 'Gruppenführer', 'Zugführer'
  ];
  
  readonly statusOptions = ['aktiv', 'neu', 'inaktiv'];
  readonly zugOptions = [1, 2];
  readonly gruppeOptions = ['A', 'B', 'C', 'D'];
  
  readonly contactMethodOptions = [
    { value: 'digital', label: 'Digital (E-Mail)' },
    { value: 'paper', label: 'Papier (Post)' },
    { value: 'both', label: 'Digital & Papier' }
  ];

  // Computed Properties
  get isAdmin$() {
    return this.authService.appUser$.pipe(
      map(user => user?.doc.roles?.includes('admin') ?? false)
    );
  }

  get pageTitle(): string {
    if (this.isNewPerson) return 'Neue Person erfassen';
    return this.person ? 
      `${this.person.grunddaten.vorname} ${this.person.grunddaten.nachname}` : 
      'Person laden...';
  }

  get pageSubtitle(): string {
    if (this.isNewPerson) return 'Neue AdZS-Person zur Datenbank hinzufügen';
    return this.person ? 
      `${this.person.zivilschutz.einteilung.zug}. Zug, Gruppe ${this.person.zivilschutz.einteilung.gruppe} • ${this.person.grunddaten.grad}` : 
      '';
  }

  get selectedContactMethodLabel(): string {
    const selectedValue = this.mainForm.get('preferences.contactMethod')?.value;
    const option = this.contactMethodOptions.find(opt => opt.value === selectedValue);
    return option?.label || '—';
  }

  ngOnInit(): void {
    this.initializeForm();
    this.subscribeToRouteParams();
    this.subscribeToAdminStatus();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.logger.log('AdzsDetailPage', 'Component destroyed');
  }

  private initializeForm(): void {
    this.mainForm = this.fb.group({
      // Grunddaten
      grunddaten: this.fb.group({
        vorname: ['', Validators.required],
        nachname: ['', Validators.required],
        geburtsdatum: ['', Validators.required],
        grad: ['Soldat', Validators.required],
        funktion: ['Betreuer', Validators.required]
      }),
      
      // Kontaktdaten
      kontaktdaten: this.fb.group({
        strasse: ['', Validators.required],
        plz: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
        ort: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        telefonMobil: ['', Validators.required],
        telefonFestnetz: [''],
        telefonGeschaeftlich: ['']
      }),
      
      // Berufliches
      berufliches: this.fb.group({
        erlernterBeruf: [''],
        ausgeubterBeruf: [''],
        arbeitgeber: [''],
        zivileSpezialausbildung: [''],
        führerausweisKategorie: [[]]
      }),
      
      // Zivilschutz
      zivilschutz: this.fb.group({
        grundausbildung: [''],
        status: ['aktiv', Validators.required],
        einteilung: this.fb.group({
          zug: [1, Validators.required],
          gruppe: ['A', Validators.required]
        }),
        zusatzausbildungen: [[]]
      }),
      
      // Persönliches
      persoenliches: this.fb.group({
        blutgruppe: [''],
        allergien: [[]],
        essgewohnheiten: [[]],
        sprachkenntnisse: [[]],
        besonderheiten: [[]]
      }),
      
      // Preferences
      preferences: this.fb.group({
        contactMethod: ['digital'],
        emailNotifications: [true]
      })
    });
  }

  private subscribeToRouteParams(): void {
    this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id');
        this.logger.log('AdzsDetailPage', 'Route param ID:', id);

        if (id === 'new') {
          this.isNewPerson = true;
          this.isEditing = true;
          this.cdr.markForCheck();
          return of(null);
        } else if (id) {
          this.isNewPerson = false;
          this.loadPerson(id);
          return of(null);
        }
        
        this.logger.warn('AdzsDetailPage', 'No valid ID in route');
        this.router.navigate(['/adsz']);
        return of(null);
      }),
      takeUntil(this.destroy$)
    ).subscribe();
  }

  private subscribeToAdminStatus(): void {
    this.isAdmin$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(isAdmin => {
      this.isAdmin = isAdmin;
      this.cdr.markForCheck();
    });
  }

  private loadPerson(id: string): void {
    this.isLoading = true;
    this.errorMsg = null;
    
    this.personService.getById(id).pipe(
      catchError(error => {
        this.logger.error('AdzsDetailPage', 'Error loading person:', error);
        this.errorMsg = 'Fehler beim Laden der Person';
        return of(null);
      }),
      takeUntil(this.destroy$)
    ).subscribe(person => {
      this.isLoading = false;
      if (person) {
        this.person = person;
        this.populateForm();
        this.loadNotfallkontakte(id);
      } else {
        this.errorMsg = 'Person nicht gefunden';
      }
      this.cdr.markForCheck();
    });
  }

  private loadNotfallkontakte(personId: string): void {
    this.personService.getNotfallkontakteByPersonId(personId).pipe(
      takeUntil(this.destroy$)
    ).subscribe(kontakte => {
      this.notfallkontakte = kontakte;
      this.cdr.markForCheck();
    });
  }

  private populateForm(): void {
    if (!this.person) return;

    const formData = {
      grunddaten: {
        vorname: this.person.grunddaten.vorname,
        nachname: this.person.grunddaten.nachname,
        geburtsdatum: this.formatDateForInput(this.person.grunddaten.geburtsdatum),
        grad: this.person.grunddaten.grad,
        funktion: this.person.grunddaten.funktion
      },
      kontaktdaten: this.person.kontaktdaten,
      berufliches: {
        ...this.person.berufliches,
        führerausweisKategorie: this.person.berufliches.führerausweisKategorie || []
      },
      zivilschutz: {
        ...this.person.zivilschutz,
        zusatzausbildungen: this.person.zivilschutz.zusatzausbildungen || []
      },
      persoenliches: {
        ...this.person.persoenliches,
        allergien: this.person.persoenliches.allergien || [],
        essgewohnheiten: this.person.persoenliches.essgewohnheiten || [],
        sprachkenntnisse: this.person.persoenliches.sprachkenntnisse || [],
        besonderheiten: this.person.persoenliches.besonderheiten || []
      },
      preferences: {
        contactMethod: this.person.preferences?.contactMethod || 'digital',
        emailNotifications: this.person.preferences?.emailNotifications ?? true
      }
    };

    this.mainForm.patchValue(formData);
    
    // Set the correct enabled/disabled state
    if (this.isEditing) {
      this.mainForm.enable();
    } else {
      this.mainForm.disable();
    }
    
    this.cdr.markForCheck();
  }

  private formatDateForInput(date: any): string {
    if (!date) return '';
    
    let timestamp: number;
    if (typeof date === 'number') {
      timestamp = date;
    } else if (date.seconds) {
      timestamp = date.seconds * 1000;
    } else {
      return '';
    }
    
    return new Date(timestamp).toISOString().split('T')[0];
  }

  // Tab Navigation
  setActiveTab(tab: typeof this.activeTab): void {
    this.activeTab = tab;
    this.cdr.markForCheck();
  }

  // Form Actions
  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    this.errorMsg = null;
    this.successMsg = null;
    
    if (this.isEditing) {
      // Enable all form controls for editing
      this.mainForm.enable();
    } else {
      // Disable all form controls and reload form if not new person
      this.mainForm.disable();
      if (!this.isNewPerson) {
        this.populateForm();
      }
    }
    
    this.cdr.markForCheck();
  }

  save(): void {
    if (this.mainForm.invalid) {
      this.mainForm.markAllAsTouched();
      this.errorMsg = 'Bitte alle Pflichtfelder korrekt ausfüllen';
      this.activeTab = 'grunddaten'; // Go to first tab with errors
      this.cdr.markForCheck();
      return;
    }

    this.isSaving = true;
    this.errorMsg = null;
    
    const formData = this.mainForm.value;
    const personData: Omit<PersonDoc, 'id'> = {
      ...formData,
      grunddaten: {
        ...formData.grunddaten,
        geburtsdatum: new Date(formData.grunddaten.geburtsdatum).getTime()
      },
      erstelltAm: this.person?.erstelltAm || Date.now(),
      aktualisiertAm: Date.now()
    };

    if (this.isNewPerson) {
      // Create new person
      this.personService.create(personData).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (newPersonId: string) => {
          this.isSaving = false;
          this.successMsg = 'Person erfolgreich erstellt';
          this.isEditing = false;
          
          // Navigate to the new person's detail page
          setTimeout(() => {
            this.router.navigate(['/adsz', newPersonId]);
          }, 1500);
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            this.successMsg = null;
            this.cdr.markForCheck();
          }, 3000);
          
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          this.logger.error('AdzsDetailPage', 'Create error:', error);
          this.errorMsg = 'Fehler beim Erstellen der Person';
          this.isSaving = false;
          this.cdr.markForCheck();
        }
      });
    } else {
      // Update existing person
      this.personService.update(this.person!.id, personData).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          this.isSaving = false;
          this.successMsg = 'Änderungen gespeichert';
          this.isEditing = false;
          
          // Reload the person data
          this.loadPerson(this.person!.id);
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            this.successMsg = null;
            this.cdr.markForCheck();
          }, 3000);
          
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          this.logger.error('AdzsDetailPage', 'Update error:', error);
          this.errorMsg = 'Fehler beim Speichern der Änderungen';
          this.isSaving = false;
          this.cdr.markForCheck();
        }
      });
    }
  }

  deletePerson(): void {
    if (!this.person || !this.isAdmin) return;
    
    this.deleteDialogVisible = true;
    this.cdr.markForCheck();
  }

  confirmDelete(): void {
    if (!this.person) return;

    this.isDeleting = true;
    
    this.personService.delete(this.person.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.isDeleting = false;
        this.deleteDialogVisible = false;
        this.successMsg = 'Person erfolgreich gelöscht';
        setTimeout(() => {
          this.router.navigate(['/adsz']);
        }, 1500);
        this.cdr.markForCheck();
      },
      error: (error: any) => {
        this.logger.error('AdzsDetailPage', 'Delete error:', error);
        this.errorMsg = 'Fehler beim Löschen';
        this.isDeleting = false;
        this.deleteDialogVisible = false;
        this.cdr.markForCheck();
      }
    });
  }

  cancelDelete(): void {
    this.deleteDialogVisible = false;
    this.cdr.markForCheck();
  }

  onDeleteConfirmed(confirmed: boolean): void {
    if (confirmed) {
      this.confirmDelete();
    } else {
      this.cancelDelete();
    }
  }

  // Avatar Upload
  triggerFileUpload(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file || !this.person) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      this.errorMsg = 'Bitte wählen Sie eine Bilddatei aus';
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      this.errorMsg = 'Bild ist zu groß (max. 5MB)';
      return;
    }

    this.uploadAvatar(file);
  }

  private uploadAvatar(file: File): void {
    this.uploading = true;
    this.errorMsg = null;

    const storage = getStorage();
    const fileName = `person-avatars/${this.person!.id}_${Date.now()}_${file.name}`;
    const storageRef = ref(storage, fileName);

    uploadBytes(storageRef, file).then(() => {
      return getDownloadURL(storageRef);
    }).then(downloadURL => {
      // Update person with new photo URL
      return this.personService.update(this.person!.id, { photoUrl: downloadURL });
    }).then(() => {
      this.successMsg = 'Avatar erfolgreich aktualisiert';
      // Reload person data
      this.loadPerson(this.person!.id);
      
      setTimeout(() => {
        this.successMsg = null;
        this.cdr.markForCheck();
      }, 3000);
    }).catch(error => {
      this.logger.error('AdzsDetailPage', 'Avatar upload error:', error);
      this.errorMsg = 'Fehler beim Hochladen des Avatars';
    }).finally(() => {
      this.uploading = false;
      this.cdr.markForCheck();
    });
  }

  // Notfallkontakte
  addNotfallkontakt(): void {
    if (!this.person) return;
    
    this.editingKontakt = null;
    this.notfallkontaktDialogVisible = true;
    this.cdr.markForCheck();
  }

  editNotfallkontakt(kontakt: NotfallkontaktDoc): void {
    this.editingKontakt = kontakt;
    this.notfallkontaktDialogVisible = true;
    this.cdr.markForCheck();
  }

  onNotfallkontaktSaved(kontaktData: any): void {
    if (!this.person) return;

    const operation$: Observable<string | void> = this.editingKontakt ? 
      this.personService.updateNotfallkontakt(this.editingKontakt.id, kontaktData) :
      this.personService.createNotfallkontakt({
        ...kontaktData,
        personId: this.person.id,
      });

    operation$.pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (result: string | void) => {
        if (this.editingKontakt || result) {
          this.successMsg = this.editingKontakt ? 
            'Notfallkontakt aktualisiert' : 
            'Notfallkontakt hinzugefügt';
          
          this.loadNotfallkontakte(this.person!.id);
          
          setTimeout(() => {
            this.successMsg = null;
            this.cdr.markForCheck();
          }, 3000);
        }
        
        this.notfallkontaktDialogVisible = false;
        this.editingKontakt = null;
        this.cdr.markForCheck();
      },
      error: (error: any) => {
        this.logger.error('AdzsDetailPage', 'Notfallkontakt save error:', error);
        this.errorMsg = 'Fehler beim Speichern des Notfallkontakts';
        this.notfallkontaktDialogVisible = false;
        this.editingKontakt = null;
        this.cdr.markForCheck();
      }
    });
  }

  onNotfallkontaktDialogClosed(): void {
    this.notfallkontaktDialogVisible = false;
    this.editingKontakt = null;
    this.cdr.markForCheck();
  }

  deleteNotfallkontakt(kontakt: NotfallkontaktDoc): void {
    if (!confirm(`Notfallkontakt "${kontakt.name}" wirklich löschen?`)) return;

    this.personService.deleteNotfallkontakt(kontakt.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.successMsg = 'Notfallkontakt gelöscht';
        this.loadNotfallkontakte(this.person!.id);
        
        setTimeout(() => {
          this.successMsg = null;
          this.cdr.markForCheck();
        }, 3000);
        
        this.cdr.markForCheck();
      },
      error: (error: any) => {
        this.logger.error('AdzsDetailPage', 'Delete kontakt error:', error);
        this.errorMsg = 'Fehler beim Löschen des Notfallkontakts';
        this.cdr.markForCheck();
      }
    });
  }

  // Navigation
  goBack(): void {
    this.router.navigate(['/adsz']);
  }

  // Utility
  getPersonInitials(): string {
    if (!this.person) return '?';
    const first = this.person.grunddaten.vorname.charAt(0);
    const last = this.person.grunddaten.nachname.charAt(0);
    return `${first}${last}`.toUpperCase();
  }

  clearMessages(): void {
    this.errorMsg = null;
    this.successMsg = null;
    this.cdr.markForCheck();
  }
}