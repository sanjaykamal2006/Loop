import { NextRequest, NextResponse } from 'next/server';
import {
  isAllowedInstitutionalEmail,
  INSTITUTIONAL_ERROR_MESSAGE,
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

    // 1. Existing users logging in: allow through to Supabase auth for credential verification.
    // This guarantees that any existing accounts created previously are unaffected.
    if (isLogin) {
      return NextResponse.json({ allowed: true });
    }

    // 2. Strict check for NEW signups:
    // Requires exact match with @vitapstudent.ac.in, @vitap.ac.in, or EXTERNAL_EMAIL_WHITELIST.
    if (isAllowedInstitutionalEmail(email)) {
      return NextResponse.json({ allowed: true, type: 'authorized' });
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
