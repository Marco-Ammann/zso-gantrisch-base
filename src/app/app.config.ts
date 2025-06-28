// src/app/app.config.ts

import { ApplicationConfig, importProvidersFrom, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';

// HttpClient + Interceptor
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

// Moderne Firebase API
import { provideFirebaseApp, initializeApp, deleteApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideAnimations } from '@angular/platform-browser/animations';

// Environment
import { environment } from '../environments/environment';

declare module '../environments/environment' {
  interface Environment {
    useEmulators?: boolean;
  }
}

// eigene Dateien
import { appRoutes } from './app.routes';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';

// Initialize Firebase services
export function provideFirebase() {
  return [
    // Provide the default Firebase App
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    
    // Provide Auth service
    provideAuth(() => getAuth()),
    
    // Provide Firestore service
    provideFirestore(() => getFirestore()),
    
    // Cleanup on app destroy
    {
      provide: APP_INITIALIZER,
      useFactory: () => {
        const app = initializeApp(environment.firebase);
        return () => {
          console.log('Cleaning up Firebase app');
          deleteApp(app).catch(err => 
            console.error('Error cleaning up Firebase app:', err)
          );
        };
      },
      multi: true
    }
  ];
}

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

    // Firebase Setup with cleanup
    ...provideFirebase(),
    provideAnimations(),
  ],
};