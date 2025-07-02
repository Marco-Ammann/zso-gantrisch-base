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
import { Observable, Subject, of, throwError, from } from 'rxjs';
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
  templateUrl: './login.html',
  styleUrl: './login.scss',
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
    const email = this.form.get('email')?.value;
    const password = this.form.get('password')?.value;
    
    if (!email || !password) {
      this.errorMsg = 'Bitte geben Sie E-Mail und Passwort ein.';
      this.isLoading = false;
      return;
    }

    // Use the Observable-based login method
    this.auth.login(email, password).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe({
      next: () => {
        this.logger.log('ZsoLogin', 'Login successful, navigating to:', this.returnUrl);
        this.router.navigateByUrl(this.returnUrl);
      },
      error: (error) => {
        this.logger.error('ZsoLogin', 'Login failed:', error);
        this.handleLoginError(error);
      }
    });
  }
  
  private handleFormErrors(): void {
    this.form.markAllAsTouched();
    
    const emailControl = this.form.get('email');
    const passwordControl = this.form.get('password');
    
    if (emailControl?.errors?.['required']) {
      this.errorMsg = 'Bitte geben Sie Ihre E-Mail-Adresse ein.';
    } else if (emailControl?.errors?.['email']) {
      this.errorMsg = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
    } else if (passwordControl?.errors?.['required']) {
      this.errorMsg = 'Bitte geben Sie Ihr Passwort ein.';
    } else if (passwordControl?.errors?.['minlength']) {
      this.errorMsg = 'Das Passwort muss mindestens 6 Zeichen lang sein.';
    } else {
      this.errorMsg = 'Bitte überprüfen Sie Ihre Eingaben.';
    }
  }
  
  private prepareLogin(): void {
    this.isLoading = true;
    this.errorMsg = null;
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
  
  private handleLoginError(error: any): void {
    let message = 'Ein unbekannter Fehler ist aufgetreten.';
    
    if (error?.code) {
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          message = 'E-Mail-Adresse oder Passwort ist falsch.';
          break;
        case 'auth/user-disabled':
          message = 'Ihr Konto wurde deaktiviert. Kontaktieren Sie den Administrator.';
          break;
        case 'auth/too-many-requests':
          message = 'Zu viele fehlgeschlagene Anmeldeversuche. Versuchen Sie es später erneut.';
          break;
        case 'auth/network-request-failed':
          message = 'Netzwerkfehler. Überprüfen Sie Ihre Internetverbindung.';
          break;
        case 'auth/invalid-email':
          message = 'Die E-Mail-Adresse ist ungültig.';
          break;
        default:
          message = error.message || message;
      }
    }
    
    this.errorMsg = message;
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
