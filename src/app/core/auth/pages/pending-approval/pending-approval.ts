import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ZsoButton } from '@shared/ui/zso-button/zso-button';
import { AuthService } from '../../services/auth.service';
import { RouterModule, Router } from '@angular/router';
import { ZsoCard } from "@shared/ui/zso-card/zso-card";

@Component({
  selector: 'app-pending-approval',
  standalone: true,
  imports: [CommonModule, RouterModule, ZsoButton, ZsoCard],
  templateUrl: './pending-approval.html',
  styleUrls: ['./pending-approval.scss']
})
export class PendingApproval {
  constructor(public auth: AuthService, private router: Router) {}

  logout() {
    this.auth.logout().subscribe(() => {
      this.router.navigate(['/auth/login']);
    });
  }
}
