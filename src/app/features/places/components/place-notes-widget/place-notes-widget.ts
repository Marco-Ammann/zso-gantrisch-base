// src/app/features/places/components/place-notes-widget/place-notes-widget.ts
// Simple notes widget for a place. Allows adding and deleting notes.
// Uses German UI text.

import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ZsoButton } from '@shared/ui/zso-button/zso-button';
import { NoteEntry } from '@core/models/place.model';
import { PlacesService } from '../../services/places.service';
import { LoggerService } from '@core/services/logger.service';
import { firstValueFrom } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { AuthService } from '@core/auth/services/auth.service';
import { Subject, takeUntil } from 'rxjs';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { OverlayModule } from '@angular/cdk/overlay';

@Component({
  selector: 'zso-place-notes-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, ZsoButton, OverlayModule],
  templateUrl: './place-notes-widget.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceNotesWidget implements OnInit, OnDestroy {
  /** editing state */
  editingId: string | null = null;
  editText = '';
  @Input() placeId!: string;
  @Input() mode: 'full' | 'editor' | 'list' = 'full';
  @Input() embedded = false;

  activeNote: NoteEntry | null = null;
  modalIsEditing = false;
  modalEditText = '';

  readonly previewLength = 180;

  notes: NoteEntry[] = [];
  newText = '';
  pending = false;
  errorMsg: string | null = null;

  private readonly cdr = inject(ChangeDetectorRef);

  private readonly placesService = inject(PlacesService);
  private readonly logger = inject(LoggerService);
  private readonly authService = inject(AuthService);
  private readonly overlay = inject(Overlay);
  private readonly viewContainerRef = inject(ViewContainerRef);

  private overlayRef: OverlayRef | null = null;

  @ViewChild('noteModalTpl') private noteModalTpl?: TemplateRef<unknown>;

  private readonly destroy$ = new Subject<void>();

  /** Sort notes by createdAt desc */
  private sortNotes(): void {
    this.notes = [...this.notes].sort((a, b) => b.createdAt - a.createdAt);
  }

  async ngOnInit(): Promise<void> {
    if (!this.placeId) return;

    this.placesService
      .getById(this.placeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((place) => {
        this.notes = place?.notes ?? [];
        this.sortNotes();
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.disposeOverlay();
    this.destroy$.next();
    this.destroy$.complete();
  }

  getPreview(text: string): string {
    const normalized = String(text ?? '')
      .replace(/\s+/g, ' ')
      .trim();
    if (normalized.length <= this.previewLength) return normalized;
    return normalized.slice(0, this.previewLength) + '…';
  }

  openNote(note: NoteEntry): void {
    this.activeNote = note;
    this.modalIsEditing = false;
    this.modalEditText = note.text;
    this.errorMsg = null;
    this.openOverlay();
    this.cdr.markForCheck();
  }

  closeNote(): void {
    this.activeNote = null;
    this.modalIsEditing = false;
    this.modalEditText = '';
    this.disposeOverlay();
    this.cdr.markForCheck();
  }

  private openOverlay(): void {
    if (this.overlayRef || !this.noteModalTpl) return;

    const positionStrategy = this.overlay.position().global().top('0').left('0');
    this.overlayRef = this.overlay.create({
      hasBackdrop: true,
      backdropClass: 'notes-modal-backdrop',
      width: '100vw',
      height: '100vh',
      scrollStrategy: this.overlay.scrollStrategies.block(),
      positionStrategy,
      disposeOnNavigation: true,
    });

    this.overlayRef.backdropClick().subscribe(() => this.closeNote());
    this.overlayRef
      .keydownEvents()
      .pipe(
        filter((e) => e.key === 'Escape'),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.closeNote());

    const portal = new TemplatePortal(this.noteModalTpl, this.viewContainerRef);
    this.overlayRef.attach(portal);
  }

  private disposeOverlay(): void {
    if (!this.overlayRef) return;
    this.overlayRef.dispose();
    this.overlayRef = null;
  }

  startModalEdit(): void {
    if (!this.activeNote) return;
    this.modalIsEditing = true;
    this.modalEditText = this.activeNote.text;
    this.cdr.markForCheck();
  }

  cancelModalEdit(): void {
    this.modalIsEditing = false;
    this.modalEditText = this.activeNote?.text ?? '';
    this.cdr.markForCheck();
  }

  async saveModalEdit(): Promise<void> {
    if (!this.activeNote) return;
    const text = this.modalEditText.trim();
    if (!text) return;

    const updated = this.notes.map((n) =>
      n.id === this.activeNote!.id ? { ...n, text } : n
    );

    this.pending = true;
    this.errorMsg = null;
    try {
      await firstValueFrom(this.placesService.update(this.placeId, { notes: updated }));
      this.activeNote = { ...this.activeNote, text };
      this.modalIsEditing = false;
      this.cdr.markForCheck();
    } catch (err) {
      this.logger.error('PlaceNotesWidget', 'modal edit failed', err as any);
      this.errorMsg = 'Speichern fehlgeschlagen';
    } finally {
      this.pending = false;
      this.cdr.markForCheck();
    }
  }

  async deleteActive(): Promise<void> {
    if (!this.activeNote) return;
    const id = this.activeNote.id;
    await this.delete(id);
    if (!this.notes.some((n) => n.id === id)) {
      this.closeNote();
    }
  }

  async add(): Promise<void> {
    if (this.pending || !this.newText.trim()) return;
    if (!this.newText.trim()) return;
    this.pending = true;
    this.errorMsg = null;

    const user = await firstValueFrom(
      this.authService.user$.pipe(
        filter((u): u is NonNullable<typeof u> => !!u),
        take(1)
      )
    ).catch(() => null);

    if (!user) {
      this.errorMsg = 'Speichern fehlgeschlagen';
      this.pending = false;
      this.cdr.markForCheck();
      return;
    }

    const note: NoteEntry = {
      id: crypto.randomUUID(),
      text: this.newText.trim(),
      createdAt: Date.now(),
      createdBy: user.uid,
    };

    try {
      await firstValueFrom(
        this.placesService.update(this.placeId, { notes: [...this.notes, note] })
      );
      this.notes = [...this.notes, note];
      this.sortNotes();
      this.newText = '';
      this.cdr.markForCheck();
    } catch (err) {
      this.logger.error('PlaceNotesWidget', 'add failed', err);
      this.errorMsg = 'Speichern fehlgeschlagen';
    } finally {
      this.pending = false;
    }
  }

  async saveEdit(): Promise<void> {
    if (!this.editingId) return;
    const updated = this.notes.map((n) =>
      n.id === this.editingId ? { ...n, text: this.editText } : n
    );
    this.pending = true;
    this.errorMsg = null;
    try {
      await firstValueFrom(this.placesService.update(this.placeId, { notes: updated }));
      this.notes = updated;
      this.sortNotes();
      this.editingId = null;
      this.editText = '';
    } catch (err) {
      this.logger.error('PlaceNotesWidget', 'edit failed', err as any);
      this.errorMsg = 'Speichern fehlgeschlagen';
    } finally {
      this.pending = false;
      this.cdr.markForCheck();
    }
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editText = '';
    this.cdr.markForCheck();
  }

  startEdit(note: NoteEntry): void {
    this.editingId = note.id;
    this.editText = note.text;
    this.cdr.markForCheck();
  }

  async delete(id: string): Promise<void> {
    if (this.pending) return;
    if (!confirm('Notiz wirklich löschen?')) return;
    this.pending = true;
    this.errorMsg = null;
    const updated = this.notes.filter((n) => n.id !== id);
    try {
      await firstValueFrom(this.placesService.update(this.placeId, { notes: updated }));
      this.notes = updated;
      this.sortNotes();
      if (this.editingId === id) {
        this.editingId = null;
        this.editText = '';
      }
      this.cdr.markForCheck();
    } catch (err) {
      this.logger.error('PlaceNotesWidget', 'delete failed', err);
      this.errorMsg = 'Löschen fehlgeschlagen';
    } finally {
      this.pending = false;
    }
  }
}
