import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { take } from 'rxjs/operators';
import { ZsoButton } from '@shared/ui/zso-button/zso-button';

@Component({
  selector: 'zso-verify-email',
  standalone: true,
  imports: [CommonModule, RouterModule, ZsoButton],
  templateUrl: './verify-email.html',
  styleUrls: ['./verify-email.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VerifyEmail {
  sent = false;
  info: string | null = null;
  private returnUrl = '/';

  constructor(private auth: AuthService, private router: Router, private route: ActivatedRoute) {
    const url = this.route.snapshot.queryParamMap.get('returnUrl');
    if (url) this.returnUrl = url;
  }

  resend() {
    this.auth.resendVerificationEmail().subscribe({
      next: () => {
        this.sent = true;
        this.info = 'Bestätigungs-E-Mail erneut gesendet.';
      },
      error: err => (this.info = err?.message ?? 'Fehler beim Senden der E-Mail')
    });
  }

  check() {
    this.auth.refreshAndCheckEmail().pipe(take(1)).subscribe(verified => {
      if (verified) {
        this.router.navigateByUrl(this.returnUrl);
      } else {
        this.info = 'E-Mail noch nicht verifiziert. Bitte prüfe dein Postfach.';
      }
    });
  }
}

