import { InjectionToken } from '@angular/core';

/** Struktur der globalen Konfiguration */
export interface AppSettings {
  firestoreDbId : string;
  verifyRedirect: string;
  resetRedirect : string;
}

/** Injection-Token mit Default-Factory  */
export const APP_SETTINGS = new InjectionToken<AppSettings>(
  'APP_SETTINGS',
  {
    providedIn: 'root',
    factory: (): AppSettings => ({
      firestoreDbId : 'zso-base',
      verifyRedirect: `${location.origin}/auth/verify-email-success`,
      resetRedirect : `${location.origin}/auth/login?reset=1`
    })
  }
);
