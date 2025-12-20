// src/app/app.config.ts - Updated mit Locale Support

import {
  ApplicationConfig,
  importProvidersFrom,
  APP_INITIALIZER,
  LOCALE_ID,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { registerLocaleData } from '@angular/common';
import localeDE from '@angular/common/locales/de';
import localeDeExtra from '@angular/common/locales/extra/de';

// HttpClient + Interceptor
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

// Moderne Firebase API
import {
  provideFirebaseApp,
  initializeApp,
  deleteApp,
} from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideFunctions, getFunctions } from '@angular/fire/functions';
import { provideAnimations } from '@angular/platform-browser/animations';

// Environment
import { environment } from '../environments/environment';

// eigene Dateien
import { appRoutes } from './app.routes';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { ADZS_DASHBOARD_WIDGET_PROVIDER } from './features/adsz/adsz.dashboard-widgets';
import { PLACES_DASHBOARD_WIDGET_PROVIDER } from './features/places/places.dashboard-widgets';
import { ADMIN_USERS_DASHBOARD_WIDGET_PROVIDER } from './features/admin/admin.dashboard-widgets';

// Register German locale
registerLocaleData(localeDE, 'de', localeDeExtra);

// Initialize Firebase services
export function provideFirebase() {
  return [
    // Provide the default Firebase App
    provideFirebaseApp(() => initializeApp(environment.firebase)),

    // Provide Auth service
    provideAuth(() => getAuth()),

    // Provide Firestore service
    provideFirestore(() => getFirestore()),

    // Provide Cloud Functions service
    provideFunctions(() => getFunctions()),

    // Cleanup on app destroy
    {
      provide: APP_INITIALIZER,
      useFactory: () => {
        const app = initializeApp(environment.firebase);
        return () => {
          console.log('Cleaning up Firebase app');
          deleteApp(app).catch((err) =>
            console.error('Error cleaning up Firebase app:', err)
          );
        };
      },
      multi: true,
    },
  ];
}

export const appConfig: ApplicationConfig = {
  providers: [
    // Routing
    provideRouter(appRoutes),

    // Locale Support
    { provide: LOCALE_ID, useValue: 'de' },

    // HttpClient-Modul + Interceptor
    importProvidersFrom(HttpClientModule),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },

    // Firebase Setup with cleanup
    ...provideFirebase(),
    provideAnimations(),

    ADZS_DASHBOARD_WIDGET_PROVIDER,
    PLACES_DASHBOARD_WIDGET_PROVIDER,
    ADMIN_USERS_DASHBOARD_WIDGET_PROVIDER,
  ],
};
