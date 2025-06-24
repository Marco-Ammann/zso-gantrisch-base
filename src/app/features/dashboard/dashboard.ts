import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { AuthService } from '@core/auth/services/auth.service';
import { Router } from '@angular/router';
import { CardShimmerDirective } from '@shared/directives/card-shimmer.directive';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [AsyncPipe, CardShimmerDirective],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard {
  appUser$!: Observable<any>;

  constructor(private auth: AuthService, private router: Router) {
    this.appUser$ = this.auth.appUser$;
  }

  logout() {
    this.auth.logout().subscribe(() => this.router.navigate(['/auth/login']));
  }
}
