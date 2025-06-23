import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-pending-approval',
  imports: [CommonModule],
  templateUrl: './pending-approval.html',
  styleUrls: ['./pending-approval.scss']
})
export class PendingApproval {
  constructor(public auth: AuthService, private router: Router) {}

  logout() {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }
}
