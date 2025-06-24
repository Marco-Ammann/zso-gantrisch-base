import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { AuthService } from '@core/auth/services/auth.service';
import { CardShimmerDirective } from '@shared/directives/card-shimmer.directive';

@Component({
  selector: 'zso-dashboard',
  standalone: true,
  imports: [CommonModule, AsyncPipe, CardShimmerDirective],
  templateUrl: './dashboard.html',
  styleUrls : ['./dashboard.scss']
})
export class DashboardPage {
  appUser$ = inject(AuthService).appUser$;
}
