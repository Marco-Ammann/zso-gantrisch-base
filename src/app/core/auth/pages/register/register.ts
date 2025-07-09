import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

import { ZsoInputField } from '@shared/ui/zso-input-field/zso-input-field';
import { ZsoCheckbox   } from '@shared/ui/zso-checkbox/zso-checkbox';
import { ZsoButton     } from '@shared/ui/zso-button/zso-button';
import { ZsoCard } from '@shared/ui/zso-card/zso-card';
import { SweepSeqDirective } from '@shared/directives/sweep-seq.directive';

import { AuthService, RegisterData } from '../../services/auth.service';
import { GlowSeqDirective } from '@shared/directives/glow-seq.directive';

@Component({
  selector: 'zso-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ZsoInputField,
    ZsoCheckbox,
    ZsoButton,
    ZsoCard,
    GlowSeqDirective,
    SweepSeqDirective
  ],
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ZsoRegister {
  readonly form: FormGroup;
  isLoading    = false;
  errorMsg: string | null = null;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      firstName:       ['', Validators.required],
      lastName:        ['', Validators.required],
      email:           ['', [Validators.required, Validators.email]],
      password:        ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      acceptTos:       [false, Validators.requiredTrue]
    }, { validators: ZsoRegister.passwordsMatch });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.errorMsg = null;
    this.isLoading = true;
    this.form.disable();

    const { firstName, lastName, email, password } =
      this.form.getRawValue() as RegisterData;

    this.auth.register({ firstName, lastName, email, password }).subscribe({
      next: () => this.router.navigate(['/auth/verify-email']),
      error: err => {
        this.errorMsg = err.message ?? 'Registrierung fehlgeschlagen.';
        this.isLoading = false;
        this.form.enable();
      }
    });
  }

  private static passwordsMatch(group: FormGroup) {
    return group.get('password')!.value === group.get('confirmPassword')!.value
      ? null : { mismatch: true };
  }

  get passwordMismatch(): boolean {
    return this.form.touched && this.form.hasError('mismatch');
  }
}
