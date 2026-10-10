import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Free tier optimization: Delete rides older than 7 days to reduce database storage
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CLEANUP_CRON_SECRET;

    if (!expectedToken) {
      return NextResponse.json({ error: 'Server misconfigured - CLEANUP_CRON_SECRET not set' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const [{ error: ridesError }, { error: unconfirmedError }] = await Promise.all([
      supabase.rpc('cleanup_old_rides'),
      supabase.rpc('cleanup_unconfirmed_users'),
    ]);

    if (ridesError || unconfirmedError) {
      const errMsg = (ridesError?.message || '') + (unconfirmedError ? ` ${unconfirmedError.message}` : '');
      logger.error('Cleanup error:', errMsg);
      return NextResponse.json({
        success: false,
        error: errMsg,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Old rides and unconfirmed users cleaned up successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Cleanup route error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Internal Server Error',
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
