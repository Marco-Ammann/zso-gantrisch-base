import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../services/auth.service';
import { ZsoButton   } from '@shared/ui/zso-button/zso-button';

@Component({
  standalone: true,
  selector: 'zso-pending-approval',
  imports: [CommonModule, ZsoButton],
  templateUrl: './pending-approval.html',
  styleUrls: ['./pending-approval.scss']
})
export class PendingApproval {
  constructor(private auth: AuthService, private router: Router) {}

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }
}
