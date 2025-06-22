import { Component, OnInit  } from '@angular/core';
import { AuthService } from '@core/auth/services/auth.service';
import { Router } from '@angular/router';
@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  constructor(private auth: AuthService, private router: Router) { }

  ngOnInit(): void {
    console.log('Dashboard initialized');
  }

  logout() {
    this.auth.logout().subscribe(() => this.router.navigate(['/auth/login']));
  }
}
