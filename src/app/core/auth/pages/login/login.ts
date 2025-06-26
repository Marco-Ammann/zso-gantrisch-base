import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';

import { ZsoInputField } from '@shared/ui/zso-input-field/zso-input-field';
import { ZsoCheckbox   } from '@shared/ui/zso-checkbox/zso-checkbox';
import { ZsoButton     } from '@shared/ui/zso-button/zso-button';
import { SweepSeqDirective } from '@shared/directives/sweep-seq.directive';

import { AuthService } from '../../services/auth.service';
import { finalize, take } from 'rxjs/operators';
import { GlowSeqDirective } from '@shared/directives/glow-seq.directive';
import { LoggerService } from '@core/services/logger.service';

@Component({
  selector: 'zso-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ZsoInputField,
    ZsoCheckbox,
    ZsoButton,
    GlowSeqDirective,
    SweepSeqDirective
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ZsoLogin implements OnInit {
  form!: FormGroup;
  isLoading = false;
  errorMsg: string | null = null;
  private returnUrl: string;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private logger: LoggerService
  ) {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
  }

  ngOnInit() {
    this.form = this.fb.group({
      email:      ['', [Validators.required, Validators.email]],
      password:   ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const emailErrors = this.form.get('email')?.errors;
      const passwordErrors = this.form.get('password')?.errors;
      
      if (emailErrors?.['required']) {
        this.errorMsg = 'E-Mail ist erforderlich.';
        return;
      }
      if (emailErrors?.['email']) {
        this.errorMsg = 'Ungültige E-Mail-Adresse.';
        return;
      }
      if (passwordErrors?.['required']) {
        this.errorMsg = 'Passwort ist erforderlich.';
        return;
      }
      if (passwordErrors?.['minlength']) {
        this.errorMsg = 'Passwort muss mindestens 6 Zeichen lang sein.';
        return;
      }
      return;
    }
    this.errorMsg = null;
    this.isLoading = true;
    this.form.disable();

    const { email, password, rememberMe } = this.form.getRawValue();
    
    this.logger.log('ZsoLogin', 'Login attempt', { email, rememberMe });
    
    this.auth
      .login(email, password, rememberMe)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.form.enable();
      }))
      .subscribe({
        next: () => {
          this.logger.log('ZsoLogin', 'Login successful');
          this.auth.user$.pipe(take(1)).subscribe(user => {
            if (user?.emailVerified) {
              this.logger.log('ZsoLogin', 'User email verified, navigating to', this.returnUrl);
              this.router.navigateByUrl(this.returnUrl);
            } else {
              this.logger.log('ZsoLogin', 'User email not verified, navigating to verification page');
              this.router.navigate(['/auth/verify-email']);
            }
          });
        },
        error: err => {
          this.logger.error('ZsoLogin', 'Login error:', err);
          this.errorMsg = this.mapError(err.code);
        }
      });
  }

  private mapError(code: string) {
    this.logger.log('ZsoLogin', 'Error code received:', code);
    switch (code) {
      case 'auth/user-not-found': return 'E-Mail nicht gefunden.';
      case 'auth/wrong-password': return 'Falsches Passwort.';
      case 'auth/invalid-email': return 'Ungültige E-Mail-Adresse.';
      case 'auth/too-many-requests': return 'Zu viele Loginversuche. Bitte warten Sie.';
      case 'auth/network-request-failed': return 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.';
      default: return `Fehler beim Anmelden: ${code || 'Unbekannter Fehler'}`;
    }
  }
}
