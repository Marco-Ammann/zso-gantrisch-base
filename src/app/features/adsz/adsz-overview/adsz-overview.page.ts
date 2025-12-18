// src/app/features/adzs/adzs-overview/adzs-overview.page.ts - Aktualisiert für Modal
import {
  Component,
  inject,
  OnDestroy,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  Subject,
  takeUntil,
  debounceTime,
  distinctUntilChanged,
  BehaviorSubject,
  combineLatest,
} from 'rxjs';
import { map } from 'rxjs/operators';

import { PersonService } from '@core/services/person.service';
import { LoggerService } from '@core/services/logger.service';
import { AuthService } from '@core/auth/services/auth.service';
import { PersonDoc } from '@core/models/person.model';
import { AdzsCreateModal } from '@shared/components/adzs-create-modal/adzs-create-modal';
import { ZsoButton } from '@shared/ui/zso-button/zso-button';

interface FilterState {
  status: 'all' | 'aktiv' | 'neu' | 'inaktiv';
  zug: 'all' | number;
  gruppe: 'all' | string;
  contactMethod: 'all' | 'digital' | 'paper' | 'both';
}

interface Stats {
  total: number;
  active: number;
  new: number;
  digitalPreference: number;
  paperPreference: number;
  inactive: number;
}

@Component({
  selector: 'zso-adzs-overview',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ZsoButton,
    AdzsCreateModal  // Neue Modal-Komponente
  ],
  templateUrl: './adzs-overview.page.html',
  styleUrls: ['./adzs-overview.page.scss'],
  animations: [
    trigger('itemFade', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate(
          '250ms ease-out',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
    ]),
    trigger('modalSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.9)' }),
        animate(
          '200ms ease-out',
          style({ opacity: 1, transform: 'scale(1)' })
        ),
      ]),
      transition(':leave', [
        animate(
          '150ms ease-in',
          style({ opacity: 0, transform: 'scale(0.9)' })
        ),
      ]),
    ]),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdzsOverviewPage implements OnInit, OnDestroy {
  private readonly personService = inject(PersonService);
  private readonly logger = inject(LoggerService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();
  private readonly searchTerm$ = new BehaviorSubject<string>('');
  private readonly filters$ = new BehaviorSubject<FilterState>({
    status: 'all',
    zug: 'all',
    gruppe: 'all',
    contactMethod: 'all',
  });

  // State
  allPersons: PersonDoc[] = [];
  filteredPersons: PersonDoc[] = [];
  isLoading = false;
  errorMsg: string | null = null;
  searchQuery = '';
  currentFilters: FilterState = {
    status: 'all',
    zug: 'all',
    gruppe: 'all',
    contactMethod: 'all',
  };

  // Modal State - NEU
  createModalVisible = false;
  successMsg: string | null = null;

  // Computed properties
  get hasResults(): boolean {
    return this.filteredPersons.length > 0;
  }

  get hasActiveFilters(): boolean {
    return (
      this.searchQuery.length > 0 ||
      this.currentFilters.status !== 'all' ||
      this.currentFilters.zug !== 'all' ||
      this.currentFilters.gruppe !== 'all' ||
      this.currentFilters.contactMethod !== 'all'
    );
  }

  // Observables
  stats$ = this.personService.getAll().pipe(
    map((persons: PersonDoc[]) => this.calculateStats(persons)),
    takeUntil(this.destroy$)
  );

  isAdmin$ = this.authService.appUser$.pipe(
    map(user => user?.doc.roles?.includes('admin') ?? false)
  );

  ngOnInit(): void {
    this.logger.log('AdzsOverviewPage', 'Component initialized');
    this.loadPersons();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.logger.log('AdzsOverviewPage', 'Component destroyed');
  }

  private loadPersons(): void {
    this.isLoading = true;
    this.errorMsg = null;

    this.personService.getAll().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (persons: PersonDoc[]) => {
        this.allPersons = persons;
        this.applyFilters();
        this.isLoading = false;
        this.logger.log('AdzsOverviewPage', `Loaded ${persons.length} persons`);
        this.cdr.markForCheck();
      },
      error: (error: any) => {
        this.logger.error('AdzsOverviewPage', 'Error loading persons:', error);
        this.errorMsg = 'Fehler beim Laden der Personendaten';
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private setupSearch(): void {
    combineLatest([
      this.searchTerm$.pipe(
        debounceTime(300),
        distinctUntilChanged()
      ),
      this.filters$
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.applyFilters();
    });
  }

  private calculateStats(persons: PersonDoc[]): Stats {
    return {
      total: persons.length,
      active: persons.filter(p => p.zivilschutz.status === 'aktiv').length,
      new: persons.filter(p => p.zivilschutz.status === 'neu').length,
      inactive: persons.filter(p => p.zivilschutz.status === 'inaktiv').length,
      digitalPreference: persons.filter(p => p.preferences?.contactMethod === 'digital' || p.preferences?.contactMethod === 'both').length,
      paperPreference: persons.filter(p => p.preferences?.contactMethod === 'paper' || p.preferences?.contactMethod === 'both').length,
    };
  }

  private applyFilters(): void {
    let filtered = [...this.allPersons];

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(person =>
        person.grunddaten.vorname.toLowerCase().includes(query) ||
        person.grunddaten.nachname.toLowerCase().includes(query) ||
        person.kontaktdaten.email.toLowerCase().includes(query) ||
        person.grunddaten.grad.toLowerCase().includes(query) ||
        person.grunddaten.funktion.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (this.currentFilters.status !== 'all') {
      filtered = filtered.filter(
        person => person.zivilschutz.status === this.currentFilters.status
      );
    }

    // Apply zug filter
    if (this.currentFilters.zug !== 'all') {
      filtered = filtered.filter(
        person => person.zivilschutz.einteilung.zug === this.currentFilters.zug
      );
    }

    // Apply gruppe filter
    if (this.currentFilters.gruppe !== 'all') {
      filtered = filtered.filter(
        person =>
          person.zivilschutz.einteilung.gruppe === this.currentFilters.gruppe
      );
    }

    // Apply contact method filter
    if (this.currentFilters.contactMethod !== 'all') {
      filtered = filtered.filter(
        person =>
          person.preferences?.contactMethod ===
          this.currentFilters.contactMethod ||
          (this.currentFilters.contactMethod === 'both' &&
            person.preferences?.contactMethod === 'both')
      );
    }

    this.filteredPersons = filtered;
    this.cdr.markForCheck();
  }

  // Event handlers
  onSearchChange(value: string): void {
    this.searchQuery = value;
    this.searchTerm$.next(value);
  }

  onFilterChange(filterType: keyof FilterState, value: any): void {
    this.currentFilters = {
      ...this.currentFilters,
      [filterType]: value,
    };
    this.filters$.next(this.currentFilters);
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.currentFilters = {
      status: 'all',
      zug: 'all',
      gruppe: 'all',
      contactMethod: 'all',
    };
    this.searchTerm$.next('');
    this.filters$.next(this.currentFilters);
  }

  refresh(): void {
    this.logger.log('AdzsOverviewPage', 'Manual refresh triggered');
    this.loadPersons();
  }

  // Navigation methods
  viewPersonDetails(person: PersonDoc): void {
    this.router.navigate(['/adsz', person.id]);
  }

  // NEU: Modal-Methoden statt Navigation
  openCreateModal(): void {
    this.createModalVisible = true;
    this.logger.log('AdzsOverviewPage', 'Create modal opened');
  }

  onPersonCreated(person: PersonDoc): void {
    this.logger.log('AdzsOverviewPage', 'Person created successfully:', person.id);

    // Success-Message anzeigen
    this.successMsg = `${person.grunddaten.vorname} ${person.grunddaten.nachname} wurde erfolgreich erstellt.`;

    // Daten neu laden
    this.loadPersons();

    // Success-Message nach 5 Sekunden ausblenden
    setTimeout(() => {
      this.successMsg = null;
      this.cdr.markForCheck();
    }, 5000);

    this.cdr.markForCheck();
  }

  onCreateModalClosed(): void {
    this.createModalVisible = false;
    this.logger.log('AdzsOverviewPage', 'Create modal closed');
  }

  // Utility methods
  getPersonInitials(person: PersonDoc): string {
    return `${person.grunddaten.vorname.charAt(0)}${person.grunddaten.nachname.charAt(0)}`;
  }

  // Legacy methods (für Kompatibilität)
  createNew(): void {
    this.openCreateModal(); // Redirect zu Modal statt Navigation
  }

  viewDetails(person: PersonDoc): void {
    this.viewPersonDetails(person);
  }

  // PDF Export functions (unverändert)
  generateAllPDFs(): void {
    // TODO: Implement PDF generation for all persons
    this.logger.log('AdzsOverviewPage', 'Generate PDFs for all persons');
  }

  generatePaperPreferencePDFs(): void {
    const paperPersons = this.allPersons.filter(
      person =>
        person.preferences?.contactMethod === 'paper' ||
        person.preferences?.contactMethod === 'both'
    );
    this.logger.log('AdzsOverviewPage', `Generate PDFs for ${paperPersons.length} paper preference persons`);
  }

  // Message management
  dismissSuccessMsg(): void {
    this.successMsg = null;
  }

  dismissErrorMsg(): void {
    this.errorMsg = null;
  }
}