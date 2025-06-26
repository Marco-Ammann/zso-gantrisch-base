// src/app/app.config.ts

import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';

// HttpClient + Interceptor
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

// AngularFire Compat
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';

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

    // AngularFire (Compat) – stellt das InjectionToken angularfire2.app.options bereit
    importProvidersFrom(
      AngularFireModule.initializeApp(environment.firebase),
      AngularFireAuthModule
    ),
  ],
};
