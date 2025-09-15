import {withSentryConfig} from '@sentry/nextjs';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  outputFileTracingRoot: __dirname,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          {
            key: 'Content-Security-Policy',
            value: (() => {
              const isDev = process.env.NODE_ENV !== 'production';
              const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
              const supabaseOrigin = (() => {
                try { return new URL(supabase).origin; } catch { return ''; }
              })();
              // In dev, Next injects some inline scripts; allow 'unsafe-inline' to avoid CSP blocks
              const scriptSrc = isDev ? "'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'" : "'self'";
              const connectSrc = ["'self'", 'https:', 'ws:', 'wss:', supabaseOrigin].filter(Boolean).join(' ');
              return [
                "default-src 'self'",
                "img-src 'self' data: blob: https:",
                `script-src ${scriptSrc}`,
                "style-src 'self' 'unsafe-inline'",
                `connect-src ${connectSrc}`
              ].join('; ');
            })()
          }
        ]
      }
    ];
  }
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "emir-ow",

  project: "c-rep",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true
});