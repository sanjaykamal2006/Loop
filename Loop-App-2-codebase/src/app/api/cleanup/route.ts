import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Free tier optimization: Delete rides older than 7 days to reduce database storage
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CLEANUP_CRON_SECRET || 'your-secret-token-here';

    if (expectedToken !== 'your-secret-token-here' && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase.rpc('cleanup_old_rides');

    if (error) {
      console.error('Cleanup error:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Old rides cleaned up successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Cleanup route error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Internal Server Error',
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST with Authorization header to trigger cleanup',
    endpoint: '/api/cleanup',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_CLEANUP_CRON_SECRET',
    },
  });
}
