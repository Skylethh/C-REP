import { NextResponse, type NextRequest } from 'next/server';

const RATE_LIMIT = 100; // requests
const WINDOW_MS = 60_000; // 1 minute
const ipHits = new Map<string, { count: number; ts: number }>();

export function middleware(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    const ip =
      // some platforms set IP on a custom header
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
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};


