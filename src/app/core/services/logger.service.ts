// src/app/core/services/logger.service.ts
import { Injectable, isDevMode } from '@angular/core';

/**
 * Simple wrapper around console.* that prefixes every log with a tag and only
 * logs in dev mode. Extend as needed (e.g. send logs to backend).
 */
@Injectable({ providedIn: 'root' })
export class LoggerService {
  private shouldLog = isDevMode();

  /** Generic log */
  log(tag: string, message?: unknown, ...optionalParams: unknown[]): void {
    if (this.shouldLog) {
      console.log(`[${tag}]`, message ?? '', ...optionalParams);
    }
  }

  info(tag: string, message?: unknown, ...optionalParams: unknown[]): void {
    if (this.shouldLog) {
      console.info(`[${tag}]`, message ?? '', ...optionalParams);
    }
  }

  warn(tag: string, message?: unknown, ...optionalParams: unknown[]): void {
    if (this.shouldLog) {
      console.warn(`[${tag}]`, message ?? '', ...optionalParams);
    }
  }

  error(tag: string, message?: unknown, ...optionalParams: unknown[]): void {
    if (this.shouldLog) {
      console.error(`[${tag}]`, message ?? '', ...optionalParams);
    }
  }
}
