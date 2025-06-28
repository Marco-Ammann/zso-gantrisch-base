// src/app/app.config.ts

import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';

// HttpClient + Interceptor
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

// Moderne Firebase API
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth, connectAuthEmulator } from '@angular/fire/auth';
import { provideFirestore, getFirestore, connectFirestoreEmulator } from '@angular/fire/firestore';
import { provideAnimations } from '@angular/platform-browser/animations';

// Environment
import { environment } from '../environments/environment';

// eigene Dateien
import { appRoutes } from './app.routes';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // Routing
    provideRouter(appRoutes),

    // HttpClient-Modul + Interceptor
    importProvidersFrom(HttpClientModule),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },

    // Firebase Setup - Fixed for v11+ compatibility
    provideFirebaseApp(() => {
      const app = initializeApp(environment.firebase);
      console.log('Firebase app initialized:', app.name);
      return app;
    }),
    provideAuth(() => {
      const auth = getAuth();
      console.log('Firebase Auth initialized');
      return auth;
    }),
    provideFirestore(() => {
      const firestore = getFirestore();
      console.log('Firestore initialized');
      return firestore;
    }),
    provideAnimations(),
  ],
};