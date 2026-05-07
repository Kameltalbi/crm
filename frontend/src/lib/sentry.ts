// Lightweight Sentry wrapper. If VITE_SENTRY_DSN is unset (or empty) every export is a no-op.
import * as Sentry from '@sentry/react';

let initialized = false;

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: (import.meta.env.VITE_SENTRY_ENVIRONMENT as string) || import.meta.env.MODE,
    release: (import.meta.env.VITE_SENTRY_RELEASE as string) || undefined,
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0.1),
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

export const SentryErrorBoundary = Sentry.ErrorBoundary;
