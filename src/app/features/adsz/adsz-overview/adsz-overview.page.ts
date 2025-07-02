// src/app/features/adsz/adsz-overview/adsz-overview.page.ts
import { Component, inject, OnDestroy, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { PersonService } from '@core/services/person.service';
import { JsonImportService } from '@core/services/json-import.service';
import { LoggerService } from '@core/services/logger.service';
import { AuthService } from '@core/auth/services/auth.service';
import { PersonDoc, Person } from '@core/models/person.model';

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
  selector: 'zso-adsz-overview',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './adsz-overview.page.html',
  styleUrls: ['./adsz-overview.page.scss'],
  animations: [
    trigger('itemFade', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('250ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdzsOverviewPage implements OnInit, OnDestroy {
  private readonly jsonImportService = inject(JsonImportService);
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
    contactMethod: 'all'
  });
  private readonly personService = inject(PersonService);

  // State
  allPersons: PersonDoc[] = [];
  filteredPersons: PersonDoc[] = [];
  searchQuery = '';
  isLoading = false;
  errorMsg: string | null = null;
  
  // Filter state
  currentFilters: FilterState = {
    status: 'all',
    zug: 'all',
    gruppe: 'all',
    contactMethod: 'all'
  };

  // Statistics
  stats$: Observable<Stats> = this.personService.getStats();
  
  // Current user for highlighting own record
  currentUserId$ = this.authService.appUser$.pipe(
    map(user => user?.auth.uid || null)
  );

  // Available filter options
  readonly statusOptions = [
    { value: 'all', label: 'Alle Status' },
    { value: 'aktiv', label: 'Aktiv' },
    { value: 'neu', label: 'Neu' },
    { value: 'inaktiv', label: 'Inaktiv' }
  ];

  readonly zugOptions = [
    { value: 'all', label: 'Alle Züge' },
    { value: 1, label: 'Zug 1' },
    { value: 2, label: 'Zug 2' }
  ];

  readonly gruppeOptions = [
    { value: 'all', label: 'Alle Gruppen' },
    { value: 'A', label: 'Gruppe A' },
    { value: 'B', label: 'Gruppe B' },
    { value: 'C', label: 'Gruppe C' },
    { value: 'D', label: 'Gruppe D' }
  ];

  readonly contactMethodOptions = [
    { value: 'all', label: 'Alle Präferenzen' },
    { value: 'digital', label: 'Digital' },
    { value: 'paper', label: 'Papier' },
    { value: 'both', label: 'Beides' }
  ];

  ngOnInit(): void {
    this.logger.log('AdzsOverviewPage', 'Initializing');

    // Set up search debounce
    this.searchTerm$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.applyFilters();
    });

    // Set up filter changes
    this.filters$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.applyFilters();
    });

    // Combine data loading with filtering
    combineLatest([
      this.personService.getAll(),
      this.searchTerm$,
      this.filters$
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(([persons]) => {
      this.allPersons = persons;
      this.applyFilters();
      this.isLoading = false;
      this.cdr.markForCheck();
    });

    this.loadPersons();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.searchTerm$.complete();
    this.filters$.complete();
    this.logger.log('AdzsOverviewPage', 'Component destroyed');
  }

  private loadPersons(): void {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.errorMsg = null;
    this.cdr.markForCheck();
  }

  private applyFilters(): void {
    let filtered = [...this.allPersons];

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(person =>
        `${person.grunddaten.vorname} ${person.grunddaten.nachname}`.toLowerCase().includes(query) ||
        person.kontaktdaten.email.toLowerCase().includes(query) ||
        person.kontaktdaten.telefonMobil.includes(query) ||
        person.grunddaten.funktion.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (this.currentFilters.status !== 'all') {
      filtered = filtered.filter(person => 
        person.zivilschutz.status === this.currentFilters.status
      );
    }

    // Apply zug filter
    if (this.currentFilters.zug !== 'all') {
      filtered = filtered.filter(person => 
        person.zivilschutz.einteilung.zug === this.currentFilters.zug
      );
    }

    // Apply gruppe filter
    if (this.currentFilters.gruppe !== 'all') {
      filtered = filtered.filter(person => 
        person.zivilschutz.einteilung.gruppe === this.currentFilters.gruppe
      );
    }

    // Apply contact method filter
    if (this.currentFilters.contactMethod !== 'all') {
      filtered = filtered.filter(person => 
        person.preferences?.contactMethod === this.currentFilters.contactMethod ||
        (this.currentFilters.contactMethod === 'both' && person.preferences?.contactMethod === 'both')
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
      [filterType]: value
    };
    this.filters$.next(this.currentFilters);
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.currentFilters = {
      status: 'all',
      zug: 'all',
      gruppe: 'all',
      contactMethod: 'all'
    };
    this.searchTerm$.next('');
    this.filters$.next(this.currentFilters);
  }

  refresh(): void {
    this.logger.log('AdzsOverviewPage', 'Manual refresh triggered');
    this.loadPersons();
  }

  // Navigation
  viewDetails(person: PersonDoc): void {
    this.router.navigate(['/adsz', person.id]);
  }

  createNew(): void {
    this.router.navigate(['/adsz/new']);
  }

  // PDF Export functions
  generateAllPDFs(): void {
    // TODO: Implement PDF generation for all persons
    this.logger.log('AdzsOverviewPage', 'Generate PDFs for all persons');
  }

  generatePaperPreferencePDFs(): void {
    const paperPersons = this.allPersons.filter(person => 
      person.preferences?.contactMethod === 'paper' || 
      person.preferences?.contactMethod === 'both'
    );
    
    this.logger.log('AdzsOverviewPage', `Generate PDFs for ${paperPersons.length} paper preference persons`);
    // TODO: Implement PDF generation
  }

  generateSelectedPDFs(): void {
    // TODO: Implement selected PDFs generation
    this.logger.log('AdzsOverviewPage', 'Generate PDFs for selected persons');
  }

  // Helper methods
  getPersonInitials(person: PersonDoc): string {
    return `${person.grunddaten.vorname.charAt(0)}${person.grunddaten.nachname.charAt(0)}`;
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'aktiv': return 'badge--approved';
      case 'neu': return 'badge--pending';
      case 'inaktiv': return 'badge--blocked';
      default: return 'badge--unverified';
    }
  }

  getContactMethodBadgeClass(method?: string): string {
    switch (method) {
      case 'digital': return 'text-blue-400';
      case 'paper': return 'text-amber-400';
      case 'both': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  }

  getContactMethodIcon(method?: string): string {
    switch (method) {
      case 'digital': return 'computer';
      case 'paper': return 'description';
      case 'both': return 'swap_horiz';
      default: return 'help';
    }
  }

  formatPhone(phone: string): string {
    if (!phone) return '';
    // Simple Swiss phone formatting
    return phone.replace(/(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4');
  }

  // Computed properties
  get hasResults(): boolean {
    return this.filteredPersons.length > 0;
  }

  get hasActiveFilters(): boolean {
    return this.currentFilters.status !== 'all' ||
           this.currentFilters.zug !== 'all' ||
           this.currentFilters.gruppe !== 'all' ||
           this.currentFilters.contactMethod !== 'all' ||
           this.searchQuery.trim() !== '';
  }

  get filteredStats() {
    return {
      total: this.filteredPersons.length,
      active: this.filteredPersons.filter(p => p.zivilschutz.status === 'aktiv').length,
      new: this.filteredPersons.filter(p => p.zivilschutz.status === 'neu').length,
      paper: this.filteredPersons.filter(p => 
        p.preferences?.contactMethod === 'paper' || 
        p.preferences?.contactMethod === 'both'
      ).length
    };
  }
}