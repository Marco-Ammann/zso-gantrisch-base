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
import { getStorage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, of, takeUntil, switchMap, finalize } from 'rxjs';

import { PersonService } from '@core/services/person.service';
import { PersonDoc, NotfallkontaktDoc } from '@core/models/person.model';
import { LoggerService } from '@core/services/logger.service';
import { AdzsCreateModal } from '@shared/components/adzs-create-modal/adzs-create-modal';
import { NotfallkontaktModal } from '@shared/components/notfallkontakt-modal/notfallkontakt-modal';
import { AdzsSummaryCard } from '@shared/components/adzs-summary-card/adzs-summary-card';

@Component({
  selector: 'zso-adsz-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    AdzsCreateModal,
    NotfallkontaktModal,
    AdzsSummaryCard,
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
  deleting = false;

  // state
  person: PersonDoc | null = null;
  notfallkontakte: NotfallkontaktDoc[] = [];
  isLoading = true;
  errorMsg: string | null = null;
  uploading = false;

  // modals
  modalVisible = false;
  nkModalVisible = false;
  selectedKontakt: NotfallkontaktDoc | null = null;

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

  onFileSelected(event: Event, id: string): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

    if (file.size > MAX_SIZE) {
      this.logger.warn('AdzsDetailPage', 'Bild zu groß (max. 2 MB)');
      return;
    }

    this.uploading = true;
    const storage = getStorage();
    const path = `persons/${id}/avatar_${Date.now()}`;
    const storageRef = ref(storage, path);

    uploadBytes(storageRef, file)
      .then(() => getDownloadURL(storageRef))
      .then((url: string) => {
        this.personService.update(id, { photoUrl: url }).pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            this.logger.log('AdzsDetailPage', 'Avatar aktualisiert');
          },
          error: (err) => {
            this.logger.error('AdzsDetailPage', 'Foto-URL speichern fehlgeschlagen', err);
          },
        });
      })
      .catch((err) => {
        this.logger.error('AdzsDetailPage', 'Upload fehlgeschlagen', err);
      })
      .finally(() => {
        this.uploading = false;
        this.cdr.markForCheck();
      });
  }

  back(): void {
  this.router.navigate(['/adsz']);
}

openEdit(): void {
    this.modalVisible = true;
  }

  /* Emergency contacts CRUD */
  openAddNk(): void {
    this.selectedKontakt = null;
    this.nkModalVisible = true;
  }

  openEditNk(k: NotfallkontaktDoc): void {
    this.selectedKontakt = k;
    this.nkModalVisible = true;
  }

  onNkSaved(k: NotfallkontaktDoc): void {
    // Update local list (add or replace)
    // Firestore snapshot listener will refresh list; avoid local duplicates
    this.nkModalVisible = false;
    this.cdr.markForCheck();
  }

  onNkClosed(): void {
    this.nkModalVisible = false;
    this.selectedKontakt = null;
  }

  deleteNk(id: string): void {
    if (!confirm('Notfallkontakt löschen?')) return;
    this.personService.deleteNotfallkontakt(id).pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.notfallkontakte = this.notfallkontakte.filter(n => n.id !== id);
      this.cdr.markForCheck();
    });
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

  confirmDelete(): void {
    if (!this.person?.id) return;
    if (!confirm('Person endgültig löschen? Alle Notfallkontakte werden ebenfalls entfernt.')) {
      return;
    }
    this.deleting = true;
    this.personService
      .deletePersonWithNotfallkontakte(this.person.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.deleting = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.logger.log('AdzsDetailPage', 'Person gelöscht', this.person?.id);
          this.router.navigate(['/adsz']);
        },
        error: (err) => {
          this.logger.error('AdzsDetailPage', 'Löschen fehlgeschlagen', err);
          alert('Löschen fehlgeschlagen');
        },
      });
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