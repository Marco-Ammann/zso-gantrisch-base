import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UserService } from '@core/services/user.service';
import { UserDoc } from '@core/models/user-doc';
import { Observable, map } from 'rxjs';
import { Stats } from './dashboard.model';
import { AppUserCombined } from '@core/auth/services/auth.service';
import { AuthService } from '@core/auth/services/auth.service';

@Component({
  selector: 'zso-dashboard',
  standalone: true,
  imports: [CommonModule, AsyncPipe, RouterModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardPage {
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);

  appUser$ = this.authService.appUser$;
  stats$: Observable<Stats> = this.userService.getStats();
  latestUsers$: Observable<UserDoc[]> = this.userService.getAllUsers().pipe(
    map(users => 
      users
        .sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt))
        .slice(0, 5)
    )
  );

  currentDate = new Date();
}
