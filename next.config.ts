import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
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

export default nextConfig;


