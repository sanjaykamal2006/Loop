import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  isAllowedInstitutionalEmail,
  INSTITUTIONAL_ERROR_MESSAGE,
  PLUS_ADDRESSING_ERROR_MESSAGE,
  hasPlusAddressing,
} from '@/lib/authConfig';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = (body?.email || '').toLowerCase().trim();
    const isLogin = Boolean(body?.isLogin);

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { allowed: false, reason: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    // Plus-addressing check: Reject any email containing '+' in the local part
    if (hasPlusAddressing(email)) {
      return NextResponse.json(
        { allowed: false, reason: PLUS_ADDRESSING_ERROR_MESSAGE },
        { status: 400 }
      );
    }

    // 1. Existing users logging in: allow through to Supabase auth for credential verification.
    // This guarantees that any existing accounts created previously are unaffected.
    if (isLogin) {
      return NextResponse.json({ allowed: true });
    }

    // 2. Strict check for NEW signups:
    // A. Check static institutional domains & local whitelist (0ms)
    if (isAllowedInstitutionalEmail(email)) {
      return NextResponse.json({ allowed: true, type: 'authorized' });
    }

    // B. Check dynamic database table public.allowed_external_emails
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && serviceRoleKey) {
      try {
        const adminClient = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data: dbEntry } = await adminClient
          .from('allowed_external_emails')
          .select('email')
          .eq('email', email)
          .maybeSingle();

        if (dbEntry?.email) {
          return NextResponse.json({ allowed: true, type: 'whitelisted_db' });
        }
      } catch (dbErr) {
        console.error('Error querying allowed_external_emails table:', dbErr);
      }
    }

    // 3. Reject all other signups (gmail, yahoo, spoof domains, etc.)
    return NextResponse.json(
      {
        allowed: false,
        reason: INSTITUTIONAL_ERROR_MESSAGE,
      },
      { status: 403 }
    );
  } catch (err: any) {
    console.error('validate-email route exception:', err?.message || 'Unknown');
    return NextResponse.json(
      { allowed: false, error: 'Unable to validate email at this time. Please try again.' },
      { status: 500 }
    );
  }
}
