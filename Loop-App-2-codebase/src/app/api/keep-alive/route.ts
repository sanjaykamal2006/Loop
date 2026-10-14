import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  const start = Date.now();

  try {
    // 1. Least-privilege check: public.health_check() RPC
    // Tests database connectivity without querying sensitive user/ride tables
    const { data: rpcData, error: rpcError } = await supabase.rpc('health_check');

    const isHealthy = Boolean(
      typeof rpcData === 'object' &&
      rpcData !== null &&
      !Array.isArray(rpcData) &&
      (rpcData as { status?: string }).status === 'healthy'
    );

    if (!rpcError && isHealthy) {
      const duration = Date.now() - start;
      return NextResponse.json({
        status: 'healthy',
        message: 'Database connection ping successful',
        durationMs: duration,
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Fallback: Ping public loops table using standard client (least privilege, no service role key)
    const { error: pingError } = await supabase
      .from('loops')
      .select('id')
      .limit(1);

    if (!pingError) {
      const duration = Date.now() - start;
      return NextResponse.json({
        status: 'healthy',
        message: 'Database ping successful',
        durationMs: duration,
        timestamp: new Date().toISOString(),
      });
    }

    // If both failed, return safe failure without leaking internal details
    return NextResponse.json(
      {
        status: 'unhealthy',
        message: 'Database health check failed',
      },
      { status: 503 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Keep-alive ping exception:', message);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Keep-alive service error',
      },
      { status: 500 }
    );
  }
}
