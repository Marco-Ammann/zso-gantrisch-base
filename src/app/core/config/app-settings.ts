// src/app/core/config/app-settings.ts
import { InjectionToken } from '@angular/core';

/** Struktur der globalen Konfiguration */
export interface AppSettings {
  appName: string;
  appVersion: string;
  firestoreDbId: string;
  verifyRedirect: string;
  resetRedirect: string;
}

/** Injection-Token mit Default-Factory  */
export const APP_SETTINGS = new InjectionToken<AppSettings>(
  'APP_SETTINGS',
  {
    providedIn: 'root',
    factory: (): AppSettings => ({
      appName: 'ZSO Gantrisch Base',
      appVersion: '0.6.0',
      firestoreDbId: 'zso-base',
      verifyRedirect: `${location.origin}/auth/verify-email-success`,
      resetRedirect: `${location.origin}/auth/login?reset=1`
    })
  }
);

