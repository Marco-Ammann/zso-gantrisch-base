import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';
import { initTheme } from './theme-init';

// Initialize theme and get cleanup function
const cleanupTheme = initTheme();

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

// Cleanup theme listener when app is destroyed
window.addEventListener('beforeunload', cleanupTheme);