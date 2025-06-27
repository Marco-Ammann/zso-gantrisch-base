import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { map } from 'rxjs';
import { UserDoc } from '@core/models/user-doc';
import { AuthService } from '@core/auth/services/auth.service';
import { RouterModule } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroUserGroup, heroClock, heroCog6Tooth, heroCalendarDays } from '@ng-icons/heroicons/outline';
import { UserService } from '@core/services/user.service';
import { CardShimmerDirective } from '@shared/directives/card-shimmer.directive';

@Component({
  selector: 'zso-dashboard',
  standalone: true,
  imports: [CommonModule, AsyncPipe, CardShimmerDirective, RouterModule, NgIcon],
  templateUrl: './dashboard.html',
  styleUrls : ['./dashboard.scss'],
  providers: [provideIcons({ heroUserGroup, heroClock, heroCog6Tooth, heroCalendarDays })]
})
export class DashboardPage {
  private readonly userService = inject(UserService);

  appUser$ = inject(AuthService).appUser$;

  users$ = this.userService.getAll();

  stats$ = this.users$.pipe(
    map(users => ({
      total: users.length,
      active: users.filter(u => u.approved && !u.blocked).length,
      pending: users.filter(u => !u.approved).length,
      blocked: users.filter(u => u.blocked).length,
    }))
  );

  latestUsers$ = this.users$.pipe(
    map(users => [...users]
      .sort((a: UserDoc, b: UserDoc) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt))
      .slice(0, 5))
  );
}
