import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { ActivityWidgetComponent } from '@features/dashboard/components/activity-widget/activity-widget';
import { PlacesService } from '@features/places/services/places.service';

@Component({
  selector: 'zso-places-dashboard-widget',
  standalone: true,
  imports: [AsyncPipe, ActivityWidgetComponent],
  template: `
    @let vm = vm$ | async;
    <zso-activity-widget
      icon="place"
      [value]="vm?.total ?? 0"
      label="Orte"
      [details]="[
        { label: 'Mit Kap.', value: vm?.withCapacity ?? 0 },
        { label: 'Verfügbar', value: vm?.available ?? 0 },
        { label: 'Heime', value: vm?.accommodations ?? 0 }
      ]"
      (select)="navigate()"
      color="text-emerald-400"
    ></zso-activity-widget>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlacesDashboardWidget {
  private readonly placesService = inject(PlacesService);
  private readonly router = inject(Router);

  readonly vm$ = this.placesService.getStats().pipe(
    map((s) => ({
      total: s.total ?? 0,
      available: s.available ?? 0,
      withCapacity: s.withCapacity ?? 0,
      accommodations: s.byType?.accommodation ?? 0,
    })),
    catchError(() =>
      of({
        total: 0,
        available: 0,
        withCapacity: 0,
        accommodations: 0,
      })
    )
  );

  navigate(): void {
    this.router.navigate(['/places']);
  }
}
