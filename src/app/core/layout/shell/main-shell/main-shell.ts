import { Component } from "@angular/core";
import { Observable } from 'rxjs';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '@core/auth/services/auth.service';
import { AsyncPipe, NgIf, NgClass } from '@angular/common';
import { RouterOutlet } from "@angular/router";
import { CommonModule } from "@angular/common";

@Component({
    selector: 'app-main-shell',
    templateUrl: './main-shell.html',
    styleUrls: ['./main-shell.scss'],
    imports: [RouterOutlet, CommonModule, RouterLink, RouterLinkActive, AsyncPipe, NgIf, NgClass],
    standalone: true,
})
export class MainShell {
  
  appUser$!: Observable<any>;
  open = false;
  constructor(private auth: AuthService, private router: Router) {
    this.appUser$ = this.auth.appUser$;
  }

  logout() {
    this.auth.logout().subscribe(() => this.router.navigate(['/auth/login']));
  }

}
