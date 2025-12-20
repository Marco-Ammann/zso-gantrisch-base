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
    <zso-activity-widget
      icon="place"
      [value]="(total$ | async) ?? 0"
      label="Orte"
      (select)="navigate()"
      color="text-emerald-400"
    ></zso-activity-widget>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlacesDashboardWidget {
  private readonly placesService = inject(PlacesService);
  private readonly router = inject(Router);

  readonly total$ = this.placesService.getStats().pipe(
    map((s) => s.total),
    catchError(() => of(0))
  );

  navigate(): void {
    this.router.navigate(['/places']);
  }
}
