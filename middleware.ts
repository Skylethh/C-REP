import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const RATE_LIMIT = 100; // requests
const WINDOW_MS = 60_000; // 1 minute
const ipHits = new Map<string, { count: number; ts: number }>();

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/', '/login', '/auth', '/api'];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  );
}

export async function middleware(req: NextRequest) {
  // --- Rate limiting (production only) ---
  if (process.env.NODE_ENV === 'production') {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      (req as any).ip ||
      'unknown';
    const now = Date.now();
    const bucket = ipHits.get(ip) ?? { count: 0, ts: now };
    if (now - bucket.ts > WINDOW_MS) {
      bucket.count = 0; bucket.ts = now;
    }
    bucket.count += 1;
    ipHits.set(ip, bucket);
    if (bucket.count > RATE_LIMIT) {
      return new NextResponse('Too Many Requests', { status: 429 });
    }
  }

  const { pathname } = req.nextUrl;

  // Skip auth check for public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // --- Auth guard for protected routes ---
  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          res.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Redirect unauthenticated users to landing page
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/';
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
