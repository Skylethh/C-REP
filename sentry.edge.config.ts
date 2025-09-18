// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://c419864abdf60837694d4d2e8788946c@o4510023912783872.ingest.de.sentry.io/4510023940374608",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Note: enableLogs is not a valid option in current SDK

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
