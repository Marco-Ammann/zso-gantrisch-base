// src/app/features/places/place-detail-view/place-detail-view.page.ts
// Read-only Detailseite für einen Ort. Bearbeitung erfolgt unter /places/:id/edit
// Alle sichtbaren Texte Deutsch, Klassen-/Dateinamen Englisch.

import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { PlaceDoc } from '@core/models/place.model';
import { PlacesService } from '../services/places.service';
import { LoggerService } from '@core/services/logger.service';
import { PlaceMap } from '../components/place-map/place-map';
import { ZsoButton } from '@shared/ui/zso-button/zso-button';
import { PlaceNotesWidget } from '../components/place-notes-widget/place-notes-widget';

@Component({
  selector: 'zso-place-detail-view',
  standalone: true,
  imports: [CommonModule, RouterModule, PlaceMap, ZsoButton, PlaceNotesWidget],
  templateUrl: './place-detail-view.page.html',
  styleUrls: ['./place-detail-view.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceDetailViewPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly placesService = inject(PlacesService);
  private readonly logger = inject(LoggerService);
  private readonly cdr = inject(ChangeDetectorRef);

  placeId!: string;
  place: PlaceDoc | null = null;

  /** Material icon name for the current place type */
  get typeIcon(): string {
    switch (this.place?.type) {
      case 'accommodation':
        return 'home';
      case 'civil_protection_facility':
        return 'shield';
      case 'training_room':
        return 'school';
      default:
        return 'location_city';
    }
  }
  errorMsg: string | null = null;
  isLoading = true;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMsg = 'Ungültige ID';
      this.isLoading = false;
      return;
    }
    this.placeId = id;
    this.loadPlace(id);
  }

  async loadPlace(id: string): Promise<void> {
    try {
      const p = await firstValueFrom(this.placesService.getById(id));
      if (!p) {
        this.errorMsg = 'Ort nicht gefunden';
      } else {
        this.place = p;
      }
    } catch (err) {
      this.logger.error('PlaceDetailViewPage', 'loadPlace failed', err);
      this.errorMsg = 'Fehler beim Laden des Ortes';
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  /** --- Map helpers ---------------------------------------------------- */
  get mapLat(): number | null {
    return this.place?.address?.coordinates?.lat ?? null;
  }
  get mapLng(): number | null {
    return this.place?.address?.coordinates?.lng ?? null;
  }
  get mapsLink(): string {
    if (!this.place) return '';
    const a = this.place.address;
    return `https://www.google.com/maps/search/${encodeURIComponent(`${a.street}, ${a.zip} ${a.city}`)}`;
  }

  get mapAddress(): string {
    if (!this.place?.address) return '';
    const a = this.place.address;
    return `${a.street}, ${a.zip} ${a.city}`;
  }

  /** Navigation */
  back(): void {
    const navId = (window.history.state as any)?.navigationId ?? 0;
    if (navId > 1) {
      this.location.back();
      return;
    }
    this.goOverview();
  }

  goOverview(): void {
    this.router.navigate(['/places']);
  }

  edit(): void {
    this.router.navigate(['/places', this.placeId, 'edit']);
  }
}
