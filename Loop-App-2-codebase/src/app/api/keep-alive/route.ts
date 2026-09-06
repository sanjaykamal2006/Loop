import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const start = Date.now();
    const { data, error } = await supabase.from('loops').select('id').limit(1);

    if (error) {
      return NextResponse.json(
        { status: 'error', message: error.message },
        { status: 500 }
      );
    }

    const duration = Date.now() - start;

    return NextResponse.json({
      status: 'healthy',
      message: 'Supabase keep-alive ping successful',
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', message: err?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
