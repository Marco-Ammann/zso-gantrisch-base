// src/app/shared/components/adzs-create-modal/adzs-create-modal.ts - Überarbeitet
import {
    Component,
    SimpleChanges,
    OnChanges,
    EventEmitter,
    Input,
    Output,
    OnInit,
    OnDestroy,
    inject,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
  } from '@angular/core';
  import { CommonModule } from '@angular/common';
  import {
    ReactiveFormsModule,
    FormBuilder,
    FormGroup,
    Validators,
  } from '@angular/forms';
  import { Subject, takeUntil } from 'rxjs';
  
  import { PersonService } from '@core/services/person.service';
  import { LoggerService } from '@core/services/logger.service';
  import { PersonDoc } from '@core/models/person.model';
  import { ZsoInputField } from '../../ui/zso-input-field/zso-input-field';
  import { ZsoButton } from '../../ui/zso-button/zso-button';
  
  interface Step {
    id: string;
    title: string;
    icon: string;
    optional?: boolean;
  }
  
  @Component({
    selector: 'zso-adzs-create-modal',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ZsoInputField, ZsoButton],
    templateUrl: './adzs-create-modal.html',
    styleUrls: ['./adzs-create-modal.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
  })
  export class AdzsCreateModal implements OnInit, OnChanges, OnDestroy {
  /** which accordion section is currently open; empty string = none */
  openSection: string = 'grunddaten';
    @Input() visible = false;
  /** Optional person for edit mode */
  @Input() person?: PersonDoc;

  /** Convenience flag */
  get isEditMode(): boolean { return !!this.person; }
    @Output() created = new EventEmitter<PersonDoc>();
    @Output() closed = new EventEmitter<void>();
  
    private readonly personService = inject(PersonService);
    private readonly logger = inject(LoggerService);
    private readonly fb = inject(FormBuilder);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly destroy$ = new Subject<void>();
  
    // State
    currentStep = 0;
    isSaving = false;
    isSubmitting = false;
    errorMsg: string | null = null;
    mainForm!: FormGroup;
  
    // Array fields
    selectedAllergien: string[] = [];
    selectedSprachen: string[] = [];
    selectedFuehrerausweis: string[] = [];
    selectedZusatzausbildungen: string[] = [];
    selectedEssgewohnheiten: string[] = [];
    selectedBesonderheiten: string[] = [];
  
    // Options - NEUE KATEGORISIERUNG
    readonly steps: Step[] = [
      { id: 'grunddaten', title: 'Grunddaten', icon: 'person' },
      { id: 'kontakt', title: 'Kontakt', icon: 'contact_mail' },
      { id: 'zivilschutz', title: 'Zivilschutz', icon: 'shield' },
      { id: 'beruflich', title: 'Beruflich', icon: 'work' },
      { id: 'persoenlich', title: 'Persönlich', icon: 'favorite' },
      { id: 'preferences', title: 'Präferenzen', icon: 'settings' },
      { id: 'zusammenfassung', title: 'Übersicht', icon: 'preview' },
    ];
  
    readonly gradOptions = [
      //add Fourier
      'Soldat',
      'Korporal',
      'Wachtmeister',
      'Oberwachtmeister',
      'Leutnant',
      'Oberleutnant',
      'Hauptmann',
    ];
  
    readonly funktionOptions = [
      'Betreuer',
      'C-Betreuer',
      'Betreuer Uof',
      'Gruppenführer',
      'Zugführer',
    ];
  
    readonly statusOptions = ['aktiv', 'neu', 'inaktiv'];
    readonly zugOptions = [1, 2];
    readonly gruppeOptions = ['A', 'B', 'C', 'D', 'keine Gruppe'];
    readonly fuehrerausweisKategorien = ['A', 'A1', 'B', 'B1', 'C', 'C1', 'D', 'D1', 'BE', 'C1E', 'CE', 'D1E', 'DE']; // TODO: add Führerausweis Kategorien von schweiz

  // Contact method dropdown options
  readonly contactMethodOptions = [
    { label: 'Digital (E-Mail)', value: 'digital' },
    { label: 'Papier (Post)', value: 'paper' },
    { label: 'Digital & Papier', value: 'both' },
  ];
  
    ngOnInit(): void {
      this.initForm();
      if (this.person) {
        this.patchFormFromPerson(this.person);
      }
      this.logger.log('AdzsCreateModal', 'Component initialized');
    }
  
    ngOnChanges(changes: SimpleChanges): void {
    // Detect if the dialog just became visible (opening)
    const becameVisible = changes['visible']?.currentValue === true && !changes['visible']?.previousValue;

    // 1. When the @Input person reference itself changes -> straightforward patch
    if (changes['person']?.currentValue) {
      if (!this.mainForm) {
        this.initForm();
      }
      this.patchFormFromPerson(changes['person'].currentValue as PersonDoc);
      return;
    }

    // 2. When the modal becomes visible (first open) but the person reference didn't change.
    //    In that case we rely on the already-set this.person instance.
    if (becameVisible && this.person) {
      if (!this.mainForm) {
        this.initForm();
      }
      this.patchFormFromPerson(this.person);
    }
  }

  ngOnDestroy(): void {
      this.destroy$.next();
      this.destroy$.complete();
      this.logger.log('AdzsCreateModal', 'Component destroyed');
    }
  
    private initForm(): void {
      // Build form

      this.mainForm = this.fb.group({
        // Grunddaten
        vorname: ['', Validators.required],
        nachname: ['', Validators.required],
        geburtsdatum: ['', Validators.required],
  
        // Kontaktdaten
        strasse: ['', Validators.required],
        plz: ['', Validators.required],
        ort: ['', Validators.required],
        email: ['', [Validators.email]], // optional but must be valid if provided
        telefonMobil: [''], // optional
        telefonFestnetz: [''],
        telefonGeschaeftlich: [''],
  
        // Zivilschutz
        grad: ['', Validators.required],
        funktion: ['', Validators.required],
        status: ['neu', Validators.required],
        grundausbildung: [''],
        zug: [1, Validators.required],
        gruppe: ['A', Validators.required],
  
        // Berufliches
        erlernterBeruf: [''],
        ausgeubterBeruf: [''],
        arbeitgeber: [''],
        zivileSpezialausbildung: [''],
        fuehrerausweis: [[]],
  
        // Persönliches
        blutgruppe: [''],
  
        // Preferences
        contactMethod: ['digital'],
        emailNotifications: [true],
      });

      // Trigger CD when form validity changes (important with OnPush)
      this.mainForm.statusChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.cdr.markForCheck());
    }
  
    // Step Navigation
    nextStep(): void {
      if (this.isCurrentStepValid() && this.currentStep < this.steps.length - 1) {
        this.currentStep++;
        this.cdr.markForCheck();
      }
    }
  
    previousStep(): void {
      if (this.currentStep > 0) {
        this.currentStep--;
        this.cdr.markForCheck();
      }
    }
  
    isCurrentStepValid(): boolean {
      const stepId = this.steps[this.currentStep].id;
  
      switch (stepId) {
        case 'grunddaten':
          return this.mainForm.get('vorname')?.valid &&
                 this.mainForm.get('nachname')?.valid &&
                 this.mainForm.get('geburtsdatum')?.valid || false;
  
        case 'kontakt':
          return this.mainForm.get('strasse')?.valid &&
                 this.mainForm.get('plz')?.valid &&
                 this.mainForm.get('ort')?.valid &&
                 this.mainForm.get('email')?.valid &&
                 this.mainForm.get('telefonMobil')?.valid || false;
  
        case 'zivilschutz':
          return this.mainForm.get('grad')?.valid &&
                 this.mainForm.get('funktion')?.valid &&
                 this.mainForm.get('status')?.valid &&
                 this.mainForm.get('zug')?.valid &&
                 this.mainForm.get('gruppe')?.valid || false;
  
        case 'beruflich':
        case 'persoenlich':
        case 'preferences':
          return true; // Optional steps
  
        default:
          return true;
      }
    }
  
    // Array Management
    addAllergie(value: string): void {
      if (value.trim() && !this.selectedAllergien.includes(value.trim())) {
        this.selectedAllergien.push(value.trim());
        this.cdr.markForCheck();
      }
    }
  
    removeAllergie(index: number): void {
      this.selectedAllergien.splice(index, 1);
      this.cdr.markForCheck();
    }
  
    addSprache(value: string): void {
      if (value.trim() && !this.selectedSprachen.includes(value.trim())) {
        this.selectedSprachen.push(value.trim());
        this.cdr.markForCheck();
      }
    }
  
    removeSprache(index: number): void {
      this.selectedSprachen.splice(index, 1);
      this.cdr.markForCheck();
    }
  
    addZusatzausbildung(value: string): void {
      if (value.trim() && !this.selectedZusatzausbildungen.includes(value.trim())) {
        this.selectedZusatzausbildungen.push(value.trim());
        this.cdr.markForCheck();
      }
    }
  
    removeZusatzausbildung(index: number): void {
      this.selectedZusatzausbildungen.splice(index, 1);
      this.cdr.markForCheck();
    }
  
    addEssgewohnheit(value: string): void {
      if (value.trim() && !this.selectedEssgewohnheiten.includes(value.trim())) {
        this.selectedEssgewohnheiten.push(value.trim());
        this.cdr.markForCheck();
      }
    }
  
    removeEssgewohnheit(index: number): void {
      this.selectedEssgewohnheiten.splice(index, 1);
      this.cdr.markForCheck();
    }
  
    addBesonderheit(value: string): void {
      if (value.trim() && !this.selectedBesonderheiten.includes(value.trim())) {
        this.selectedBesonderheiten.push(value.trim());
        this.cdr.markForCheck();
      }
    }
  
    removeBesonderheit(index: number): void {
      this.selectedBesonderheiten.splice(index, 1);
      this.cdr.markForCheck();
    }
  
    // Checkbox toggle handler for Führerausweiskategorien
  onFuehrerausweisToggle(kategorie: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked && !this.selectedFuehrerausweis.includes(kategorie)) {
      this.selectedFuehrerausweis.push(kategorie);
    } else if (!checked) {
      this.selectedFuehrerausweis = this.selectedFuehrerausweis.filter(k => k !== kategorie);
    }
    this.mainForm.get('fuehrerausweis')?.setValue(this.selectedFuehrerausweis);
    this.cdr.markForCheck();
  }

  // kept for backwards compatibility with multi-select <select> variant
  onFuehrerausweisChange(event: any): void {
      const selectedOptions = Array.from(event.target.selectedOptions, (option: any) => option.value);
      this.selectedFuehrerausweis = selectedOptions;
      this.cdr.markForCheck();
    }
  
    // Accordion toggle
  toggleSection(section: string, event: Event): void {
    event?.preventDefault();
    this.openSection = this.openSection === section ? '' : section;
    this.cdr.markForCheck();
  }

  // Utility
    getFormValue(field: string): any {
      return this.mainForm.get(field)?.value || '';
    }
  
    getContactMethodLabel(value: string): string {
      switch (value) {
        case 'digital': return 'Digital (E-Mail)';
        case 'paper': return 'Papier (Post)';
        case 'both': return 'Digital & Papier';
        default: return value;
      }
    }
  
    // Actions - IMPROVED DOUBLE-SUBMIT PROTECTION
    handleSave(): void {
      // Immediate protection against double-clicks
      if (this.isSaving || this.isSubmitting) {
        this.logger.warn('AdzsCreateModal', 'Save already in progress, ignoring duplicate call');
        return;
      }
  
      this.save();
    }
  
    save(): void {
  // In edit mode we allow saving regardless of form validity
  if (!this.isEditMode && this.mainForm.invalid) {
        this.mainForm.markAllAsTouched();
        this.errorMsg = 'Bitte füllen Sie alle Pflichtfelder aus.';
        return;
      }
  
      // Set both flags immediately
      this.isSaving = true;
      this.isSubmitting = true;
      this.errorMsg = null;
      this.cdr.markForCheck();
  
      const formData = this.mainForm.value;
      
      const personData: Omit<PersonDoc, 'id'> = {
        grunddaten: {
          vorname: formData.vorname,
          nachname: formData.nachname,
          geburtsdatum: new Date(formData.geburtsdatum).getTime(),
          grad: formData.grad,
          funktion: formData.funktion,
        },
        kontaktdaten: {
          strasse: formData.strasse,
          plz: formData.plz,
          ort: formData.ort,
          email: formData.email,
          telefonMobil: formData.telefonMobil,
          telefonFestnetz: formData.telefonFestnetz || '',
          telefonGeschaeftlich: formData.telefonGeschaeftlich || '',
        },
        berufliches: {
          erlernterBeruf: formData.erlernterBeruf || '',
          ausgeubterBeruf: formData.ausgeubterBeruf || '',
          arbeitgeber: formData.arbeitgeber || '',
          zivileSpezialausbildung: formData.zivileSpezialausbildung || '',
          führerausweisKategorie: this.selectedFuehrerausweis,
        },
        zivilschutz: {
          grundausbildung: formData.grundausbildung || '',
          status: formData.status,
          einteilung: {
            zug: formData.zug,
            gruppe: formData.gruppe,
          },
          zusatzausbildungen: this.selectedZusatzausbildungen,
        },
        persoenliches: {
          blutgruppe: formData.blutgruppe,
          allergien: this.selectedAllergien,
          essgewohnheiten: this.selectedEssgewohnheiten,
          sprachkenntnisse: this.selectedSprachen,
          besonderheiten: this.selectedBesonderheiten,
        },
        preferences: {
          contactMethod: formData.contactMethod,
          emailNotifications: formData.emailNotifications,
        },
        erstelltAm: Date.now(),
        aktualisiertAm: Date.now(),
      };
  
      if (this.isEditMode) {
        // Update existing
        const id = this.person!.id;
        this.logger.log('AdzsCreateModal', 'Updating person', id, personData);
        this.personService.update(id, { ...personData, aktualisiertAm: Date.now() }).pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            this.logger.log('AdzsCreateModal', 'Person updated successfully', id);
            this.created.emit({ ...personData, id } as PersonDoc);
            this.reset();
            this.closed.emit();
          },
          error: (error: any) => {
            this.logger.error('AdzsCreateModal', 'Error updating person:', error);
            this.errorMsg = 'Fehler beim Speichern der Person. Bitte versuchen Sie es erneut.';
            this.isSaving = false;
            this.isSubmitting = false;
            this.cdr.markForCheck();
          }
        });
        return;
      }

      this.logger.log('AdzsCreateModal', 'Creating person with data:', personData);
  
      this.personService.create(personData).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (personId: string) => {
          this.logger.log('AdzsCreateModal', 'Person created successfully', personId);
          this.created.emit({ ...personData, id: personId } as PersonDoc);
          this.reset();
          this.closed.emit();
        },
        error: (error: any) => {
          this.logger.error('AdzsCreateModal', 'Error creating person:', error);
          this.errorMsg = 'Fehler beim Erstellen der Person. Bitte versuchen Sie es erneut.';
          this.isSaving = false;
          this.isSubmitting = false;
          this.cdr.markForCheck();
        }
      });
    }
  
    cancel(): void {
      if (this.isSaving) {
        this.logger.warn('AdzsCreateModal', 'Cannot cancel while saving');
        return;
      }
      this.reset();
      this.closed.emit();
    }
  
    onBackdrop(event: MouseEvent): void {
      if (event.target === event.currentTarget && !this.isSaving) {
        this.cancel();
      }
    }
  
    private patchFormFromPerson(person: PersonDoc): void {
      // Grunddaten
      this.mainForm.patchValue({
        vorname: person.grunddaten.vorname,
        nachname: person.grunddaten.nachname,
        geburtsdatum: (() => {
          const v = person.grunddaten.geburtsdatum as any;
          const date = typeof v === 'number' ? new Date(v) : new Date(v.seconds * 1000);
          return date.toISOString().substring(0,10);
        })(),
        grad: person.grunddaten.grad,
        funktion: person.grunddaten.funktion,

        // Kontakt
        strasse: person.kontaktdaten.strasse,
        plz: person.kontaktdaten.plz,
        ort: person.kontaktdaten.ort,
        email: person.kontaktdaten.email,
        telefonMobil: person.kontaktdaten.telefonMobil,
        telefonFestnetz: person.kontaktdaten.telefonFestnetz,
        telefonGeschaeftlich: person.kontaktdaten.telefonGeschaeftlich,

        // Zivilschutz
        grundausbildung: person.zivilschutz.grundausbildung,
        status: person.zivilschutz.status,
        zug: person.zivilschutz.einteilung.zug,
        gruppe: person.zivilschutz.einteilung.gruppe,

        // Beruflich
        erlernterBeruf: person.berufliches.erlernterBeruf,
        ausgeubterBeruf: person.berufliches.ausgeubterBeruf,
        arbeitgeber: person.berufliches.arbeitgeber,
        zivileSpezialausbildung: person.berufliches.zivileSpezialausbildung,

        // Persönlich
        blutgruppe: person.persoenliches.blutgruppe,
        contactMethod: person.preferences?.contactMethod || 'digital',
        emailNotifications: person.preferences?.emailNotifications ?? true,
      });

      // Arrays
      this.selectedFuehrerausweis = (person.berufliches as any)['fuehrerausweisKategorie'] ?? [];
      this.selectedAllergien = person.persoenliches.allergien ?? [];
      this.selectedSprachen = person.persoenliches.sprachkenntnisse ?? [];
      this.selectedZusatzausbildungen = person.zivilschutz.zusatzausbildungen ?? [];
      this.selectedEssgewohnheiten = person.persoenliches.essgewohnheiten ?? [];
      this.selectedBesonderheiten = person.persoenliches.besonderheiten ?? [];

      this.cdr.markForCheck();
    }

    private reset(): void {
      this.currentStep = 0;
      this.isSaving = false;
      this.isSubmitting = false;
      this.errorMsg = null;
      this.selectedAllergien = [];
      this.selectedSprachen = [];
      this.selectedFuehrerausweis = [];

      this.selectedZusatzausbildungen = [];
      this.selectedEssgewohnheiten = [];
      this.selectedBesonderheiten = [];
      this.mainForm.reset({
        status: 'neu',
        zug: 1,
        gruppe: 'A',
        contactMethod: 'digital',
        emailNotifications: true
      });
      this.cdr.markForCheck();
    }
  }