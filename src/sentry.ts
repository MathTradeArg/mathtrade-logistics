// Error monitoring (Sentry), shared by client, server and edge. Off without
// NEXT_PUBLIC_SENTRY_DSN (local, tests). Errors only: no tracing or replay,
// and no IP or cookies (sendDefaultPii: false); the user is set in useAuth
// (id + username, never the email).
export const sentryOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "development",
  sendDefaultPii: false,
  tracesSampleRate: 0,
};
