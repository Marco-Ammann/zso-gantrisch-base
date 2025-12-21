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
    @let vm = vm$ | async;
    <zso-activity-widget
      icon="badge"
      [value]="vm?.active ?? 0"
      label="AdZS aktiv"
      [details]="[
        { label: 'Total', value: vm?.total ?? 0 },
        { label: 'Neu', value: vm?.neu ?? 0 },
        { label: 'Inaktiv', value: vm?.inactive ?? 0 }
      ]"
      (select)="navigate()"
      color="text-cyan-400"
    ></zso-activity-widget>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdzsDashboardWidget {
  private readonly personService = inject(PersonService);
  private readonly router = inject(Router);

  readonly vm$ = this.personService.getStats().pipe(
    map((s: any) => ({
      active: s.active ?? 0,
      total: s.total ?? 0,
      neu: s.new ?? 0,
      inactive: s.inactive ?? 0,
    })),
    catchError(() =>
      of({
        active: 0,
        total: 0,
        neu: 0,
        inactive: 0,
      })
    )
  );

  navigate(): void {
    this.router.navigate(['/adsz']);
  }
}
