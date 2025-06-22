// src/app/core/auth/pages/register/register.ts
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ZsoInputField } from '@shared/ui/input-field/input-field';
import { AuthService, RegisterData } from '../../services/auth.service';

@Component({
  selector: 'zso-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ZsoInputField
  ],
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ZsoRegister implements OnInit {
  form!: FormGroup;
  isLoading = false;
  errorMsg: string | null = null;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.form = this.fb.group(
      {
        firstName: [{ value: '', disabled: false }, Validators.required],
        lastName: [{ value: '', disabled: false }, Validators.required],
        email: [{ value: '', disabled: false }, [Validators.required, Validators.email]],
        password: [{ value: '', disabled: false }, [Validators.required, Validators.minLength(6)]],
        confirmPassword: [{ value: '', disabled: false }, Validators.required],
        acceptTos: [{ value: false, disabled: false }, Validators.requiredTrue]
      },
      { validators: this.passwordsMatch }
    );
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.errorMsg = null;
    this.isLoading = true;
    this.form.disable();

    const { firstName, lastName, email, password } = this.form.getRawValue();
    const data: RegisterData = { firstName, lastName, email, password };

    this.auth.register(data).subscribe({
      next: () => this.router.navigate(['/auth/verify-email']),
      error: err => {
        this.errorMsg = err.message || 'Registrierung fehlgeschlagen.';
        this.isLoading = false;
        this.form.enable();
      }
    });
  }

  private passwordsMatch(group: FormGroup) {
    return group.get('password')!.value === group.get('confirmPassword')!.value
      ? null
      : { mismatch: true };
  }

  get passwordMismatch() {
    return this.form.touched && this.form.hasError('mismatch');
  }
}
