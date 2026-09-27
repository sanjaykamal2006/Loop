import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const start = Date.now();

  try {
    // 1. Least-privilege check: public.health_check() RPC
    // Tests database connectivity without querying sensitive user/ride tables
    const { data: rpcData, error: rpcError } = await supabase.rpc('health_check');

    if (!rpcError && rpcData?.status === 'healthy') {
      const duration = Date.now() - start;
      return NextResponse.json({
        status: 'healthy',
        message: 'Database connection ping successful',
        durationMs: duration,
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Fallback: Server-side check if RPC is not yet registered
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceRoleKey) {
      const serverClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { error: pingError } = await serverClient
        .from('profiles')
        .select('id')
        .limit(1);

      if (!pingError) {
        const duration = Date.now() - start;
        return NextResponse.json({
          status: 'healthy',
          message: 'Server-side ping successful',
          durationMs: duration,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // If both failed, return safe failure without leaking internal details
    return NextResponse.json(
      {
        status: 'unhealthy',
        message: 'Database health check failed',
      },
      { status: 503 }
    );
  } catch (err: any) {
    if (process.env.NODE_ENV !== "production") {
      console.error('Keep-alive ping exception:', err?.message || 'Unknown error');
    }
    return NextResponse.json(
      {
        status: 'error',
        message: 'Keep-alive service error',
      },
      { status: 500 }
    );
  }
}
