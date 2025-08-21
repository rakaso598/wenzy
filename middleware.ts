import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Simple rate limiting middleware (in-memory, per instance) - MVP
 * For production distribute use Redis-based token bucket.
 * Limits: 60 requests / 1 minute per IP for API routes.
 */
const RATE_LIMIT = 60;
const WINDOW_MS = 60_000;
const buckets: Map<string, { count: number; windowStart: number }> = new Map();

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith('/api/')) return NextResponse.next();

  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  const key = `${ip}`;
  const now = Date.now();
  const entry = buckets.get(key) || { count: 0, windowStart: now };

  if (now - entry.windowStart > WINDOW_MS) {
    entry.count = 0;
    entry.windowStart = now;
  }
  entry.count += 1;
  buckets.set(key, entry);

  if (entry.count > RATE_LIMIT) {
    return new NextResponse(
      JSON.stringify({ success: false, error: 'Rate limit exceeded. Try later.' }),
      {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
      }
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
