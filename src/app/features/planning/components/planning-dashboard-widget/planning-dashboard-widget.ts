import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { ActivityWidgetComponent } from '@features/dashboard/components/activity-widget/activity-widget';
import { MissionsService } from '../../services/missions.service';

@Component({
    selector: 'zso-planning-dashboard-widget',
    standalone: true,
    imports: [AsyncPipe, ActivityWidgetComponent],
    template: `
    <zso-activity-widget
      icon="event_note"
      [value]="(upcoming$ | async) ?? 0"
      label="Einsätze"
      (select)="navigate()"
      color="text-cp-orange"
    ></zso-activity-widget>
  `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanningDashboardWidget {
    private readonly missions = inject(MissionsService);
    private readonly router = inject(Router);

    readonly upcoming$ = this.missions.getAll().pipe(
        map((missions) => missions.filter((m) => m.endAt >= Date.now()).length),
        catchError(() => of(0))
    );

    navigate(): void {
        this.router.navigate(['/planning']);
    }
}
