// src/app/features/adsz/adsz-detail/adsz-detail.page.ts
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
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, of, takeUntil, switchMap } from 'rxjs';

import { PersonService } from '@core/services/person.service';
import { PersonDoc, NotfallkontaktDoc } from '@core/models/person.model';
import { LoggerService } from '@core/services/logger.service';
import { ZsoButton } from '@shared/ui/zso-button/zso-button';
import { AdzsCreateModal } from '@shared/components/adzs-create-modal/adzs-create-modal';

@Component({
  selector: 'zso-adsz-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ZsoButton,
    AdzsCreateModal,
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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdzsDetailPage implements OnInit, OnDestroy {
  // injections
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly personService = inject(PersonService);
  private readonly logger = inject(LoggerService);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly destroy$ = new Subject<void>();

  // state
  person: PersonDoc | null = null;
  notfallkontakte: NotfallkontaktDoc[] = [];
  isLoading = true;
  errorMsg: string | null = null;

  // modal
  modalVisible = false;

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap(params => {
          const id = params.get('id');
          if (!id) {
            this.router.navigate(['/adsz']);
            return of(null);
          }
          if (id === 'new') {
            // create mode
            this.modalVisible = true;
            this.isLoading = false;
            this.cdr.markForCheck();
            return of(null);
          }
          this.isLoading = true;
          return this.personService.getById(id);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: person => {
          if (person) {
            // load emergency contacts from separate collection
            this.personService
              .getNotfallkontakte(person.id)
              .pipe(takeUntil(this.destroy$))
              .subscribe(kontakte => {
                this.notfallkontakte = kontakte;
                this.cdr.markForCheck();
              });
          } else {
            this.notfallkontakte = [];
          }
          this.person = person;
          this.isLoading = false;
          this.errorMsg = person ? null : 'Person nicht gefunden';
          this.cdr.markForCheck();
        },
        error: err => {
          this.logger.error('AdzsDetailPage', 'Load error', err);
          this.errorMsg = 'Fehler beim Laden der Person';
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Computed helpers
  get geburtsdatumTimestamp(): number | null {
    if (!this.person) return null;
    const date = this.person.grunddaten.geburtsdatum as any;
    if (typeof date === 'number') {
      return date;
    }
    if (date && typeof date.seconds === 'number') {
      return date.seconds * 1000;
    }
    return null;
  }

  getPersonInitials(): string {
    if (!this.person) return '?';
    return (
      this.person.grunddaten.vorname.charAt(0) +
      this.person.grunddaten.nachname.charAt(0)
    ).toUpperCase();
  }

  openEdit(): void {
    this.modalVisible = true;
  }

  onModalClosed(): void {
    this.modalVisible = false;
    // reload if existing person
    if (this.person?.id) {
      this.refreshPerson(this.person.id);
    }
  }

  onPersonUpdated(updated: PersonDoc): void {
    this.person = updated;
    this.modalVisible = false;
    this.cdr.markForCheck();
  }

  private refreshPerson(id: string): void {
    // reload person
    this.personService
      .getById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(person => {
        this.person = person;
        if (person) {
          this.personService
            .getNotfallkontakte(person.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe(kontakte => {
              this.notfallkontakte = kontakte;
              this.cdr.markForCheck();
            });
        } else {
          this.notfallkontakte = [];
        }
        this.cdr.markForCheck();
      });
  }
}