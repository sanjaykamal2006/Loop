import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import type { Database } from '@/lib/database.types';

export const dynamic = 'force-dynamic';

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/**
 * Free-tier monitoring endpoint
 * Shows current usage vs Supabase/Vercel free tier limits
 * Protected by admin secret token.
 *
 * Fails closed: when the admin secret is not configured the route reports
 * "unavailable" without disclosing configuration details, wrong tokens are
 * rejected before any data is read, and upstream query failures never leak
 * raw database error messages.
 */
export async function GET(request: NextRequest) {
  const expectedToken = process.env.ADMIN_STATS_SECRET || process.env.CLEANUP_CRON_SECRET;

  // Brute-force throttle ahead of the bearer check, keyed by caller IP.
  const limit = await checkRateLimit(`admin-stats:${getClientIp(request)}`, 10, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limit.resetInSeconds), ...NO_STORE } }
    );
  }

  if (!expectedToken) {
    logger.error('admin/stats: no admin secret configured (ADMIN_STATS_SECRET / CLEANUP_CRON_SECRET)');
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503, headers: NO_STORE });
  }

  const authHeader = request.headers.get('authorization') || '';
  if (!safeCompare(authHeader, `Bearer ${expectedToken}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    logger.error('admin/stats: Supabase service credentials are not configured');
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503, headers: NO_STORE });
  }

  try {
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // Fetch counts in parallel
    const [usersRes, loopsRes, activeLoopsRes, messagesRes, membersRes] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('loops').select('*', { count: 'exact', head: true }),
      supabase.from('loops').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('messages').select('*', { count: 'exact', head: true }),
      supabase.from('loop_members').select('*', { count: 'exact', head: true }),
    ]);

    const failed = [usersRes, loopsRes, activeLoopsRes, messagesRes, membersRes].find((r) => r.error);
    if (failed?.error) {
      logger.error('admin/stats: count query failed:', failed.error.message);
      return NextResponse.json({ error: 'Upstream query failed' }, { status: 502, headers: NO_STORE });
    }

    const totalUsers = usersRes.count || 0;
    const totalLoops = loopsRes.count || 0;
    const activeLoops = activeLoopsRes.count || 0;
    const totalMessages = messagesRes.count || 0;
    const totalMembers = membersRes.count || 0;

    // Estimate database size (rough: ~1KB per row average)
    const estimatedRows = totalUsers + totalLoops + totalMessages + totalMembers;
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
        total_users: totalUsers,
        total_loops: totalLoops,
        active_loops: activeLoops,
        total_messages: totalMessages,
        total_members: totalMembers,
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
    }, { headers: NO_STORE });
  } catch (error: unknown) {
    logger.error('admin/stats error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: NO_STORE });
  }
}
