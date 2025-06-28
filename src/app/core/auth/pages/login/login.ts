import { Component, OnInit, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute, RouterLink } from '@angular/router';

// UI Components
import { ZsoInputField } from '@shared/ui/zso-input-field/zso-input-field';
import { ZsoCheckbox } from '@shared/ui/zso-checkbox/zso-checkbox';
import { ZsoButton } from '@shared/ui/zso-button/zso-button';
import { SweepSeqDirective } from '@shared/directives/sweep-seq.directive';
import { GlowSeqDirective } from '@shared/directives/glow-seq.directive';

// Services
import { AuthService } from '../../services/auth.service';
import { LoggerService } from '@core/services/logger.service';

// RxJS
import { Observable, Subject, of, throwError } from 'rxjs';
import { finalize, take, takeUntil, filter, switchMap, tap, catchError } from 'rxjs/operators';

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
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="field-stack w-full" zsoGlowSeq zsoSweepSeq>
      <div class="flex flex-col items-center gap-6 animate-fadeUp">
        <div class="auth-icon-wrapper">
          <svg xmlns="http://www.w3.org/2000/svg"
              class="h-8 w-8 text-cp-orange"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M3 12h13m-4-4 4 4-4 4"/>
            <path d="M17 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-cp-orange">Willkommen zurück</h1>
      </div>

      <div class="field-stack--tight">
        <zso-input-field formControlName="email" label="E-Mail" type="email"/>
        <zso-input-field formControlName="password" label="Passwort" type="password" [toggleVisibility]="true"/>
      </div>

      <zso-checkbox formControlName="rememberMe" label="Angemeldet bleiben"/>

      <zso-button type="primary" [loading]="isLoading" [fullWidth]="true" htmlType="submit">
        Anmelden
      </zso-button>

      @if (errorMsg) {
        <p class="text-center text-sm text-rose-400">{{ errorMsg }}</p>
      }

      <p class="text-center text-xs">
        Passwort vergessen?
        <a routerLink="/auth/forgot-password" class="underline text-cp-orange">Link anfordern</a>
      </p>

      <div class="divider-labeled">oder</div>

      <p class="text-center text-sm">
        Neu hier?
        <a routerLink="/auth/register" class="font-medium hover:underline text-cp-orange">Konto erstellen</a>
      </p>
    </form>
  `,
  styles: [`
    .auth-icon-wrapper {
      @apply p-3 rounded-full bg-cp-orange/10;
    }
    
    .divider-labeled {
      @apply relative flex items-center my-4;
      
      &::before,
      &::after {
        @apply flex-1 h-px bg-gray-200 dark:bg-gray-700;
        content: '';
      }
      
      &::before { margin-right: 0.5rem; }
      &::after { margin-left: 0.5rem; }
    }
    
    .field-stack {
      @apply flex flex-col gap-4;
      
      &--tight {
        @apply -mt-2;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ZsoLogin implements OnInit, OnDestroy {
  // Form state
  form: FormGroup<{
    email: FormControl<string | null>;
    password: FormControl<string | null>;
    rememberMe: FormControl<boolean | null>;
  }>;
  
  // UI state
  isLoading = false;
  errorMsg: string | null = null;
  
  // Navigation
  private returnUrl: string;
  
  // Cleanup
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly logger: LoggerService
  ) {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    this.form = this.initForm();
  }

  private initForm(): FormGroup {
    return this.fb.group({
      email: ['', [
        Validators.required, 
        Validators.email
      ]],
      password: ['', [
        Validators.required, 
        Validators.minLength(6)
      ]],
      rememberMe: [false]
    });
  }

  ngOnInit(): void {
    // Check if user is already logged in
    this.auth.user$.pipe(
      take(1),
      filter(user => !!user && user.emailVerified),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.router.navigateByUrl(this.returnUrl);
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.handleFormErrors();
      return;
    }
    
    this.prepareLogin();
    const { email, password, rememberMe } = this.form.getRawValue();
    
    if (!email || !password) {
      this.handleLoginError({ code: 'auth/invalid-credentials' });
      return;
    }
    
    this.logger.log('ZsoLogin', 'Login attempt', { email, rememberMe });
    
    this.auth.login(email, password, !!rememberMe).pipe(
      switchMap(() => this.handleSuccessfulLogin()),
      catchError(error => this.handleLoginError(error)),
      finalize(() => this.resetFormState())
    ).subscribe();
  }
  
  private handleFormErrors(): void {
    this.form.markAllAsTouched();
    const { email, password } = this.form.controls;
    
    if (email.errors?.['required']) {
      this.errorMsg = 'E-Mail ist erforderlich.';
    } else if (email.errors?.['email']) {
      this.errorMsg = 'Ungültige E-Mail-Adresse.';
    } else if (password.errors?.['required']) {
      this.errorMsg = 'Passwort ist erforderlich.';
    } else if (password.errors?.['minlength']) {
      this.errorMsg = 'Passwort muss mindestens 6 Zeichen lang sein.';
    }
  }
  
  private prepareLogin(): void {
    this.errorMsg = null;
    this.isLoading = true;
    this.form.disable();
  }
  
  private handleSuccessfulLogin() {
    return this.auth.user$.pipe(
      filter((user): user is NonNullable<typeof user> => user !== null),
      take(1),
      tap(user => {
        this.logger.log('ZsoLogin', 'Login successful for user:', user.email);
      }),
      switchMap(user => {
        if (user.emailVerified) {
          this.logger.log('ZsoLogin', 'User email verified, navigating to', this.returnUrl);
          return this.router.navigateByUrl(this.returnUrl);
        } else {
          this.logger.log('ZsoLogin', 'User email not verified, navigating to verification page');
          return this.router.navigate(['/auth/verify-email']);
        }
      }),
      takeUntil(this.destroy$)
    );
  }
  
  private handleLoginError(error: any): Observable<never> {
    this.logger.error('ZsoLogin', 'Login error:', error);
    this.errorMsg = this.mapError(error?.code || error?.message || 'unknown-error');
    return throwError(() => error);
  }
  
  private resetFormState(): void {
    this.isLoading = false;
    this.form.enable();
  }

  private mapError(code: string): string {
    this.logger.log('ZsoLogin', 'Error code received:', code);
    
    const errorMessages: Record<string, string> = {
      'auth/user-not-found': 'E-Mail nicht gefunden.',
      'auth/wrong-password': 'Falsches Passwort.',
      'auth/invalid-email': 'Ungültige E-Mail-Adresse.',
      'auth/too-many-requests': 'Zu viele Loginversuche. Bitte warten Sie.',
      'auth/network-request-failed': 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.',
      'auth/user-disabled': 'Dieser Account wurde deaktiviert.',
      'auth/operation-not-allowed': 'Anmeldung mit E-Mail/Passwort ist nicht aktiviert.',
      'auth/invalid-credential': 'Ungültige Anmeldedaten.',
      'auth/invalid-verification-code': 'Ungültiger Bestätigungscode.',
      'auth/invalid-verification-id': 'Ungültige Bestätigungs-ID.'
    };
    
    return errorMessages[code] || `Fehler beim Anmelden: ${code || 'Unbekannter Fehler'}`;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
