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
  autologout = false;
  constructor(private auth: AuthService, private router: Router) { }

  ngOnInit(): void {
    console.log('Dashboard initialized');
    this.auth.user$.subscribe(user => {
      if (user) {
        console.log('User is logged in');
        console.log('User: ', user);
        console.log('Autologout: ', this.autologout);

        if (this.autologout) {
          this.auth.logout();
          console.log('User logged out'); 
          this.router.navigate(['auth/login']);
        }
      } else {
        console.log('User is not logged in');
      }
    });
  }

  logout() {
    this.auth.logout().subscribe(() => this.router.navigate(['/auth/login']));
  }
}
