import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Free-tier monitoring endpoint
 * Shows current usage vs Supabase/Vercel free tier limits
 * Protected by admin secret token
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.ADMIN_STATS_SECRET || process.env.CLEANUP_CRON_SECRET;

    if (!expectedToken) {
      return NextResponse.json({ error: 'Server misconfigured - no admin secret set' }, { status: 500 });
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

    // Fetch counts in parallel
    const [
      { count: totalUsers },
      { count: totalLoops },
      { count: activeLoops },
      { count: totalMessages },
      { count: totalMembers },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('loops').select('*', { count: 'exact', head: true }),
      supabase.from('loops').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('messages').select('*', { count: 'exact', head: true }),
      supabase.from('loop_members').select('*', { count: 'exact', head: true }),
    ]);

    // Estimate database size (rough: ~1KB per row average)
    const estimatedRows = (totalUsers || 0) + (totalLoops || 0) + (totalMessages || 0) + (totalMembers || 0);
    const estimatedSizeMB = Math.round((estimatedRows * 1024) / (1024 * 1024) * 100) / 100;

    // Free tier limits
    const FREE_TIER = {
      database_mb: 500,
      storage_gb: 1,
      bandwidth_gb: 2,
      realtime_connections: 0, // We use polling now
      daily_edge_invocations: 500000,
      monthly_auth_users: 50000,
    };

    const dbUsagePercent = Math.round((estimatedSizeMB / FREE_TIER.database_mb) * 100 * 100) / 100;

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      counts: {
        total_users: totalUsers || 0,
        total_loops: totalLoops || 0,
        active_loops: activeLoops || 0,
        total_messages: totalMessages || 0,
        total_members: totalMembers || 0,
      },
      database: {
        estimated_rows: estimatedRows,
        estimated_size_mb: estimatedSizeMB,
        free_tier_limit_mb: FREE_TIER.database_mb,
        usage_percent: dbUsagePercent,
      },
      free_tier_status: {
        database: dbUsagePercent < 80 ? 'healthy' : dbUsagePercent < 95 ? 'warning' : 'critical',
        realtime: 'healthy (polling mode - 0 connections used)',
        cleanup: 'auto-delete after 7 days',
        image_compression: '256px max, 0.70 quality (10-15KB per avatar)',
      },
      thresholds: {
        warning_at_users: Math.floor(FREE_TIER.database_mb * 1024 * 0.8 / 5), // ~80KB per user with messages
        critical_at_users: Math.floor(FREE_TIER.database_mb * 1024 * 0.95 / 5),
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error?.message || 'Internal Server Error',
    }, { status: 500 });
  }
}
