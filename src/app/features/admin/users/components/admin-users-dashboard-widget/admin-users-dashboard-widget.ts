import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { ActivityWidgetComponent } from '@features/dashboard/components/activity-widget/activity-widget';
import { UserService } from '@core/services/user.service';

@Component({
    selector: 'zso-admin-users-dashboard-widget',
    standalone: true,
    imports: [AsyncPipe, ActivityWidgetComponent],
    host: { class: 'lg:col-span-2' },
    template: `
    @let vm = vm$ | async;
    <zso-activity-widget
      icon="person_add"
      [value]="vm?.pending ?? 0"
      label="Neue Anmeldungen"
      [details]="[
        { label: 'Total', value: vm?.total ?? 0 },
        { label: 'Aktiv', value: vm?.active ?? 0 },
        { label: 'Gesperrt', value: vm?.blocked ?? 0 }
      ]"
      (select)="navigate()"
      color="text-amber-400"
    ></zso-activity-widget>
  `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsersDashboardWidget {
    private readonly userService = inject(UserService);
    private readonly router = inject(Router);

    readonly vm$ = this.userService.getStats().pipe(
        map((s) => ({
            total: s.total ?? 0,
            active: s.active ?? 0,
            pending: s.pending ?? 0,
            blocked: s.blocked ?? 0,
        })),
        catchError(() =>
            of({
                total: 0,
                active: 0,
                pending: 0,
                blocked: 0,
            })
        )
    );

    navigate(): void {
        this.router.navigate(['/admin/users']);
    }
}
