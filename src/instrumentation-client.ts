// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://c419864abdf60837694d4d2e8788946c@o4510023912783872.ingest.de.sentry.io/4510023940374608",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,
  // Note: enableLogs is not a valid option in current SDK; use debug for verbose logs if needed

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});

// captureRouterTransitionStart is not available in the current @sentry/nextjs version
// If needed in the future, re-enable when upgrading to a version that exports it.
export {};