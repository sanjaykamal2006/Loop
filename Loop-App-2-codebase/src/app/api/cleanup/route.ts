import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import crypto from 'crypto';
import type { Database } from '@/lib/database.types';

export const dynamic = 'force-dynamic';

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Free tier optimization: Delete rides older than 7 days to reduce database storage.
//
// NOTE: production maintenance already runs through pg_cron
// (expire_old_loops / cleanup_unconfirmed_users / purge_old_data). This
// endpoint is the manual trigger and fails closed when its secret is missing;
// internal errors are logged, never returned.
export async function POST(request: NextRequest) {
  try {
    // Brute-force throttle ahead of the bearer check, keyed by caller IP
    // (scheduled GitHub Action calls arrive daily — a 10/10min IP budget is ample).
    const limit = await checkRateLimit(`cleanup:${getClientIp(request)}`, 10, 10 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(limit.resetInSeconds) } }
      );
    }

    const authHeader = request.headers.get('authorization') || '';
    const expectedToken = process.env.CLEANUP_CRON_SECRET;

    if (!expectedToken) {
      logger.error('cleanup: CLEANUP_CRON_SECRET is not configured');
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    if (!safeCompare(authHeader, `Bearer ${expectedToken}`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      logger.error('cleanup: Supabase service credentials are not configured');
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    const [{ error: ridesError }, { error: unconfirmedError }] = await Promise.all([
      supabase.rpc('cleanup_old_rides'),
      supabase.rpc('cleanup_unconfirmed_users'),
    ]);

    if (ridesError || unconfirmedError) {
      const errMsg = (ridesError?.message || '') + (unconfirmedError ? ` ${unconfirmedError.message}` : '');
      logger.error('Cleanup error:', errMsg);
      return NextResponse.json({
        success: false,
        error: 'Cleanup failed',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Old rides and unconfirmed users cleaned up successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    logger.error('Cleanup route error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal Server Error',
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
