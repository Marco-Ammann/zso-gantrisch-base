import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { ZsoInputField } from '@shared/ui/zso-input-field/zso-input-field';
import { ZsoButton     } from '@shared/ui/zso-button/zso-button';
import { ZsoCard       } from '@shared/ui/zso-card/zso-card';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'zso-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ZsoInputField,
    ZsoButton,
    ZsoCard
  ],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ForgotPassword implements OnInit {
  form!: FormGroup;
  isLoading = false;
  message: string | null = null;
  errorMsg: string | null = null;

  constructor(private fb: FormBuilder, private auth: AuthService) {}

  ngOnInit() {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    this.message = null;
    this.errorMsg = null;
    const email = this.form.value.email as string;

    this.auth.resetPassword(email).subscribe({
      next: () => {
        this.message = 'Link zum Zurücksetzen wurde versandt.';
        this.isLoading = false;
      },
      error: err => {
        this.errorMsg = err.message ?? 'Fehler beim Senden.';
        this.isLoading = false;
      }
    });
  }
}
