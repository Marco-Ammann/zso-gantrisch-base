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
    private route: ActivatedRoute
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
      return;
    }
    this.errorMsg = null;
    this.isLoading = true;
    this.form.disable();

    const { email, password, rememberMe } = this.form.getRawValue();
    this.auth
      .login(email, password, rememberMe)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.form.enable();
      }))
      .subscribe({
        next: () => {
          this.auth.user$.pipe(take(1)).subscribe(user => {
            if (user?.emailVerified) {
              this.router.navigateByUrl(this.returnUrl);
            } else {
              this.router.navigate(['/auth/verify-email']);
            }
          });
        },
        error: err => (this.errorMsg = this.mapError(err.code))
      });
  }

  private mapError(code: string) {
    switch (code) {
      case 'auth/user-not-found': return 'E-Mail nicht gefunden.';
      case 'auth/wrong-password': return 'Falsches Passwort.';
      default: return 'Fehler beim Anmelden.';
    }
  }
}
