// Lightweight Sentry wrapper. If SENTRY_DSN is unset (or empty) every export is a no-op,
// so the app runs identically without Sentry configured.
import * as Sentry from '@sentry/node';

let initialized = false;

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'production',
    release: process.env.SENTRY_RELEASE || undefined,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
    sendDefaultPii: false,
  });
  initialized = true;
}

export function isSentryEnabled(): boolean {
  return initialized;
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return;
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
      Sentry.captureException(err);
    });
    return;
  }
  Sentry.captureException(err);
}

export function setupExpressErrorHandler(app: import('express').Express): void {
  if (!initialized) return;
  Sentry.setupExpressErrorHandler(app);
}
