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
    <zso-activity-widget
      icon="person_add"
      [value]="(pending$ | async) ?? 0"
      label="Neue Anmeldungen"
      (select)="navigate()"
      color="text-amber-400"
    ></zso-activity-widget>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsersDashboardWidget {
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

  readonly pending$ = this.userService.getStats().pipe(
    map((s) => s.pending ?? 0),
    catchError(() => of(0))
  );

  navigate(): void {
    this.router.navigate(['/admin/users']);
  }
}
