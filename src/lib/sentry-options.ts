import { captureConsoleIntegration } from "@sentry/nextjs";

/**
 * DSN tanımlı değilse Sentry tamamen kapalıdır. `console.error` yakalandığı için
 * mevcut catch bloklarındaki kayıtlar da ayrıca kod yazmadan raporlanır.
 */
export const sentryOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  sendDefaultPii: false,
  tracesSampleRate: 0,
  integrations: [captureConsoleIntegration({ levels: ["error"] })],
};
