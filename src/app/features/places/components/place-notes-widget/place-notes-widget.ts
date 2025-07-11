// src/app/features/places/components/place-notes-widget/place-notes-widget.ts
// Simple notes widget for a place. Allows adding and deleting notes.
// Uses German UI text.

import {
  Component,
  Input,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ZsoButton } from '@shared/ui/zso-button/zso-button';
import { NoteEntry } from '@core/models/place.model';
import { PlacesService } from '../../services/places.service';
import { LoggerService } from '@core/services/logger.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'zso-place-notes-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, ZsoButton],
  templateUrl: './place-notes-widget.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceNotesWidget implements OnInit {
  /** editing state */
  editingId: string | null = null;
  editText = '';
  @Input() placeId!: string;

  notes: NoteEntry[] = [];
  newText = '';
  pending = false;
  errorMsg: string | null = null;

  private readonly cdr = inject(ChangeDetectorRef);

  private readonly placesService = inject(PlacesService);
  private readonly logger = inject(LoggerService);

  async ngOnInit(): Promise<void> {
    if (!this.placeId) return;
    const place = await firstValueFrom(this.placesService.getById(this.placeId));
    this.notes = place?.notes ?? [];
    this.cdr.markForCheck();
  }

  async add(): Promise<void> {
    if (this.pending || !this.newText.trim()) return;
    if (!this.newText.trim()) return;
    this.pending = true;
    this.errorMsg = null;

    const note: NoteEntry = {
      id: crypto.randomUUID(),
      text: this.newText.trim(),
      createdAt: Date.now(),
      createdBy: 'system', // TODO replace with auth user ID
    };

    try {
      await firstValueFrom(
        this.placesService.update(this.placeId, { notes: [...this.notes, note] })
      );
      this.notes = [...this.notes, note];
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
    this.pending = true;
    this.errorMsg = null;
    const updated = this.notes.filter((n) => n.id !== id);
    try {
      await firstValueFrom(this.placesService.update(this.placeId, { notes: updated }));
      this.notes = updated;
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
