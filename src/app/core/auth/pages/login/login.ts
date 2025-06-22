// src/app/core/auth/pages/login/login.ts
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ZsoInputField } from '@shared/ui/input-field/input-field';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'zso-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ZsoInputField
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
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  ngOnInit() {
    this.form = this.fb.group({
      email: [{ value: '', disabled: false }, [Validators.required, Validators.email]],
      password: [{ value: '', disabled: false }, [Validators.required, Validators.minLength(6)]],
      rememberMe: [{ value: false, disabled: false }]
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
    this.auth.login(email, password, rememberMe).subscribe({
      next: () => this.router.navigateByUrl(this.returnUrl),
      error: err => {
        this.errorMsg = this.mapError(err.code);
        this.isLoading = false;
        this.form.enable();
      }
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
