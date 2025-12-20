import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { ActivityWidgetComponent } from '@features/dashboard/components/activity-widget/activity-widget';
import { PersonService } from '@core/services/person.service';

@Component({
  selector: 'zso-adsz-dashboard-widget',
  standalone: true,
  imports: [AsyncPipe, ActivityWidgetComponent],
  template: `
    <zso-activity-widget
      icon="badge"
      [value]="(active$ | async) ?? 0"
      label="AdZS aktiv"
      (select)="navigate()"
      color="text-cyan-400"
    ></zso-activity-widget>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdzsDashboardWidget {
  private readonly personService = inject(PersonService);
  private readonly router = inject(Router);

  readonly active$ = this.personService.getStats().pipe(
    map((s) => s.active ?? 0),
    catchError(() => of(0))
  );

  navigate(): void {
    this.router.navigate(['/adsz']);
  }
}
