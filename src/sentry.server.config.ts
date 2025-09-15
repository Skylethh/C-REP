import * as Sentry from '@sentry/nextjs';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
  });
}

export function captureServerError(err: unknown, context?: Record<string, any>) {
  try {
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
    const e = err instanceof Error ? err : new Error(String(err));
    if (context) Sentry.withScope((scope) => { Object.entries(context).forEach(([k,v]) => scope.setExtra(k, v)); Sentry.captureException(e); });
    else Sentry.captureException(e);
  } catch {}
}


