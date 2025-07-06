// src/app/shared/components/adzs-create-modal/adzs-create-modal.ts - Überarbeitet
import {
    Component,
    EventEmitter,
    Input,
    Output,
    OnInit,
    OnDestroy,
    inject,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
  } from '@angular/core';
  import { CommonModule, DOCUMENT } from '@angular/common';
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
  export class AdzsCreateModal implements OnInit, OnDestroy {
    private _visible = false;
  @Input()
  set visible(val: boolean) {
    this._visible = val;
    this.toggleBodyScroll(val);
  }
  get visible() { return this._visible; }
    @Output() created = new EventEmitter<PersonDoc>();
    @Output() closed = new EventEmitter<void>();
  
    private readonly personService = inject(PersonService);
    private readonly logger = inject(LoggerService);
    private readonly fb = inject(FormBuilder);
    private readonly cdr = inject(ChangeDetectorRef);
  private readonly doc = inject(DOCUMENT) as Document;
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
      'Betreuer OF',
    ];
  
    readonly statusOptions = ['aktiv', 'neu', 'inaktiv'];
    readonly zugOptions: Array<{ value: number; label: string }> = [
    { value: 1, label: 'Zug 1' },
    { value: 2, label: 'Zug 2' },
  ];
    readonly gruppeOptions = ['A', 'B', 'C', 'D'];
    readonly fuehrerausweisKategorien = ['A', 'A1', 'B', 'B1', 'C', 'C1', 'D', 'D1', 'BE', 'C1E', 'CE', 'D1E', 'DE'];

  /**
   * Options for the Kontakt-Methode dropdown in the Präferenzen section.
   * Using objects allows user-friendly labels while persisting concise values.
   */
  readonly contactMethodOptions: Array<{ value: 'digital' | 'paper' | 'both'; label: string }> = [
    { value: 'digital', label: 'Digital (E-Mail)' },
    { value: 'paper', label: 'Papier (Post)' },
    { value: 'both', label: 'Digital & Papier' },
  ];
  
    /**
   * Currently opened accordion section key.
   */
  openSection: string = 'grunddaten';

  /**
   * Toggle accordion section. Prevents the native <details> toggle so we can control state manually.
   */
  toggleSection(section: string, ev?: Event) {
    ev?.preventDefault();
    this.openSection = this.openSection === section ? '' : section;
  }

  ngOnInit(): void {
      this.initForm();
      this.logger.log('AdzsCreateModal', 'Component initialized');
    }
  
    ngOnDestroy(): void {
      this.destroy$.next();
      this.destroy$.complete();
      this.logger.log('AdzsCreateModal', 'Component destroyed');
    }
  
    private initForm(): void {
      this.mainForm = this.fb.group({
        // Grunddaten
        vorname: ['', Validators.required],
        nachname: ['', Validators.required],
        geburtsdatum: ['', Validators.required],
  
        // Kontaktdaten
        strasse: ['', Validators.required],
        plz: ['', Validators.required],
        ort: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        telefonMobil: ['', Validators.required],
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
  
    /**
     * Legacy handler for the old <select multiple>. Kept for backward compatibility but no longer used.
     */
    onFuehrerausweisChange(event: any): void {
      const selectedOptions = Array.from(event.target.selectedOptions, (option: any) => option.value);
      this.selectedFuehrerausweis = selectedOptions;
      // Sync form control in case the old handler is still triggered somewhere
      this.mainForm.get('fuehrerausweis')?.setValue(this.selectedFuehrerausweis);
      this.cdr.markForCheck();
    }

    /**
     * Toggle handler for checkbox list representation of Führerausweis-Kategorien.
     * Adds or removes the given Kategorie from the selectedFuehrerausweis array and
     * keeps the reactive form control in sync.
     */
    onFuehrerausweisToggle(kategorie: string, event: Event): void {
      const checked = (event.target as HTMLInputElement).checked;

      if (checked) {
        if (!this.selectedFuehrerausweis.includes(kategorie)) {
          this.selectedFuehrerausweis.push(kategorie);
        }
      } else {
        this.selectedFuehrerausweis = this.selectedFuehrerausweis.filter(k => k !== kategorie);
      }

      // Update form control so validators and valueChanges observers stay correct
      this.mainForm.get('fuehrerausweis')?.setValue(this.selectedFuehrerausweis);
      this.cdr.markForCheck();
    }
  
      /**
   * Lock page scroll when modal is open to prevent background scroll.
   */
  private toggleBodyScroll(lock: boolean) {
    if (!this.doc || !this.doc.body) return;
    if (lock) {
      this.doc.body.classList.add('overflow-hidden');
    } else {
      this.doc.body.classList.remove('overflow-hidden');
    }
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
      if (this.mainForm.invalid) {
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